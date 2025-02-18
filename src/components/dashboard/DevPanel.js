// src/components/dashboard/DevPanel.js

import React, { useState, useEffect } from 'react';
import DevPanelViz from './DevPanelViz';
import { runWorkflow } from '../../services/WorkflowEngine';
import { MODELS } from '../../services/llmProvider';
import { LogService } from '../../services/logService';

const DevPanel = ({ isVisible }) => {
  // Production workflow state variables.
  const [selectedModel, setSelectedModel] = useState(MODELS.GPT35);
  const [domain, setDomain] = useState('');
  const [workflowData, setWorkflowData] = useState(null); // Final data structure from WorkflowEngine.
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Clear workflow state.
  const clearAllState = () => {
    setWorkflowData(null);
    setLogs([]);
    setError(null);
  };

  // Utility: Append a timestamped log entry.
  const addLog = (logEntry) => {
    setLogs((prev) => [...prev, logEntry]);
  };

  useEffect(() => {
    // Register LogService listener.
    const logListener = (logEntry) => {
      setLogs((prev) => [...prev, logEntry]);
    };
    LogService.addListener(logListener);
    return () => {
      LogService.removeListener(logListener);
    };
  }, []);

  // Run the complete production workflow.
  const runProductionWorkflow = async () => {
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
      // Pass the complete workflow data that includes domainMembers, globalAttributes, ratedAttributes with PCA fields, and batch info.
      workflowData={workflowData}
      onModelChange={(e) => setSelectedModel(e.target.value)}
      onDomainChange={(e) => setDomain(e.target.value)}
      onRunTest={runProductionWorkflow}
      onClearLogsAndResults={clearAllState}
    />
  );
};

export default DevPanel;
