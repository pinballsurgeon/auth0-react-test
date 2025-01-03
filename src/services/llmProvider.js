// src/services/llmProvider.js

export const LLM_PROVIDERS = {
    GPT3: 'gpt-3.5-turbo',
    GPT4: 'gpt-4',
    CLAUDE: 'claude-3-opus',
    MISTRAL: 'mistral-medium',
    GEMINI: 'gemini-pro'
  };
  
  export const generateText = async (prompt, model = LLM_PROVIDERS.GPT3) => {
    try {
      const response = await fetch('/api/llm/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      return {
        success: true,
        text: data.response,
        model: model
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        model: model
      };
    }
  };