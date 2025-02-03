// /src/services/attributeService.js

/**
 * Fetches attributes for a given domain item via the attribute cloud function.
 * @param {string} item - The domain item for which attributes are needed.
 * @returns {Promise<object>} - Resolves with the parsed JSON response.
 */
export async function fetchAttributesForItem(item) {
    // Adjust the endpoint URL to match your deployment (relative URL if using proxy)
    const endpoint = '/cloudFunctions/handleAttributes';
  
    // Call the cloud function with a POST request.
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Include both item and the instructionKey ("attribute") as required by the function.
      body: JSON.stringify({ item, instructionKey: 'attribute' }),
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch attributes for item: ${item}`);
    }
  
    // Read the response body as text. Here we assume the cloud function returns a final JSON message.
    const responseText = await response.text();
  
    // Since the cloud function uses SSE, the text might contain multiple SSE data lines.
    // We'll extract the final JSON message. One approach is to split by line and find the last valid JSON line.
    const lines = responseText.split('\n').filter(line => line.startsWith('data:'));
    let jsonText = '';
    // Look for the last line that is not the "[DONE]" signal.
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineContent = lines[i].replace('data: ', '').trim();
      if (lineContent !== '[DONE]' && lineContent.length > 0) {
        jsonText = lineContent;
        break;
      }
    }
  
    try {
      const parsed = JSON.parse(jsonText);
      return parsed;
    } catch (err) {
      throw new Error('Failed to parse attribute JSON response');
    }
  }
  