// /src/components/dashboard/DevPanel.js
import React, { useState, useRef, useEffect } from 'react';
import CollapsibleSection from './CollapsibleSection';
import { generateDomainItemsStream, MODELS } from '../../services/llmProvider';
import { BatchProcessor } from '../../services/batchProcessor';
import BatchDisplay from '../BatchDisplay';
import { fetchAttributesForItem } from '../../services/attributeService';

const CodeIcon = () => (
  <svg width="24" height="24">
    <circle cx="12" cy="12" r="10" fill="#EF4444" />
  </svg>
);

const DevPanel = ({ isVisible }) => {
  const [selectedModel, setSelectedModel] = useState(MODELS.GPT35);
  const [domain, setDomain] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState(null);
  const [streamText, setStreamText] = useState('');
  const [attributeResults, setAttributeResults] = useState([]);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    setLogs(prev => [...prev, { message: `[${timestamp}] ${message}`, type }]);
  };

  const handleBatchProcessed = (batchResult) => {
    setBatches(prev => [...prev, batchResult]);
  };

  const processAttributes = async (items) => {
    addLog(`Starting attribute generation for ${items.length} items`);
    try {
      const attributePromises = items.map(item =>
        fetchAttributesForItem(item)
          .then(data => ({ item, attributes: data.attributes, success: true }))
          .catch(err => ({ item, error: err.message, success: false }))
      );
      const results = await Promise.all(attributePromises);
      addLog(`Attribute generation complete`, 'success');
      setAttributeResults(results);
    } catch (err) {
      addLog(`Attribute generation error: ${err.message}`, 'error');
    }
  };

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setBatches([]);
    setStreamText('');
    setLogs([]);
    setAttributeResults([]);
    addLog(`Starting domain list generation for: "${domain}"`);

    const batchProcessor = new BatchProcessor(handleBatchProcessed, addLog);

    try {
      await generateDomainItemsStream(
        domain,
        selectedModel,
        async (chunk) => {
          if (chunk.startsWith('\n\nTotal items:')) {
            addLog(chunk.trim(), 'success');
            await batchProcessor.finalize();
          } else {
            setStreamText(prev => prev + chunk);
            batchProcessor.processStreamChunk(chunk);
          }
        }
      );

      const items = streamText.split(',').map(s => s.trim()).filter(Boolean);
      if (items.length) {
        processAttributes(items);
      } else {
        addLog('No valid domain items found for attribute generation', 'error');
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
            placeholder="e.g., fruits, cars, programming languages"
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
      
      <CollapsibleSection title="Attribute Generation Results" defaultExpanded={false}>
        {attributeResults.length === 0 ? (
          <div className="text-gray-500">No attribute results yet...</div>
        ) : (
          <div className="space-y-2">
            {attributeResults.map((result, i) => (
              <div key={i} className={`p-2 rounded ${result.success ? 'bg-green-800' : 'bg-red-800'}`}>
                <strong>{result.item}</strong>: {result.success ? JSON.stringify(result.attributes) : `Error: ${result.error}`}
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
            setAttributeResults([]);
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
