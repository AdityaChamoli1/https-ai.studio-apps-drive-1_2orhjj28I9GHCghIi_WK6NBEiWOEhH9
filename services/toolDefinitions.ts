
export const memorySaveTool = {
  name: 'save_to_memory',
  description: 'Saves a piece of information to the agent\'s long-term memory. Use this when the user asks you to remember something, or for important personal details (name, preferences).',
  parameters: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'A unique identifier key for this memory (e.g., "user_name", "favorite_color", "project_deadline").'
      },
      value: {
        type: 'string',
        description: 'The detailed information to store.'
      }
    },
    required: ['key', 'value']
  }
};

export const memoryReadTool = {
  name: 'read_from_memory',
  description: 'Retrieves a specific piece of information from memory using its key. Use this when you need to recall a specific detail you might have stored previously.',
  parameters: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'The key of the memory to retrieve.'
      }
    },
    required: ['key']
  }
};

export const calculatorTool = {
  name: 'calculate_expression',
  description: 'Evaluates a mathematical expression. Use this for any math queries, budgets, conversions, or complex calculations.',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate (e.g., "1200 * 0.15", "(500 + 200) / 12").'
      }
    },
    required: ['expression']
  }
};

export const imageGenerationTool = {
  name: 'pika_generate_image',
  description: 'Generates an image based on a text description. Use this whenever the user asks to create, generate, draw, or show an image. Also use this if the user explicitly mentions "Pika".',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The visual description of the image to generate.'
      }
    },
    required: ['prompt']
  }
};

export const webSearchTool = {
  name: 'web_search',
  description: 'Searches the web for information. Use this for "latest", "search", "find", "check online", "verify".',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to find information about.'
      }
    },
    required: ['query']
  }
};

// Helper to safely evaluate math
export const safeEvaluate = (expression: string): string => {
  try {
    // Basic sanitization to allow only math characters
    if (!/^[0-9+\-*/().\s%^]+$/.test(expression)) {
      return "Error: Invalid characters in expression";
    }
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${expression}`)();
    return String(result);
  } catch (e) {
    return "Error calculating expression";
  }
};
