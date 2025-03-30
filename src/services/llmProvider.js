// \src\services\llmProvider.js

// const GCP_FUNCTION_URL = 'https://us-central1-dehls-deluxo-engine.cloudfunctions.net/vector-projector-server-2';
const GCP_FUNCTION_URL = "https://us-central1-zippy-purpose-257102.cloudfunctions.net/vector-projector-server-2";

export const MODELS = {
  GPT35: 'gpt-3.5-turbo',
  GPT4: 'gpt-4',
  CLAUDE: 'claude-3-opus', // Note: Check if your backend actually supports this model key
  GEMINI: 'gemini-pro'     // Note: Check if your backend actually supports this model key
};

/**
 * Fetches a stream of domain items from the backend using SSE.
 * @param {string} domain The domain topic to generate items for.
 * @param {string} model The LLM model to use (from MODELS enum).
 * @param {function} onChunk Callback function triggered for each data chunk received.
 *                           Receives the text chunk as a string, or a final object
 *                           like { type: 'complete', items: string[], fullText: string } on completion.
 * @returns {Promise<string[]>} A promise that resolves with the final array of items when the stream is complete.
 * @throws {Error} If fetching or processing fails.
 */
export const generateDomainItemsStream = async (domain, model = MODELS.GEMINI, onChunk) => {
    let fullText = ''; // Accumulate text chunks

    try {
        console.log(`Starting stream for domain: "${domain}" with model: "${model}"`);
        const response = await fetch(GCP_FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                domain,
                model,
                instructionKey: 'domain_list' // Ensure backend expects this key
            })
        });

        if (!response.ok) {
            // Attempt to read error details from the response body
            let errorBody = 'Could not read error body.';
            try {
                errorBody = await response.text();
            } catch (readError) {
                console.error("Failed to read error response body:", readError);
            }
            throw new Error(`Server request failed. Status: ${response.status} ${response.statusText}. Body: ${errorBody}`);
        }

        if (!response.body) {
            throw new Error('Response body is missing.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Loop indefinitely until the stream is explicitly closed or done
        while (true) {
            const { value, done } = await reader.read();

            // Check if the reader stream is finished
            if (done) {
                console.log("Reader signaled 'done'. Processing potential remaining buffer and exiting read loop.");
                // Process any final data left in the buffer (unlikely with newline splitting but safe)
                if (buffer.trim()) {
                    console.warn("Processing remaining buffer after stream ended:", buffer);
                    // You could potentially re-run the line processing logic here if needed
                    // based on how your server terminates streams.
                }
                break; // Exit the while loop
            }

            // Decode the current chunk and add it to the buffer
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // Keep the last potentially incomplete line in the buffer for the next read
            buffer = lines.pop() || '';

            // Process each complete line received
            for (const line of lines) {
                if (!line.trim()) {
                    // console.log('Skipping empty line.');
                    continue; // Skip empty lines
                }

                // --- IMPORTANT: Check for the [DONE] signal BEFORE parsing ---
                if (line === 'data: [DONE]') {
                    console.log("SSE stream finished signal ('data: [DONE]') received.");
                    // Don't exit the loop here. Let reader.read() return done:true.
                    // This ensures any data chunks sent *before* [DONE] in the same
                    // network packet are processed.
                    continue; // Skip to the next line
                }
                // --- End of [DONE] check ---

                // Process lines starting with 'data: '
                if (line.startsWith('data: ')) {
                    const jsonString = line.slice(6).trim(); // Remove 'data: ' and trim

                    if (!jsonString) {
                       // console.log("Skipping line with only 'data: '.");
                        continue; // Skip if the line was just 'data: '
                    }

                    try {
                        const parsedData = JSON.parse(jsonString);

                        // Check for application-level errors reported in the JSON
                        if (parsedData.error) {
                            console.error('Application error received from server stream:', parsedData.error);
                            // Decide how to handle server-side errors (continue, throw, etc.)
                            throw new Error(`Server error during stream: ${parsedData.error}`);
                        }

                        // Process valid data chunks containing text
                        if (parsedData.chunk) {
                            fullText += parsedData.chunk;
                            // Call the provided callback with the individual chunk
                            if (onChunk && typeof onChunk === 'function') {
                                onChunk(parsedData.chunk);
                            }
                        } else {
                            // Log if we receive a data object without a 'chunk' or 'error'
                            console.warn('Received data object without expected "chunk" or "error" field:', parsedData);
                        }

                    } catch (e) {
                        // Catch errors during JSON.parse
                        if (e instanceof SyntaxError) {
                            console.error('Error parsing SSE JSON:', e);
                            console.error('--- Problematic JSON string was: --->', jsonString, '<---');
                        } else {
                            // Catch other potential errors from processing the parsedData
                            console.error('Error processing parsed SSE data object:', e);
                        }
                        // Optional: Decide if a parse error should stop the whole process
                        // throw new Error('Failed to parse critical stream data.');
                    }
                } else {
                    // Log lines that don't conform to the expected 'data: ' prefix or '[DONE]' signal
                    console.warn('Ignoring unexpected/non-standard SSE line:', line);
                }
            } // End for loop (processing lines)
        } // End while loop (reading stream)

        // --- Stream processing complete ---
        console.log("Stream processing finished. Finalizing results.");

        // Process the accumulated text into the final array of items
        const items = fullText.split(',')
                           .map(item => item.trim())
                           .filter(Boolean); // Remove any empty strings resulting from split/trim

        console.log(`Extracted ${items.length} items.`);

        // Call the callback one last time with a completion signal and the final data
        if (onChunk && typeof onChunk === 'function') {
            onChunk({ type: 'complete', items: items, fullText: fullText });
        }

        // Return the final array of items
        return items;

    } catch (error) {
        console.error('Critical error in generateDomainItemsStream:', error);
        // Call the callback with an error signal if possible
        if (onChunk && typeof onChunk === 'function') {
            onChunk({ type: 'error', error: error.message || 'Unknown stream error' });
        }
        // Propagate the error so the calling code knows something went wrong
        throw error;
    }
};