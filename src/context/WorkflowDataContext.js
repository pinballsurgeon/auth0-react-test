// src/context/WorkflowDataContext.js
// objective: create a centralized store for workflow state and logic.

import React, { createContext, useContext, useState, useCallback } from 'react';
import { runWorkflow } from '../services/WorkflowEngine'; // assuming runWorkflow is here

// create the context
const WorkflowContext = createContext(null);

// create the provider component
export const WorkflowDataProvider = ({ children }) => {
  const [workflowData, setWorkflowData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [selectedPcaIteration, setSelectedPcaIteration] = useState('');

  // handle triggering the workflow and updating state
  const handleVisualize = useCallback(async (domain) => {
    if (!domain || !domain.trim()) return; // prevent empty searches

    setLoading(true);
    setWorkflowData(null); // reset previous data
    setError(null); // reset previous error
    setSelectedPcaIteration(''); // reset pca selection

    try {
      const result = await runWorkflow({ domain }); // call the engine
      setWorkflowData(result);

      // automatically select the first available pca iteration after data loads
      if (result?.ratedAttributes?.length > 0) {
        const firstItem = result.ratedAttributes[0];
        // find keys like 'batch0_pca', 'batch1_pca' etc.
        const pcaKeys = Object.keys(firstItem).filter(key => key.startsWith('batch') && key.endsWith('_pca'));
        if (pcaKeys.length > 0) {
          // sort keys alphanumerically just in case (batch10 before batch2)
          pcaKeys.sort((a, b) => {
              const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
              const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
              return numA - numB;
          });
          setSelectedPcaIteration(pcaKeys[0]); // select the first one (e.g., batch0_pca)
        }
      }
    } catch (err) {
      console.error("workflow error:", err); // log the actual error for debugging
      setError(err.message || 'an unexpected error occurred'); // set user-facing error message
    } finally {
      setLoading(false); // ensure loading is always turned off
    }
  }, []); // dependency array is empty as runWorkflow and setters don't need to be dependencies here

  // bundle state and actions into the context value
  const value = {
    workflowData,
    loading,
    error,
    searchInput,
    selectedPcaIteration,
    setSearchInput,
    setSelectedPcaIteration,
    handleVisualize, // provide the action function
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
};

// create and export the custom hook for easy consumption
export const useWorkflowData = () => {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflowData must be used within a WorkflowDataProvider');
  }
  return context;
};