// src/services/gcpService.js

export const testGCPConnection = async () => {
    try {
      const response = await fetch(process.env.REACT_APP_GCP_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          type: 'connection_test'
        })
      });
  
      const data = await response.json();
      return {
        success: true,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  };