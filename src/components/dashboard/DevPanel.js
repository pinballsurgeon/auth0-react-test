// /src/components/dashboard/DevPanel.js
import React, { useState, useRef, useEffect } from 'react';
import CollapsibleSection from './CollapsibleSection';
import { generateDomainItemsStream, MODELS } from '../../services/llmProvider';
import { BatchProcessor } from '../../services/batchProcessor';
import BatchDisplay from '../BatchDisplay';
// IMPORTANT: These two functions are assumed to be implemented in your attribute service.
import { fetchGlobalAttributes, fetchRatedAttributesForItem } from '../../services/attributeService';
import { LogService } from '../../services/logService';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


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
  let partialBuffer = ''; // Accumulates incomplete text from chunks.
  const processedMembers = new Set(); // To avoid duplicate rating requests.
  const pendingRatingMembers = []; // Members waiting for global attributes.
  let globalAttributesFetched = false;
  let globalAttrLocal = null; // Will hold the fetched global attributes.

  // Helper: Process an individual member (if not already processed) using global attributes.
  const processMemberRating = async (member, globalAttr) => {
    if (processedMembers.has(member)) return;
    processedMembers.add(member);
    // Add a small delay (e.g., 50ms) before launching the rating request.
    await sleep(1000);
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
    <div className="mb-12 p-6 bg-gray-900 rounded-xl text-white">
      <h2 className="text-2xl font-bold mb-4">Developer Console</h2>
      
      <CollapsibleSection title="Test Controls">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Model</label>
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full p-2 bg-gray-700 rounded text-white"
          >
            <option value={MODELS.GPT35}>GPT-3.5</option>
            <option value={MODELS.GPT4}>GPT-4</option>
            <option value={MODELS.CLAUDE}>Claude</option>
            <option value={MODELS.GEMINI}>Gemini</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Enter Domain</label>
          <input 
            type="text" 
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g., mexican food, sports, programming languages"
            className="w-full p-2 bg-gray-700 rounded text-white"
          />
        </div>
        <button 
          onClick={runTest}
          disabled={loading || !domain.trim()}
          className="w-full p-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Streaming...' : 'Run Domain Test'}
        </button>
      </CollapsibleSection>
      
      <CollapsibleSection title="Stream Output" defaultExpanded={false}>
        {(streamText || loading) && (
          <>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-md font-semibold">
                Stream Output {loading && <span className="text-yellow-400">(Streaming...)</span>}
              </h4>
              <button 
                onClick={() => navigator.clipboard.writeText(streamText)}
                className="text-sm text-blue-400 hover:underline"
              >
                Copy
              </button>
            </div>
            <div className="p-3 bg-gray-700 rounded text-white whitespace-pre-wrap">
              {streamText}
              {loading && <span className="animate-pulse">▌</span>}
            </div>
          </>
        )}
      </CollapsibleSection>
      
      <CollapsibleSection title="Batch Results" defaultExpanded={false}>
        <BatchDisplay batches={batches} />
      </CollapsibleSection>
      
      <CollapsibleSection title="Global Domain Attributes" defaultExpanded={false}>
        {globalAttributes ? (
          <div className="p-3 bg-green-800 rounded">
            <pre className="text-white">{JSON.stringify(globalAttributes, null, 2)}</pre>
          </div>
        ) : (
          <div className="text-gray-500">No global attributes fetched yet...</div>
        )}
      </CollapsibleSection>
      
      <CollapsibleSection title="Rated Attributes for Domain Members" defaultExpanded={false}>
        {ratedAttributes.length === 0 ? (
          <div className="text-gray-500">No rated attributes yet...</div>
        ) : (
          <div className="space-y-2">
            {ratedAttributes.map((result, i) => (
              <div
                key={i}
                className={`p-2 rounded ${result.success ? 'bg-green-800' : 'bg-red-800'}`}
              >
                <strong>{result.member}</strong>:
                <pre className="mt-2 text-white whitespace-pre-wrap">
                  {result.success
                    ? JSON.stringify(result.attributes, null, 2)
                    : `Error: ${result.error}`}
                </pre>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      
      <CollapsibleSection title="Processing Logs">
        {error && (
          <div className="mb-4 p-3 bg-red-600 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}
        <div className="h-64 bg-gray-900 rounded p-4 font-mono text-sm overflow-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet... Run a test to see output.</div>
          ) : (
            <>
              {logs.map((log, i) => (
                <div key={i} className={`mb-1 ${
                  log.type === 'error' ? 'text-red-400' : 
                  log.type === 'debug' ? 'text-gray-400' : 
                  log.type === 'success' ? 'text-green-400' : 'text-blue-400'
                }`}>
                  {log.message}
                </div>
              ))}
              <div ref={logEndRef} />
            </>
          )}
        </div>
        <button 
          onClick={() => {
            setLogs([]);
            setStreamText('');
            setBatches([]);
            setError(null);
            setDomainMembers([]);
            setGlobalAttributes(null);
            setRatedAttributes([]);
          }}
          className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          Clear Logs & Results
        </button>
      </CollapsibleSection>
    </div>
  );
};

export default DevPanel;
