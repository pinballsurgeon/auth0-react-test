

const GCP_FUNCTION_URL = 'https://us-central1-dehls-deluxo-engine.cloudfunctions.net/vector-projector-server-2';

export const MODELS = {
  GPT35: 'gpt-3.5-turbo',
  GPT4: 'gpt-4',
  CLAUDE: 'claude-3-opus',
  GEMINI: 'gemini-pro'
};

export const generateDomainItemsStream = async (domain, model = MODELS.GEMINI, onChunk) => {
    try {
      const response = await fetch(GCP_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          model,
          instructionKey: 'domain_list'
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch data from server.');
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
  
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
  
        // Decode the chunk and add it to our buffer
        buffer += decoder.decode(value, { stream: true });
  
        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
  
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data === '[DONE]') {
                return;
              }
              
              if (data.error) {
                throw new Error(data.error);
              }
              
              if (data.chunk) {
                onChunk(data.chunk);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in generateDomainItemsStream:', error);
      throw error;
    }
  };



// const GCP_FUNCTION_URL = 'https://us-central1-dehls-deluxo-engine.cloudfunctions.net/vector-projector-server-2';

// export const MODELS = {
//   GPT35: 'gpt-3.5-turbo',
//   GPT4: 'gpt-4',
//   CLAUDE: 'claude-3-opus',
//   GEMINI: 'gemini-pro'
// };

// export const generateDomainItems = async (domain, model = MODELS.GPT35) => {
//   try {
//     const response = await fetch(GCP_FUNCTION_URL, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ 
//         domain, 
//         model,
//         instructionKey: 'domain_list' 
//       })
//     });

//     if (!response.ok) {
//       const errorData = await response.json();
//       throw new Error(errorData.error || 'Failed to fetch data from server.');
//     }

//     const data = await response.json();
//     return data;
//   } catch (error) {
//     console.error('Error in generateDomainItems:', error);
//     throw error;
//   }
// };