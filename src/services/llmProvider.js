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
        // Log the response status and text if possible for more context on failure
        const errorText = await response.text().catch(() => 'Could not read error response body');
        console.error(`Failed to fetch data from server. Status: ${response.status}, Body: ${errorText}`);
        throw new Error(`Failed to fetch data from server. Status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = ''; // Keep track of accumulated text for context if needed

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log("Stream reader finished (done is true).");
          // Process any remaining buffer content if necessary, although SSE usually ends with [DONE]
          if (buffer.trim().length > 0) {
             console.log("Processing remaining buffer after done:", JSON.stringify(buffer));
             // You might need similar parsing logic here if the server doesn't guarantee a final newline
          }
          break; // Exit the loop
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          // Log every line received for maximum debug info
          // console.log("Raw SSE line received:", JSON.stringify(line));

          if (line.startsWith('data: ')) {
            const contentToParse = line.slice(6); // Get the content after "data: "

            // ---- START DIAGNOSTIC LOG ----
            // Log the exact string we are about to attempt parsing
            console.log("Attempting to parse SSE data content:", JSON.stringify(contentToParse));
            // ---- END DIAGNOSTIC LOG ----

            try {
              // Only attempt to parse if the content is not empty or just whitespace
              if (contentToParse && contentToParse.trim().length > 0) {
                  const data = JSON.parse(contentToParse); // Parse the stored content

                  // Check for the specific [DONE] signal object/string if the server sends it this way
                  // Adjust this condition based on exactly how your server signals completion within the JSON data
                  if (data && (data.message === '[DONE]' || data === '[DONE]')) { // Example check
                    console.log("Received [DONE] signal via parsed data.");
                    // Process the full text accumulated so far, if needed
                    const items = fullText.split(',').map(item => item.trim()).filter(Boolean);
                    console.log(`Final accumulated text processed into ${items.length} items.`);
                    // Signal completion clearly to the caller
                    onChunk('[STREAM_COMPLETE]');
                    return; // Exit the loop and the function successfully
                  }

                  if (data.error) {
                    // If the parsed data contains an error field, treat it as an application error
                    console.error("Received error object from server:", data.error);
                    throw new Error(data.error);
                  }

                  if (data.chunk) {
                    // Successfully parsed a chunk of data
                    fullText += data.chunk; // Accumulate text
                    onChunk(data.chunk); // Pass the valid chunk upstream
                  } else {
                    // Parsed valid JSON, but it wasn't the [DONE] signal, an error object, or a chunk. Log it.
                    console.log("Parsed valid JSON, but it was not a recognized format (chunk, error, done):", data);
                  }
              } else {
                 // Log if we skipped parsing because the content was empty/whitespace
                 console.log("Skipping empty or whitespace-only SSE data content.");
              }

            } catch (e) {
              // Catch JSON.parse errors specifically
              console.error('Error parsing SSE data:', e);
              // Log the problematic content again for clarity when an error occurs
              console.error('Problematic content that caused parsing error was:', JSON.stringify(contentToParse));
              // Depending on requirements, you might want to throw e here to stop processing,
              // or continue to try and process subsequent lines. Let's throw to be safe.
              throw e;
            }
          } else if (line.trim().length > 0) {
              // Log any non-empty lines that don't start with 'data: '. This might indicate unexpected server output.
              console.log("Received unexpected non-data SSE line:", JSON.stringify(line));
          }
          // Empty lines are usually ignored in SSE, so no need to log them unless debugging protocol issues.
        }
      }
    } catch (error) {
      // Catch errors from fetch, read, decode, or thrown from the parsing block
      console.error('Error in generateDomainItemsStream execution:', error);
      // Re-throw the error so the calling function (runWorkflow -> handleVisualize) knows about the failure
      throw error;
    }
    // This log indicates the loop finished without the reader marking done=true and without hitting a 'return' or 'throw'.
    // This typically shouldn't happen with a standard SSE stream ending properly.
    console.log("generateDomainItemsStream processing finished unexpectedly without explicit completion signal.");
  };