// /src/services/attributeService.js

/**
 * Calls the attribute cloud function endpoint and returns the aggregated JSON.
 * The function expects a payload with { item, instructionKey }.
 *
 * @param {string} item - The domain item for which attributes are needed.
 * @param {string} instructionKey - Should be "attribute".
 * @param {function} onChunk - Callback to process each SSE chunk.
 * @returns {Promise<object>} - The final attributes JSON (e.g. { attributes: { ... } })
 */
export async function fetchAttributesStream(item, instructionKey, onChunk) {
    // Adjust this URL as necessary based on your deployment
    const endpoint = 'https://us-central1-dehls-deluxo-engine.cloudfunctions.net/vector-projector-attributes-v2';
  
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, instructionKey }),
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch attributes for item: ${item}`);
    }
  
    // Process the SSE stream.
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let aggregatedText = '';
  
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunkText = decoder.decode(value, { stream: true });
      // SSE data comes in lines starting with "data: "
      chunkText.split('\n').forEach(line => {
        if (line.startsWith('data: ')) {
          const data = line.replace('data: ', '').trim();
          // If the chunk signals completion, ignore further processing
          if (data === '[DONE]') return;
          // Pass the chunk to a callback for live UI updates if desired
          if (onChunk) onChunk(data);
          aggregatedText += data;
        }
      });
    }
  
    // Try parsing the aggregated text as JSON.
    try {
      const parsed = JSON.parse(aggregatedText);
      return parsed; // expected to be like { attributes: { ... } }
    } catch (e) {
      throw new Error('Failed to parse attribute JSON response');
    }
  }
  