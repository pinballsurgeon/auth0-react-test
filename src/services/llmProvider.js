// src/services/llmProvider.js

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
        const errorText = await response.text().catch(() => 'Could not read error response body');
        console.error(`Failed to fetch data from server. Status: ${response.status}, Body: ${errorText}`);
        throw new Error(`Failed to fetch data from server. Status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log("Stream reader finished (done is true).");
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const contentToParse = line.slice(6);
            const trimmedContent = contentToParse.trim(); // Use trimmed content for checks

            // --- FIX: Check for the raw [DONE] signal *before* parsing ---
            if (trimmedContent === '[DONE]') {
              console.log("Received raw [DONE] signal.");
              onChunk('[STREAM_COMPLETE]'); // Signal completion
              return; // Exit the function successfully
            }
            // --- End FIX ---

            // If it wasn't the raw [DONE] signal, proceed with parsing attempt
            if (trimmedContent.length > 0) {
               console.log("Attempting to parse SSE data content:", JSON.stringify(trimmedContent)); // Log what we *will* parse
               try {
                 const data = JSON.parse(trimmedContent); // Parse the (presumably) valid JSON

                 // We don't need the data === '[DONE]' check anymore here
                 // because we handled the raw string above.

                 if (data.error) {
                   console.error("Received error object from server:", data.error);
                   throw new Error(data.error);
                 }

                 if (data.hasOwnProperty('chunk')) { // Check if chunk property exists
                    if (data.chunk !== "") { // Only process non-empty chunks if desired
                        fullText += data.chunk;
                        onChunk(data.chunk);
                    } else {
                        console.log("Received and skipped empty chunk.");
                    }
                 } else {
                   console.log("Parsed valid JSON, but it was not a recognized format (chunk, error):", data);
                 }

               } catch (e) {
                 // Catch JSON.parse errors
                 console.error('Error parsing SSE data:', e);
                 console.error('Problematic content that caused parsing error was:', JSON.stringify(trimmedContent));
                 throw e; // Re-throw error to stop processing
               }
            } else {
               console.log("Skipping empty or whitespace-only SSE data content after trimming.");
            }
          } else if (line.trim().length > 0) {
              console.log("Received unexpected non-data SSE line:", JSON.stringify(line));
          }
        }
      }
    } catch (error) {
      console.error('Error in generateDomainItemsStream execution:', error);
      throw error;
    }
    console.log("generateDomainItemsStream processing finished unexpectedly without explicit completion signal.");
  };