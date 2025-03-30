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
                console.error(`[${functionName}] Failed to read error response body after non-OK fetch status (${response.status}). Read error:`, readError);
            }
            throw new Error(`[${functionName}] Server request failed. Status: ${response.status} ${response.statusText}. Body: ${errorBody}`);
        }

        if (!response.body) {
            throw new Error(`[${functionName}] Response body is missing after successful fetch status.`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();

            if (done) {
                console.log(`[${functionName}] Reader signaled 'done'. Processing potential remaining buffer and exiting read loop.`);
                if (buffer.trim()) {
                    console.warn(`[${functionName}] Processing remaining buffer after stream ended (may indicate incomplete final message): "${buffer}"`);
                }
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {

                if (!line.trim()) {
                    continue;
                }

                if (line === 'data: [DONE]') {
                    console.log(`[${functionName}] SSE stream finished signal ('data: [DONE]') received.`);
                    continue;
                }

                if (line.startsWith('data: ')) {
                    const jsonString = line.slice(6).trim();

                    if (!jsonString) {
                        continue;
                    }

                    // --- FIX: Declare parsedData outside the try block ---
                    let parsedData = null;
                    // ----------------------------------------------------

                    try {
                        // --- FIX: Assign to the existing variable ---
                        parsedData = JSON.parse(jsonString);
                        // -------------------------------------------

                        if (parsedData.error) {
                            console.error(`[${functionName}] Application error received from server stream:`, parsedData.error);
                            throw new Error(`Server error during stream: ${parsedData.error}`);
                        }
                        else if (typeof parsedData.chunk === 'string') {
                            fullText += parsedData.chunk;
                            if (onChunk && typeof onChunk === 'function') {
                                onChunk(parsedData.chunk);
                            }
                        }
                        else {
                            console.warn(`[${functionName}] Received data object without expected "chunk" (string) or "error" field. Data:`, parsedData);
                        }

                    } catch (e) {
                        if (e instanceof SyntaxError) {
                            console.error(`[${functionName}] FATAL: Error parsing SSE JSON. Error:`, e);
                            console.error(`[${functionName}] --- Problematic JSON string was ---> ${jsonString} <---`);
                            throw new Error(`Failed to parse critical stream data: ${e.message}`);
                        } else {
                            // --- FIX: Now parsedData IS in scope here (if JSON.parse succeeded) ---
                            console.error(`[${functionName}] Error processing parsed SSE data object. Error:`, e);
                            // Log the data that caused the processing error
                            console.error(`[${functionName}] --- Parsed data object was --->`, parsedData, '<---'); // Line 149 (now correct)
                            // -------------------------------------------------------------------
                            throw new Error(`Failed processing stream data object: ${e.message}`);
                        }
                    }
                } else {
                    console.warn(`[${functionName}] Ignoring unexpected/non-standard SSE line (doesn't start with 'data:' or match '[DONE]'): "${line}"`);
                }
            } // End for loop (processing lines)
        } // End while loop (reading stream)

        console.log(`[${functionName}] Stream processing finished. Finalizing results.`);
        const items = fullText.split(',')
                           .map(item => item.trim())
                           .filter(Boolean);
        console.log(`[${functionName}] Extracted ${items.length} items.`);

        if (onChunk && typeof onChunk === 'function') {
            onChunk({ type: 'complete', items: items, fullText: fullText });
        }

        return items;

    } catch (error) {
        console.error(`[${functionName}] CRITICAL ERROR in stream processing:`, error);
        if (onChunk && typeof onChunk === 'function') {
            try {
                onChunk({ type: 'error', error: error.message || 'Unknown stream error' });
            } catch (callbackError) {
                console.error(`[${functionName}] Error occurred *while* trying to signal stream error via onChunk callback:`, callbackError);
            }
        }
        throw error;
    }
};