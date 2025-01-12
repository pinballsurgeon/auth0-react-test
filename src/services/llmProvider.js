// src/services/llmProvider.js

const GCP_FUNCTION_URL = 'https://us-central1-dehls-deluxo-engine.cloudfunctions.net/vector-projector-server-2';

export const MODELS = {
  GPT35: 'gpt-3.5-turbo',
  GPT4: 'gpt-4',
  CLAUDE: 'claude-3-opus',
  GEMINI: 'gemini-pro'
};

export const generateDomainItems = async (domain, model = MODELS.GPT35) => {
  try {

    let domain = "Return just a list of lowercase, comma seperated list of domain members, as many as you can list out, no other explanation or details just an enormous all encompassing list of all members in the supplied domain, the domain requiring member listing is - sports" + domain;

    const response = await fetch(GCP_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, model })
    });

    if (!response.ok) {
      // Handle HTTP errors
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch data from server.');
    }

    const data = await response.json();
    return data;  // Return the structured data
  } catch (error) {
    // Handle network or parsing errors
    console.error('Error in generateDomainItems:', error);
    throw error;  // Propagate the error to be handled by the caller
  }
};
