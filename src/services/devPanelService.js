// services/devPanelService.js

export const generateDomainItems = async (domain) => {
    try {
      const response = await fetch('/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: `List as many items as you can think of in the domain of ${domain}. Format the response as a comma-separated list.`,
          model: 'gpt-3.5-turbo' // We can make this configurable later
        })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      return {
        success: true,
        items: data.response.split(',').map(item => item.trim()),
        raw: data.response
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        raw: null
      };
    }
  };