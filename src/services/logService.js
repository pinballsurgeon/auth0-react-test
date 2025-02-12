// services/logService.js
const logListeners = new Set();

export const LogService = {
  // Register a log listener (like DevPanel)
  addListener: (listener) => {
    logListeners.add(listener);
  },

  // Remove a specific listener
  removeListener: (listener) => {
    logListeners.delete(listener);
  },

  // Core logging method
  log: (message, type = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const logEntry = { 
      message: `[${timestamp}] ${message}`, 
      type 
    };

    // Notify all registered listeners
    logListeners.forEach(listener => listener(logEntry));
  }
};