// src/services/devPanelService.js

import { generateText, LLM_PROVIDERS } from './llmProvider';

export const generateDomainItems = async (domain, model = MODELS.GPT35) => {
  try {
    const prompt = `List as many items as you can think of in the domain of ${domain}. 
                   Format the response as a comma-separated list.`;
    
    const result = await generateText(prompt, model);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    const items = result.text.split(',').map(item => item.trim());
    
    return {
      success: true,
      items,
      raw: result.text,
      model: result.model
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      raw: null,
      model: model
    };
  }
};