// src/services/llmProvider.js
// Based on the user's preferred "old version" structure, with essential fixes integrated.

// const GCP_FUNCTION_URL = 'https://us-central1-dehls-deluxo-engine.cloudfunctions.net/vector-projector-server-2';
const GCP_FUNCTION_URL = "https://us-central1-zippy-purpose-257102.cloudfunctions.net/vector-projector-server-2";

export const MODELS = {
  GPT35: 'gpt-3.5-turbo',
  GPT4: 'gpt-4',
  CLAUDE: 'claude-3-opus', // Note: Verify backend support
  GEMINI: 'gemini-pro'     // Note: Verify backend support
};

/**
 * Fetches a stream of domain items from the backend using SSE. (Modified Original Structure)
 * @param {string} domain The domain topic to generate items for.
 * @param {string} model The LLM model to use (from MODELS enum).
 * @param {function} onChunk Callback function triggered for each data chunk received.
 *                           Receives the text chunk as a string. May receive a final status message.
 * @returns {Promise<string[]>} A promise that resolves with the final array of items when the stream is complete.
 * @throws {Error} If fetching or processing fails.
 */
export const generateDomainItemsStream = async (domain, model = MODELS.GEMINI, onChunk) => {
    const functionName = 'generateDomainItemsStream (modified original)';
    let fullText = ''; // Accumulate text chunks
    let streamFinished = false; // Flag to signal when [DONE] is seen

    try {
        console.log(`[${functionName}] Starting stream for domain: "${domain}" with model: "${model}"`);
        const response = await fetch(GCP_FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                domain,
                model,
                instructionKey: 'domain_list'
            })
        });

        // --- Basic error check from original ---
        if (!response.ok) {
            // Attempt to get more info, but keep error simple as original
             let errorBody = `Server request failed with status: ${response.status}`;
             try { errorBody = await response.text(); } catch {}
             console.error(`[${functionName}] Fetch error: ${response.status}. Body: ${errorBody}`);
            throw new Error('Failed to fetch data from server.'); // Original error message
        }

        if (!response.body) {
            throw new Error(`[${functionName}] Response body is missing.`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();

            // Exit loop ONLY when the reader signals it's done
            if (done) {
                 console.log(`[${functionName}] Reader signaled 'done'. Exiting read loop.`);
                 break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {

                if (!line.trim()) {
                    continue; // Skip empty lines
                }

                // --- FIX: Check for [DONE] signal BEFORE parsing ---
                if (line === 'data: [DONE]') {
                    console.log(`[${functionName}] SSE stream finished signal ('data: [DONE]') received.`);
                    streamFinished = true; // Set flag
                    continue; // Skip processing this line further
                }
                // --- End of [DONE] check ---

                if (line.startsWith('data: ')) {
                    const jsonString = line.slice(6).trim();
                    if (!jsonString) continue; // Skip 'data: ' only lines

                    try {
                        const parsedData = JSON.parse(jsonString); // Renamed 'data' to 'parsedData' for clarity

                        // --- Original Logic Applied to Parsed Data ---
                        // NOTE: Original code compared parsedData === '[DONE]' which wouldn't work.
                        // The explicit check is now done *before* parsing.

                        if (parsedData.error) {
                            // Log the server-reported error and throw
                            console.error(`[${functionName}] Server reported error in stream:`, parsedData.error);
                            throw new Error(parsedData.error);
                        }

                        // Check if 'chunk' exists (original code might have implicitly handled typeof)
                        if (typeof parsedData.chunk === 'string') {
                            fullText += parsedData.chunk;
                            // Call callback exactly like original
                            if (onChunk && typeof onChunk === 'function') {
                                onChunk(parsedData.chunk);
                            }
                        } else {
                            // Optional: Warn if JSON received isn't the expected chunk/error format
                             console.warn(`[${functionName}] Received unexpected JSON structure:`, parsedData);
                        }
                        // --- End of Original Logic ---

                    } catch (e) {
                        // --- Improved logging for parsing errors ---
                        if (e instanceof SyntaxError) {
                             console.error(`[${functionName}] Error parsing SSE JSON:`, e);
                             console.error(`[${functionName}] --- Problematic JSON string: "${jsonString}"`);
                             // Decide if parsing errors are fatal - original might have just logged
                             // throw new Error('Failed to parse stream data.'); // Optionally re-throw
                        } else {
                             console.error(`[${functionName}] Error processing parsed data:`, e);
                             // throw e; // Optionally re-throw other processing errors
                        }
                        // --- Original code just logged: console.error('Error parsing SSE data:', e); ---
                    }
                } else {
                     // Warn about unexpected lines like before
                     console.warn(`[${functionName}] Ignoring unexpected/non-standard SSE line: "${line}"`);
                }
            } // End for loop (processing lines)
        } // End while loop (reading stream)

        // --- Stream processing complete ---
        console.log(`[${functionName}] Stream processing finished.`);

        // --- Replicate original completion logic (calculating items) ---
        // This happens *after* the loop, ensuring all data is processed
        const items = fullText.split(',')
                           .map(item => item.trim())
                           .filter(Boolean); // Remove empty strings

        console.log(`[${functionName}] Extracted ${items.length} items.`);

        // --- Optional: Send a final status message similar to original, if needed by caller ---
        // Note: The original 'return' inside the loop was problematic. This is safer.
         if (onChunk && typeof onChunk === 'function' && streamFinished) {
             try {
                 // Sending a simple string message like the original attempt
                 onChunk(`\n\n[${functionName}] Processing complete. Total items: ${items.length}`);
                 // OR send a structured message:
                 // onChunk({ type: 'finalStatus', itemCount: items.length, fullText: fullText });
             } catch (callbackError) {
                 console.error(`[${functionName}] Error calling onChunk with final status:`, callbackError);
             }
         }

        // --- Return the final items via the promise ---
        return items;

    } catch (error) {
        // --- Handle critical errors (fetch, thrown during processing) ---
        console.error(`[${functionName}] CRITICAL ERROR in stream processing:`, error);
         // Optional: Signal error via onChunk if possible
         if (onChunk && typeof onChunk === 'function') {
             try {
                 onChunk(`\n\n[${functionName}] ERROR: ${error.message}`);
                 // OR: onChunk({ type: 'error', error: error.message });
             } catch (callbackError) {
                console.error(`[${functionName}] Error calling onChunk during error handling:`, callbackError);
             }
         }
        // --- Re-throw the error like original ---
        throw error;
    }
};