// /src/components/dashboard/DevPanel.js
import React, { useState, useRef, useEffect } from 'react';
import CollapsibleSection from './CollapsibleSection';
import { generateDomainItemsStream, MODELS } from '../../services/llmProvider';
import { BatchProcessor } from '../../services/batchProcessor';
import BatchDisplay from '../BatchDisplay';
// IMPORTANT: These two functions are assumed to be implemented in your attribute service.
import { fetchGlobalAttributes, fetchRatedAttributesForItem } from '../../services/attributeService';
import { LogService } from '../../services/logService';

const CodeIcon = () => (
  <svg width="24" height="24">
    <circle cx="12" cy="12" r="10" fill="#EF4444" />
  </svg>
);

// Utility: Append a timestamped log entry.
export const addLog = (message, type = 'info') => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  setLogs(prev => [...prev, { message: `[${timestamp}] ${message}`, type }]);
};

const DevPanel = ({ isVisible }) => {
  // State variables for domain test streaming and attribute processing.
  const [selectedModel, setSelectedModel] = useState(MODELS.GPT35);
  const [domain, setDomain] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState(null);
  const [streamText, setStreamText] = useState('');
  const [domainMembers, setDomainMembers] = useState([]);       // All domain members streamed.
  const [globalAttributes, setGlobalAttributes] = useState(null); // Global attribute set (fetched once).
  const [ratedAttributes, setRatedAttributes] = useState([]);     // Per‑member rated attributes.
  const logEndRef = useRef(null);

  // Auto-scroll log container when logs update.
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

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

    const batchProcessor = new BatchProcessor(handleBatchProcessed, addLog);
    let firstBatchFetched = false; // Ensure global attribute request only happens once.

    try {
      // Stream domain members.
      await generateDomainItemsStream(
        domain,
        selectedModel,
        async (chunk) => {

          // Append current chunk to stream text.
          setStreamText(prev => prev + chunk);

          // Assume each chunk is a comma-separated list.
          const newMembers = chunk.split(',').map(s => s.trim()).filter(Boolean);

          // Update the list of domain members.
          setDomainMembers(prev => {
            const updatedMembers = [...prev, ...newMembers];

            // When the threshold is reached, trigger global attribute fetch.
            if (!firstBatchFetched && updatedMembers.length >= FIRST_BATCH_THRESHOLD) {
              firstBatchFetched = true;
              const firstBatch = updatedMembers.slice(0, FIRST_BATCH_THRESHOLD);
              addLog(`First batch reached: ${firstBatch.join(', ')}`);

              // Fetch global attributes using the domain and sample members.
              fetchGlobalAttributes(domain, firstBatch)
                .then((globalAttr) => {
                  setGlobalAttributes(globalAttr);
                  addLog('Global attributes fetched successfully', 'success');

                  // Now, for every domain member, launch parallel rating requests.
                  const ratedPromises = updatedMembers.map(member =>
                    fetchRatedAttributesForItem(member, globalAttr)
                      .then(result => ({ member, attributes: result.attributes, success: true }))
                      .catch(err => ({ member, error: err.message, success: false }))
                  );

                  Promise.all(ratedPromises)
                    .then((ratedResults) => {
                      setRatedAttributes(ratedResults);
                      addLog('Rated attributes fetched for all domain members', 'success');
                      addLog(`${JSON.stringify(ratedResults, null, 2)}`, 'success');
                    })
                    .catch((err) => {
                      addLog(`Error fetching rated attributes: ${err.message}`, 'error');
                    });
                })
                .catch((err) => {
                  addLog(`Error fetching global attributes: ${err.message}`, 'error');
                });
            }
            return updatedMembers;
          });
          // Process the chunk for batch display.
          batchProcessor.processStreamChunk(chunk);
        }
      );
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
              <div key={i} className={`p-2 rounded ${result.success ? 'bg-green-800' : 'bg-red-800'}`}>
                <strong>{result.member}</strong>: {result.success ? JSON.stringify(result.attributes) : `Error: ${result.error}`}
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
