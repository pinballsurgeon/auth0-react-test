// \src\services\llmProvider.js

// const GCP_FUNCTION_URL = 'https://us-central1-dehls-deluxo-engine.cloudfunctions.net/vector-projector-server-2';
const GCP_FUNCTION_URL = "https://us-central1-zippy-purpose-257102.cloudfunctions.net/vector-projector-server-2";

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
      let fullText = '';
  
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
  
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
  
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data === '[DONE]') {
                // Process the full text into an array if needed
                const items = fullText.split(',').map(item => item.trim()).filter(Boolean);
                onChunk('\n\nTotal items: ' + items.length);
                return;
              }
              
              if (data.error) {
                throw new Error(data.error);
              }
              
              if (data.chunk) {
                fullText += data.chunk;
                onChunk(data.chunk);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
              console.error('Data that failed parsing:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in generateDomainItemsStream:', error);
      throw error;
    }
  };

