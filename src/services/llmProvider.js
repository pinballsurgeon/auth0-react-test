

const GCP_FUNCTION_URL = 'https://us-central1-dehls-deluxo-engine.cloudfunctions.net/vector-projector-server-2';

export const MODELS = {
  GPT35: 'gpt-3.5-turbo',
  GPT4: 'gpt-4',
  CLAUDE: 'claude-3-opus',
  GEMINI: 'gemini-pro'
};

export const generateDomainItemsStream = async (domain, model = MODELS.GPT35, onChunk) => {
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

    // Create a reader for the response body
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      // Decode the chunk and parse SSE data
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          if (data === '[DONE]') {
            break;
          }
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          // Call the callback with the new chunk
          onChunk(data.chunk);
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