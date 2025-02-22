// src/components/dashboard/DevPanel.js

import React, { useState, useEffect } from 'react';
import DevPanelViz from './DevPanelViz';
import { runWorkflow } from '../../services/WorkflowEngine';
import { MODELS } from '../../services/llmProvider';
import { LogService } from '../../services/logService';

const DevPanel = ({ isVisible }) => {
  // State variables from our previous flow.
  const [selectedModel, setSelectedModel] = useState(MODELS.GPT35);
  const [domain, setDomain] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // The final workflowData will contain domainMembers, globalAttributes, ratedAttributes (with PCA fields), and batch info.
  const [workflowData, setWorkflowData] = useState(null);

  // Clear all states (similar to our previous clearAllState function).
  const clearAllState = () => {
    setWorkflowData(null);
    setLogs([]);
    setError(null);
  };

  // Utility: Append a timestamped log entry.
  const addLog = (logEntry) => {
    setLogs((prev) => [...prev, logEntry]);
  };

  // Setup a LogService listener so that any logs pushed by our engine are captured.
  useEffect(() => {
    const logListener = (logEntry) => {
      setLogs((prev) => [...prev, logEntry]);
    };
    LogService.addListener(logListener);
    return () => {
      LogService.removeListener(logListener);
    };
  }, []);

  // Run the production workflow that uses WorkflowEngine.js
  const runProductionWorkflow = async () => {
    // Reset previous state before starting.
    clearAllState();
    setLoading(true);
    try {
      const result = await runWorkflow({
        domain,
        selectedModel,
        logCallback: addLog,
      });
      setWorkflowData(result);
    } catch (err) {
      setError(err.message);
      addLog({ message: `Error: ${err.message}`, type: 'error' });
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
      error={error}
      // Pass the complete workflow data (which includes domainMembers, globalAttributes,
      // ratedAttributes with PCA iterations and image URLs, plus batch info)
      workflowData={workflowData}
      onModelChange={(e) => setSelectedModel(e.target.value)}
      onDomainChange={(e) => setDomain(e.target.value)}
      onRunTest={runProductionWorkflow}
      onClearLogsAndResults={clearAllState}
    />
  );
};

export default DevPanel;