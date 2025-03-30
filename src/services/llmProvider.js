// src/services/llmProvider.js

// const GCP_FUNCTION_URL = 'https://us-central1-dehls-deluxo-engine.cloudfunctions.net/vector-projector-server-2';
const GCP_FUNCTION_URL = "https://us-central1-zippy-purpose-257102.cloudfunctions.net/vector-projector-server-2";

export const MODELS = {
  GPT35: 'gpt-3.5-turbo',
  GPT4: 'gpt-4',
  CLAUDE: 'claude-3-opus', // Note: Verify backend support for this model key
  GEMINI: 'gemini-pro'     // Note: Verify backend support for this model key
};

/**
 * Fetches a stream of domain items from the backend using SSE.
 * @param {string} domain The domain topic to generate items for.
 * @param {string} model The LLM model to use (from MODELS enum).
 * @param {function} onChunk Callback function triggered for data chunks, completion, or errors.
 *                           - Receives text chunks (string) during the stream.
 *                           - Receives { type: 'complete', items: string[], fullText: string } on successful completion.
 *                           - Receives { type: 'error', error: string } on critical failure.
 * @returns {Promise<string[]>} A promise that resolves with the final array of items when the stream is complete.
 * @throws {Error} If fetching or processing fails critically. The error is also signaled via onChunk.
 */
export const generateDomainItemsStream = async (domain, model = MODELS.GEMINI, onChunk) => {
    const functionName = 'generateDomainItemsStream'; // For logging context
    let fullText = ''; // Accumulate text chunks

    try {
        console.log(`[${functionName}] Starting stream for domain: "${domain}" with model: "${model}"`);
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
            let errorBody = 'Could not read error body.';
            try {
                errorBody = await response.text();
            } catch (readError) {
                // Log details of the secondary failure (reading the error body)
                console.error(`[${functionName}] Failed to read error response body after non-OK fetch status (${response.status}). Read error:`, readError);
            }
            // Throw the primary error related to the fetch status
            throw new Error(`[${functionName}] Server request failed. Status: ${response.status} ${response.statusText}. Body: ${errorBody}`);
        }

        if (!response.body) {
            // This would be highly unusual for a successful fetch
            throw new Error(`[${functionName}] Response body is missing after successful fetch status.`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Loop indefinitely until the stream is explicitly closed or done
        while (true) {
            const { value, done } = await reader.read();

            // Check if the reader stream is finished
            if (done) {
                console.log(`[${functionName}] Reader signaled 'done'. Processing potential remaining buffer and exiting read loop.`);
                if (buffer.trim()) {
                    // This might indicate an incomplete final message from the server. Log as warning.
                    console.warn(`[${functionName}] Processing remaining buffer after stream ended (may indicate incomplete final message): "${buffer}"`);
                    // Optional: Decide if you need to attempt processing this final buffer fragment
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

                // Optional: Verbose logging for deep debugging (usually commented out)
                // console.log(`[${functionName}] Raw SSE line received:`, line);

                if (!line.trim()) {
                    // Skipping empty lines is expected behavior, no log needed unless debugging
                    // console.log(`[${functionName}] Skipping empty line.`);
                    continue;
                }

                // --- IMPORTANT: Check for the [DONE] signal BEFORE parsing ---
                if (line === 'data: [DONE]') {
                    console.log(`[${functionName}] SSE stream finished signal ('data: [DONE]') received.`);
                    // Let the reader signal 'done' naturally, don't break here.
                    continue; // Skip to the next line
                }
                // --- End of [DONE] check ---

                // Process lines starting with 'data: '
                if (line.startsWith('data: ')) {
                    const jsonString = line.slice(6).trim(); // Remove 'data: ' and trim

                    if (!jsonString) {
                       // Line was just 'data: ', expected behavior, no log needed unless debugging
                       // console.log(`[${functionName}] Skipping line with only 'data: '.`);
                        continue;
                    }

                    try {
                        const parsedData = JSON.parse(jsonString);

                        // Check for application-level errors reported IN the JSON stream
                        if (parsedData.error) {
                            // Log as an error because the server explicitly reported one
                            console.error(`[${functionName}] Application error received from server stream:`, parsedData.error);
                            // Throw an error to stop processing, as the server indicated a failure
                            throw new Error(`Server error during stream: ${parsedData.error}`);
                        }
                        // Check if 'chunk' field exists and is a string (allows empty string)
                        else if (typeof parsedData.chunk === 'string') {
                            // Accumulate the chunk (empty string is handled correctly)
                            fullText += parsedData.chunk;
                            // Call the provided callback with the individual chunk
                            if (onChunk && typeof onChunk === 'function') {
                                onChunk(parsedData.chunk); // Send all chunks, including empty ones
                            }
                        }
                        // This is the case for a valid JSON object that doesn't fit expectations
                        else {
                            // Log as a warning: We got valid JSON, but not the expected structure
                            console.warn(`[${functionName}] Received data object without expected "chunk" (string) or "error" field. Data:`, parsedData);
                        }

                    } catch (e) {
                        // Catch errors DURING JSON.parse or processing the parsed object
                        if (e instanceof SyntaxError) {
                            // Log JSON parsing errors with high severity and include the problematic data
                            console.error(`[${functionName}] FATAL: Error parsing SSE JSON. Error:`, e);
                            console.error(`[${functionName}] --- Problematic JSON string was ---> ${jsonString} <---`);
                            // Decide if this is recoverable. Often it's not.
                            throw new Error(`Failed to parse critical stream data: ${e.message}`);
                        } else {
                            // Catch other potential errors from processing the parsedData (after successful parse)
                            console.error(`[${functionName}] Error processing parsed SSE data object. Error:`, e);
                            console.error(`[${functionName}] --- Parsed data object was --->`, parsedData, '<---');
                            // Decide if this is recoverable.
                            throw new Error(`Failed processing stream data object: ${e.message}`);
                        }
                    }
                } else {
                    // This is an anti-pattern from the server: a non-empty line that doesn't
                    // start with 'data:' and isn't the '[DONE]' signal. Log as a warning.
                    console.warn(`[${functionName}] Ignoring unexpected/non-standard SSE line (doesn't start with 'data:' or match '[DONE]'): "${line}"`);
                }
            } // End for loop (processing lines)
        } // End while loop (reading stream)

        // --- Stream processing complete ---
        console.log(`[${functionName}] Stream processing finished. Finalizing results.`);

        // Process the accumulated text into the final array of items
        const items = fullText.split(',')
                           .map(item => item.trim())
                           .filter(Boolean); // Remove any empty strings resulting from split/trim

        console.log(`[${functionName}] Extracted ${items.length} items.`);

        // Call the callback one last time with a completion signal and the final data
        if (onChunk && typeof onChunk === 'function') {
            onChunk({ type: 'complete', items: items, fullText: fullText });
        }

        // Return the final array of items
        return items;

    } catch (error) {
        // This catches errors thrown anywhere within the try block (fetch, processing, etc.)
        console.error(`[${functionName}] CRITICAL ERROR in stream processing:`, error);
        // Attempt to signal the error via the callback
        if (onChunk && typeof onChunk === 'function') {
            try {
                onChunk({ type: 'error', error: error.message || 'Unknown stream error' });
            } catch (callbackError) {
                console.error(`[${functionName}] Error occurred *while* trying to signal stream error via onChunk callback:`, callbackError);
            }
        }
        // Re-throw the error so the calling code (e.g., WorkflowEngine) knows about the failure
        throw error;
    }
};