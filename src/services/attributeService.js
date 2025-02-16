// /src/services/attributeService.js

// import { fetchGlobalAttributes, fetchRatedAttributesForItem } from '../../components/dashboard/DevPanel';
import { LogService } from './logService';

/**
 * Fetches global attributes for a domain based on a sample of domain members.
 * 
 * @param {string} domain - The domain name (e.g., "mexican food").
 * @param {Array<string>} sampleMembers - An array of sample domain members (e.g., ["taco", "burrito"]).
 * @returns {Promise<object>} - Resolves with the parsed JSON response containing global attributes.
 */
export async function fetchGlobalAttributes(domain, sampleMembers) {

    // const endpoint = 'https://us-central1-dehls-deluxo-engine.cloudfunctions.net/vector-projector-attributes-v2';
    const endpoint = 'https://us-central1-zippy-purpose-257102.cloudfunctions.net/vector-projector-attributes-v2';
    const payload = {
      domain,
      sampleMembers,
      instructionKey: 'globalAttribute'
    };
  
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch global attributes for domain: ${domain}`);
    }
  
    // Read the response body as text (SSE stream).
    const responseText = await response.text();
  

    LogService.log(`Attribute result: ${JSON.stringify(responseText)}`, 'info');


    // Extract the final JSON message from the SSE stream.
    const lines = responseText.split('\n').filter(line => line.startsWith('data:'));
    let jsonText = '';
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
      throw new Error('Failed to parse global attributes JSON response');
    }
  }
  
  /**
   * Fetches rated attributes for a single domain member based on global attributes.
   * 
   * @param {string} member - The individual domain member (e.g., "taco").
   * @param {object} globalAttributes - The global attributes object previously fetched.
   * @returns {Promise<object>} - Resolves with the parsed JSON response containing rated attributes.
   */
  export async function fetchRatedAttributesForItem(member, globalAttributes) {
    // Adjust the endpoint URL as needed.
    // const endpoint = 'https://us-central1-dehls-deluxo-engine.cloudfunctions.net/vector-projector-attributes-v2';
    const endpoint = 'https://us-central1-zippy-purpose-257102.cloudfunctions.net/vector-projector-attributes-v2';
    const payload = {
      member,
      globalAttributes,
      instructionKey: 'rateAttributes' // This instructs the cloud function to return attribute ratings.
    };
  
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  
    if (!response.ok) {
      throw new Error(`Failed to fetch rated attributes for member: ${member}`);
    }
  
    const responseText = await response.text();

    LogService.log(`Rating result: ${JSON.stringify(responseText)}`, 'info');
  
    // Extract the final JSON message from the SSE stream.
    const lines = responseText.split('\n').filter(line => line.startsWith('data:'));
    let jsonText = '';
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineContent = lines[i].replace('data: ', '').trim();
      if (lineContent !== '[DONE]' && lineContent.length > 0) {
        jsonText = lineContent;
        break;
      }
    }
  
    try {
      const parsed = JSON.parse(jsonText);
      LogService.log(`Parsed rating result: ${JSON.stringify(parsed)}`, 'info');
      return parsed;
    } catch (err) {
      throw new Error('Failed to parse rated attributes JSON response');
    }
  }
  