// src/components/dashboard/DevPanelViz.js
import React from 'react';
import CollapsibleSection from './CollapsibleSection';
import BatchDisplay from '../BatchDisplay';

const DevPanelViz = ({
  isVisible,
  selectedModel,
  domain,
  logs,
  loading,
  error,
  // The new prop containing all workflow data
  workflowData,
  // Legacy props (if needed)
  streamText,
  //globalAttributes,
  //ratedAttributes,
  //batches,
  onModelChange,
  onDomainChange,
  onRunTest,
  onClearLogsAndResults,
}) => {
  if (!isVisible) return null;

  // If workflowData exists, destructure its fields for easier use.
  const {
    domainMembers = [],
    globalAttributes = null,
    ratedAttributes = [],
    batches = [],
  } = workflowData || {};

  return (
    <div className="mb-12 p-6 bg-gray-900 rounded-xl text-white">
      <h2 className="text-2xl font-bold mb-4">Developer Console</h2>

      <CollapsibleSection title="Test Controls">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Model
          </label>
          <select
            value={selectedModel}
            onChange={onModelChange}
            className="w-full p-2 bg-gray-700 rounded text-white"
          >
            <option value="GPT-3.5">GPT-3.5</option>
            <option value="GPT-4">GPT-4</option>
            <option value="Claude">Claude</option>
            <option value="Gemini">Gemini</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Enter Domain
          </label>
          <input
            type="text"
            value={domain}
            onChange={onDomainChange}
            placeholder="e.g., mexican food, sports, programming languages"
            className="w-full p-2 bg-gray-700 rounded text-white"
          />
        </div>
        <button
          onClick={onRunTest}
          disabled={loading || !domain.trim()}
          className="w-full p-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Streaming...' : 'Run Domain Test'}
        </button>
      </CollapsibleSection>

      {/* Optionally, if you still want to display raw stream text, add that section */}
      <CollapsibleSection title="Stream Output" defaultExpanded={false}>
        {loading && (
          <>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-md font-semibold">
                Stream Output{' '}
                {loading && <span className="text-yellow-400">(Streaming...)</span>}
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
              result && (
                <div
                  key={i}
                  className={`p-2 rounded ${
                    result.success ? 'bg-green-800' : 'bg-red-800'
                  }`}
                >
                  <strong>{result.member}</strong>:
                  <pre className="mt-2 text-white whitespace-pre-wrap">
                    {result.success
                      ? JSON.stringify(result.attributes, null, 2)
                      : `Error: ${result.error}`}
                  </pre>
                </div>
              )
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Complete Domain Member Data (with PCA Iterations & Image URLs)"
        defaultExpanded={false}
      >
        {ratedAttributes.length === 0 ? (
          <div className="text-gray-500">No member data available yet...</div>
        ) : (
          <div className="p-3 bg-gray-800 rounded">
            <pre className="text-white">
              {JSON.stringify(ratedAttributes, null, 2)}
            </pre>
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
            <div className="text-gray-500">
              No logs yet... Run a test to see output.
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                className={`mb-1 ${
                  log.type === 'error'
                    ? 'text-red-400'
                    : log.type === 'debug'
                    ? 'text-gray-400'
                    : log.type === 'success'
                    ? 'text-green-400'
                    : 'text-blue-400'
                }`}
              >
                {log.message}
              </div>
            ))
          )}
        </div>
        <button
          onClick={onClearLogsAndResults}
          className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          Clear Logs & Results
        </button>
      </CollapsibleSection>
    </div>
  );
};

export default DevPanelViz;
