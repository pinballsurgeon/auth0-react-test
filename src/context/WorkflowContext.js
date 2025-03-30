import React, { createContext, useContext, useReducer, useCallback } from 'react';

/**
 * WorkflowContext
 * 
 * Purpose: Provides shared state and workflow tracking across components
 * 
 * Features:
 * - Workflow step tracking and history
 * - Error state management
 * - Performance metrics collection
 * - Cross-component communication
 * 
 * History:
 * - [2025-03-09] Initial implementation with history logging
 * - [2025-03-09] Added performance tracking
 * - [2025-03-09] Added error handling and recovery options
 * 
 * Future Objectives:
 * - Add workflow forking/branching capabilities
 * - Implement workflow templates system
 * - Add ML-based workflow optimization suggestions
 */

// Initial state structure
const initialState = {
  workflowId: null,
  isActive: false,
  currentStep: null,
  history: [],
  errors: [],
  performance: {
    startTime: null,
    stepTimes: {},
    totalTime: null,
  },
  moduleIO: {}, // Tracks inputs/outputs of each module
  batchProgress: {
    total: 0,
    completed: 0,
    inProgress: 0,
    failed: 0,
  },
  metadata: {}, // Custom metadata for the workflow
};

// Action types
const ActionTypes = {
  START_WORKFLOW: 'START_WORKFLOW',
  END_WORKFLOW: 'END_WORKFLOW',
  SET_STEP: 'SET_STEP',
  LOG_ERROR: 'LOG_ERROR',
  CLEAR_ERRORS: 'CLEAR_ERRORS',
  TRACK_MODULE_IO: 'TRACK_MODULE_IO',
  UPDATE_BATCH_PROGRESS: 'UPDATE_BATCH_PROGRESS',
  SET_METADATA: 'SET_METADATA',
  RESET: 'RESET',
};

/**
 * Reducer function to handle state updates
 * 
 * @param {Object} state - Current workflow state
 * @param {Object} action - Action to perform
 * @returns {Object} Updated state
 */
function workflowReducer(state, action) {
  const now = new Date();
  
  switch (action.type) {
    case ActionTypes.START_WORKFLOW:
      return {
        ...state,
        workflowId: action.payload.workflowId,
        isActive: true,
        currentStep: 'initialized',
        history: [{ step: 'initialized', timestamp: now, data: action.payload.initialData }],
        performance: {
          ...state.performance,
          startTime: now,
          stepTimes: { initialized: { start: now, end: null } }
        },
        metadata: action.payload.metadata || {},
      };
      
    case ActionTypes.END_WORKFLOW:
      return {
        ...state,
        isActive: false,
        currentStep: 'completed',
        history: [
          ...state.history,
          { step: 'completed', timestamp: now, data: action.payload.finalData }
        ],
        performance: {
          ...state.performance,
          stepTimes: {
            ...state.performance.stepTimes,
            completed: { start: now, end: now }
          },
          totalTime: state.performance.startTime 
            ? now - state.performance.startTime 
            : null
        }
      };
      
    case ActionTypes.SET_STEP:
      // Complete the previous step's timing if it exists
      const updatedStepTimes = {...state.performance.stepTimes};
      if (state.currentStep && updatedStepTimes[state.currentStep]) {
        updatedStepTimes[state.currentStep] = {
          ...updatedStepTimes[state.currentStep],
          end: now
        };
      }
      
      // Start timing for the new step
      updatedStepTimes[action.payload.step] = {
        start: now,
        end: null
      };
      
      return {
        ...state,
        currentStep: action.payload.step,
        history: [
          ...state.history,
          { 
            step: action.payload.step, 
            timestamp: now, 
            data: action.payload.data,
            metadata: action.payload.metadata
          }
        ],
        performance: {
          ...state.performance,
          stepTimes: updatedStepTimes
        }
      };
      
    case ActionTypes.LOG_ERROR:
      return {
        ...state,
        errors: [
          ...state.errors,
          { 
            step: state.currentStep, 
            timestamp: now, 
            error: action.payload.error,
            recoverable: action.payload.recoverable,
            data: action.payload.data
          }
        ]
      };
      
    case ActionTypes.CLEAR_ERRORS:
      return {
        ...state,
        errors: []
      };
      
    case ActionTypes.TRACK_MODULE_IO:
      return {
        ...state,
        moduleIO: {
          ...state.moduleIO,
          [action.payload.moduleId]: {
            input: action.payload.input,
            output: action.payload.output,
            timestamp: now,
            processingTime: action.payload.processingTime
          }
        }
      };
      
    case ActionTypes.UPDATE_BATCH_PROGRESS:
      return {
        ...state,
        batchProgress: {
          ...state.batchProgress,
          ...action.payload
        }
      };
      
    case ActionTypes.SET_METADATA:
      return {
        ...state,
        metadata: {
          ...state.metadata,
          ...action.payload
        }
      };
      
    case ActionTypes.RESET:
      return initialState;
      
    default:
      return state;
  }
}

