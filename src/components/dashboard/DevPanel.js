// /src/components/dashboard/DevPanel.js
import React, { useState, useRef, useEffect } from 'react';
import CollapsibleSection from './CollapsibleSection';
import { generateDomainItemsStream, MODELS } from '../../services/llmProvider';
import { BatchProcessor } from '../../services/batchProcessor';
import BatchDisplay from '../BatchDisplay';
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
  const logEndRef = useRef(null);

  const clearAllState = () => {
    setLogs([]);
    setStreamText('');
    setBatches([]);
    setError(null);
    setDomainMembers([]);
    setGlobalAttributes(null);
    setRatedAttributes([]);
  };

  // Utility: Append a timestamped log entry.
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    setLogs(prev => [...prev, { message: `[${timestamp}] ${message}`, type }]);
  };

  useEffect(() => {
    // Register the setLogs method as a listener
    const logListener = (logEntry) => {
      setLogs(prev => [...prev, logEntry]);
    };
    
    LogService.addListener(logListener);

    // Cleanup listener when component unmounts
    return () => {
      LogService.removeListener(logListener);
    };
  }, []);

  // Batch processing callback.
  const handleBatchProcessed = (batchResult) => {
    setBatches(prev => [...prev, batchResult]);
  };

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
  addLog(`Starting domain list generation for: "${domain}"`);

  // Local variables to handle streaming and processing.
  let partialBuffer = '';               // Accumulates incomplete text from chunks.
  const processedMembers = new Set();   // To avoid duplicate rating requests.
  const pendingRatingMembers = [];      // Members waiting for global attributes.
  let globalAttributesFetched = false;
  let globalAttrLocal = null;           // Will hold the fetched global attributes.

  // Helper: Process an individual member (if not already processed) using global attributes.
  const processMemberRating = async (member, globalAttr) => {
    if (processedMembers.has(member)) return;
    processedMembers.add(member);

    fetchRatedAttributesForItem(member, globalAttr)
      .then(result => {
        setRatedAttributes(prev => [
          ...prev,
          { member, attributes: result[member] || result, success: true },
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

  try {
    await generateDomainItemsStream(domain, selectedModel, async (chunk) => {
      // Append current chunk to stream text (for UI display).
      setStreamText(prev => prev + chunk);

      // Add the new chunk to our partialBuffer.
      partialBuffer += chunk;
      // Split on commas. (Assuming CSV output from the LLM.)
      let parts = partialBuffer.split(',');
      // All parts except the last one are complete (if any).
      let completeMembers = parts.slice(0, -1).map(s => s.trim()).filter(Boolean);
      // The last part may be incomplete—store it back into partialBuffer.
      partialBuffer = parts[parts.length - 1];

      // Update our state of domain members.
      setDomainMembers(prev => [...prev, ...completeMembers]);

      // Queue each new complete member for rating if not already processed.
      completeMembers.forEach(member => {
        if (!processedMembers.has(member)) {
          pendingRatingMembers.push(member);
        }
      });

      // When enough members are available, fetch global attributes (only once).
      if (!globalAttributesFetched && pendingRatingMembers.length >= FIRST_BATCH_THRESHOLD) {
        globalAttributesFetched = true; // Only do this once.
        const firstBatch = [...pendingRatingMembers];
        addLog(`First batch reached: ${firstBatch.join(', ')}`);
        fetchGlobalAttributes(domain, firstBatch)
          .then(attr => {
            globalAttrLocal = attr;
            setGlobalAttributes(attr);
            addLog('Global attributes fetched successfully', 'success');
            // Process all members that are pending.
            pendingRatingMembers.forEach(member => processMemberRating(member, attr));
            // Clear the pending queue.
            pendingRatingMembers.length = 0;
          })
          .catch(err => {
            addLog(`Error fetching global attributes: ${err.message}`, 'error');
          });
      } else if (globalAttributesFetched && globalAttrLocal) {
        // If global attributes are already available, process these new members immediately.
        processNewMembers(completeMembers, globalAttrLocal);
      }

      // Process the chunk for batch display.
      batchProcessor.processStreamChunk(chunk);
    });

    // After streaming ends, check if there is any leftover text that forms a complete member.
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
      onClearLogsAndResults={clearAllState} // your handler to reset state
    />
  );
};

export default DevPanel;