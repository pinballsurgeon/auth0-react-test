// /src/components/dashboard/DevPanel.js
import React, { useState, useRef, useEffect } from 'react';
import { PCA } from 'ml-pca';
import { generateDomainItemsStream, MODELS } from '../../services/llmProvider';
import { BatchProcessor } from '../../services/batchProcessor';
import { fetchGlobalAttributes, fetchRatedAttributesForItem } from '../../services/attributeService';
import { LogService } from '../../services/logService';
import DevPanelViz from './DevPanelViz';

const DevPanel = ({ isVisible }) => {
  // State variables for domain test streaming and attribute processing.
  const [selectedModel, setSelectedModel] = useState(MODELS.GPT35);
  const [domain, setDomain] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState(null);
  const [streamText, setStreamText] = useState('');
  const [domainMembers, setDomainMembers] = useState([]);         // All domain members streamed.
  const [globalAttributes, setGlobalAttributes] = useState(null); // Global attribute set (fetched once).
  const [ratedAttributes, setRatedAttributes] = useState([]);     // Per‑member rated attributes.
  // New state for iterative PCA
  const [pcaIterationCount, setPcaIterationCount] = useState(0);
  const [nextPcaThreshold, setNextPcaThreshold] = useState(5);

  const logEndRef = useRef(null);

  const clearAllState = () => {
    setLogs([]);
    setStreamText('');
    setBatches([]);
    setError(null);
    setDomainMembers([]);
    setGlobalAttributes(null);
    setRatedAttributes([]);
    setPcaIterationCount(0);
    setNextPcaThreshold(5);
  };

  // Utility: Append a timestamped log entry.
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    setLogs(prev => [...prev, { message: `[${timestamp}] ${message}`, type }]);
  };

  useEffect(() => {
    // Register the setLogs method as a listener.
    const logListener = (logEntry) => {
      setLogs(prev => [...prev, logEntry]);
    };
    LogService.addListener(logListener);
    return () => {
      LogService.removeListener(logListener);
    };
  }, []);

  // Batch processing callback.
  const handleBatchProcessed = (batchResult) => {
    setBatches(prev => [...prev, batchResult]);
  };

  // Reference for processed members and pending members.
  const processedMembers = new Set();
  const pendingRatingMembers = [];

  // Helper: Process an individual member (if not already processed) using global attributes.
  const processMemberRating = async (member, globalAttr) => {
    if (processedMembers.has(member)) return;
    processedMembers.add(member);

    fetchRatedAttributesForItem(member, globalAttr)
      .then(result => {
        // Simulate retrieving an image URL.
        const imageUrl = `https://example.com/images/${member.replace(/\s/g, '_')}.jpg`;
        setRatedAttributes(prev => [
          ...prev,
          { member, attributes: { ...result, imageUrl }, success: true },
        ]);
      })
      .catch(err => {
        setRatedAttributes(prev => [
          ...prev,
          { member, error: err.message, success: false },
        ]);
      });
  };

  // Helper: Process an array of new members.
  const processNewMembers = (members, globalAttr) => {
    members.forEach(member => processMemberRating(member, globalAttr));
  };

  const batchProcessor = new BatchProcessor(handleBatchProcessed, addLog);

  // Function to dynamically perform PCA on the valid rated attributes.
  const updatePCA = () => {
    // Get only successful rated entries.
    const validRatings = ratedAttributes.filter(item => item.success && item.attributes);
    if (validRatings.length === 0) return;
  
    // Extract the first valid rating object's nested rating values.
    const firstAttributes = validRatings[0].attributes;
    let firstRatingObj = null;
    for (const key in firstAttributes) {
      if (key !== "imageUrl") {
        firstRatingObj = firstAttributes[key];
        break;
      }
    }
    if (!firstRatingObj) {
      addLog('No valid numerical rating object found for PCA', 'error');
      return;
    }
    
    // Determine the rating keys from the nested object.
    const ratingKeys = Object.keys(firstRatingObj).filter(key => {
      const value = firstRatingObj[key];
      return typeof value === 'number' && value >= 0 && value <= 10;
    });
    if (ratingKeys.length === 0) {
      addLog('No valid numerical attributes found for PCA', 'error');
      return;
    }
  
    // Build the data matrix: For each valid entry, extract the nested rating object and then the values.
    const dataMatrix = validRatings.map(item => {
      let ratingObj = null;
      for (const key in item.attributes) {
        if (key !== "imageUrl") {
          ratingObj = item.attributes[key];
          break;
        }
      }
      return ratingKeys.map(key => Number(ratingObj[key]));
    });
  
    // Perform PCA to reduce to 3 components.
    const pca = new PCA(dataMatrix);
    const projected = pca.predict(dataMatrix, { nComponents: 3 }).to2DArray();
  
    // Construct a dynamic field key, e.g., "batch0_pca", "batch1_pca", etc.
    const fieldKey = `batch${pcaIterationCount}_pca`;
  
    // Update each valid rated attribute object with the new PCA result.
    const updatedRatedAttributes = ratedAttributes.map((item, index) => {
      if (item.success && item.attributes) {
        return { ...item, [fieldKey]: projected[index] };
      }
      return item;
    });
    setRatedAttributes(updatedRatedAttributes);
    addLog(`Performed PCA iteration ${pcaIterationCount} on ${validRatings.length} members`);
  
    // Increment PCA iteration count and update the next threshold.
    setPcaIterationCount(prev => prev + 1);
    setNextPcaThreshold(prev => prev + 5);
  };
  

  // Trigger PCA update when ratedAttributes changes and valid count reaches the threshold.
  useEffect(() => {
    const validCount = ratedAttributes.filter(item => item.success && item.attributes).length;
    if (validCount >= nextPcaThreshold) {
      updatePCA();
    }
  }, [ratedAttributes]);

  // When we have at least this many members in the first stream, trigger global attribute fetch.
  const FIRST_BATCH_THRESHOLD = 2;

  // runTest orchestrates the complete chain.
  const runTest = async () => {
    // Reset all states.
    setLoading(true);
    setError(null);
    setBatches([]);
    setStreamText('');
    setLogs([]);
    setDomainMembers([]);
    setGlobalAttributes(null);
    setRatedAttributes([]);
    setPcaIterationCount(0);
    setNextPcaThreshold(5);
    processedMembers.clear();
    pendingRatingMembers.length = 0;
    addLog(`Starting domain list generation for: "${domain}"`);

    let partialBuffer = ''; // Accumulates incomplete text from chunks.
    let globalAttributesFetched = false;
    let globalAttrLocal = null; // Will hold the fetched global attributes.

    try {
      await generateDomainItemsStream(domain, selectedModel, async (chunk) => {
        // Append current chunk to stream text (for UI display).
        setStreamText(prev => prev + chunk);
        partialBuffer += chunk;
        // Split on commas (assuming CSV output from the LLM).
        let parts = partialBuffer.split(',');
        let completeMembers = parts.slice(0, -1).map(s => s.trim()).filter(Boolean);
        partialBuffer = parts[parts.length - 1];
        setDomainMembers(prev => [...prev, ...completeMembers]);
        completeMembers.forEach(member => {
          if (!processedMembers.has(member)) {
            pendingRatingMembers.push(member);
          }
        });
        if (!globalAttributesFetched && pendingRatingMembers.length >= FIRST_BATCH_THRESHOLD) {
          globalAttributesFetched = true;
          const firstBatch = [...pendingRatingMembers];
          addLog(`First batch reached: ${firstBatch.join(', ')}`);
          fetchGlobalAttributes(domain, firstBatch)
            .then(attr => {
              globalAttrLocal = attr;
              setGlobalAttributes(attr);
              addLog('Global attributes fetched successfully', 'success');
              pendingRatingMembers.forEach(member => processMemberRating(member, attr));
              pendingRatingMembers.length = 0;
            })
            .catch(err => {
              addLog(`Error fetching global attributes: ${err.message}`, 'error');
            });
        } else if (globalAttributesFetched && globalAttrLocal) {
          processNewMembers(completeMembers, globalAttrLocal);
        }
        // Process the chunk for batch display.
        batchProcessor.processStreamChunk(chunk);
      });

      if (partialBuffer.trim()) {
        const lastMember = partialBuffer.trim();
        setDomainMembers(prev => [...prev, lastMember]);
        if (!processedMembers.has(lastMember)) {
          if (globalAttributesFetched && globalAttrLocal) {
            processMemberRating(lastMember, globalAttrLocal);
          } else {
            pendingRatingMembers.push(lastMember);
          }
        }
      }
      await batchProcessor.finalize();

      // Perform a final PCA run to update the state.
      if (ratedAttributes.filter(item => item.success && item.attributes).length > 0) {
        updatePCA();
      }
    } catch (err) {
      setError(err.message);
      addLog(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <DevPanelViz
      isVisible={isVisible}
      selectedModel={selectedModel}
      domain={domain}
      logs={logs}
      loading={loading}
      batches={batches}
      error={error}
      streamText={streamText}
      globalAttributes={globalAttributes}
      ratedAttributes={ratedAttributes}
      onModelChange={(e) => setSelectedModel(e.target.value)}
      onDomainChange={(e) => setDomain(e.target.value)}
      onRunTest={runTest}
      onClearLogsAndResults={clearAllState}
    />
  );
};

export default DevPanel;