// Create the context
const WorkflowContext = createContext();

/**
 * WorkflowProvider Component
 * 
 * Provides workflow state and actions to child components
 * 
 * @param {Object} props - Component props
 * @returns {React.Component} Provider component
 */
export function WorkflowProvider({ children }) {
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  
  /**
   * Starts a new workflow with a unique ID
   * 
   * @param {Object} initialData - Initial workflow data
   * @param {Object} metadata - Additional metadata for the workflow
   * @returns {string} Generated workflow ID
   */
  const startWorkflow = useCallback((initialData = {}, metadata = {}) => {
    const workflowId = `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    dispatch({ 
      type: ActionTypes.START_WORKFLOW, 
      payload: { workflowId, initialData, metadata } 
    });
    return workflowId;
  }, []);
  
  /**
   * Ends the current active workflow
   * 
   * @param {Object} finalData - Final data from the workflow
   */
  const endWorkflow = useCallback((finalData = {}) => {
    dispatch({ type: ActionTypes.END_WORKFLOW, payload: { finalData } });
  }, []);
  
  /**
   * Sets the current workflow step
   * 
   * @param {string} step - Step identifier
   * @param {Object} data - Data associated with this step
   * @param {Object} metadata - Additional metadata for this step
   */
  const setStep = useCallback((step, data = {}, metadata = {}) => {
    dispatch({ type: ActionTypes.SET_STEP, payload: { step, data, metadata } });
  }, []);
  
  /**
   * Logs an error that occurred during workflow execution
   * 
   * @param {Error|string} error - The error that occurred
   * @param {boolean} recoverable - Whether the workflow can recover from this error
   * @param {Object} data - Additional data about the error context
   */
  const logError = useCallback((error, recoverable = false, data = {}) => {
    dispatch({ 
      type: ActionTypes.LOG_ERROR, 
      payload: { error, recoverable, data } 
    });
  }, []);
  
  /**
   * Clears all errors in the workflow state
   */
  const clearErrors = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_ERRORS });
  }, []);
  
  /**
   * Tracks input/output data for a specific module
   * 
   * @param {string} moduleId - Module identifier
   * @param {Object} input - Input data to the module
   * @param {Object} output - Output data from the module
   * @param {number} processingTime - Time taken to process (in ms)
   */
  const trackModuleIO = useCallback((moduleId, input, output, processingTime) => {
    dispatch({
      type: ActionTypes.TRACK_MODULE_IO,
      payload: { moduleId, input, output, processingTime }
    });
  }, []);
  
  /**
   * Updates batch processing progress metrics
   * 
   * @param {Object} progressUpdate - Object containing progress metrics
   */
  const updateBatchProgress = useCallback((progressUpdate) => {
    dispatch({
      type: ActionTypes.UPDATE_BATCH_PROGRESS,
      payload: progressUpdate
    });
  }, []);
  
  /**
   * Sets workflow metadata
   * 
   * @param {Object} metadata - Metadata key-value pairs
   */
  const setMetadata = useCallback((metadata) => {
    dispatch({
      type: ActionTypes.SET_METADATA,
      payload: metadata
    });
  }, []);
  
  /**
   * Resets the workflow state to initial values
   */
  const resetWorkflow = useCallback(() => {
    dispatch({ type: ActionTypes.RESET });
  }, []);
  
  /**
   * Returns performance metrics for the workflow
   * 
   * @returns {Object} Performance metrics
   */
  const getPerformanceMetrics = useCallback(() => {
    const { performance } = state;
    
    // Calculate durations for each step
    const stepDurations = Object.entries(performance.stepTimes).reduce((acc, [step, times]) => {
      if (times.start && times.end) {
        acc[step] = times.end - times.start;
      }
      return acc;
    }, {});
    
    return {
      totalTime: performance.totalTime,
      stepDurations,
      averageStepTime: Object.values(stepDurations).length > 0
        ? Object.values(stepDurations).reduce((sum, time) => sum + time, 0) / Object.values(stepDurations).length
        : 0
    };
  }, [state.performance]);
  
  /**
   * Gets workflow history filtered by step type (optional)
   * 
   * @param {string} stepType - Optional step type to filter history by
   * @returns {Array} Filtered workflow history
   */
  const getHistory = useCallback((stepType) => {
    if (stepType) {
      return state.history.filter(item => item.step === stepType);
    }
    return state.history;
  }, [state.history]);
  
  // Value object to be provided by the context
  const value = {
    ...state,
    startWorkflow,
    endWorkflow,
    setStep,
    logError,
    clearErrors,
    trackModuleIO,
    updateBatchProgress,
    setMetadata,
    resetWorkflow,
    getPerformanceMetrics,
    getHistory
  };
  
  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

/**
 * Hook to use the workflow context in components
 * 
 * @returns {Object} Workflow context value
 * @throws {Error} When used outside of a WorkflowProvider
 */
export function useWorkflow() {
  const context = useContext(WorkflowContext);
  
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  
  return context;
}

export default {
  WorkflowProvider,
  useWorkflow
};