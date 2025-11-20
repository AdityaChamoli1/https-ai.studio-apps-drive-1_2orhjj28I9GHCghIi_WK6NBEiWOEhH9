
import { memorySaveTool, memoryReadTool, calculatorTool, imageGenerationTool, webSearchTool, safeEvaluate } from "./toolDefinitions";
import { Message, Sender, ToolCallInfo, GroundingSource } from "../types";

// Accessing the memory from localStorage for the 'read_from_memory' tool
const getMemory = (key: string): string => {
  const mem = localStorage.getItem('nexus_agent_memory');
  if (!mem) return "Nothing found in memory.";
  const parsed = JSON.parse(mem);
  return parsed[key] || "Key not found in memory.";
};

// Saving to localStorage for the 'save_to_memory' tool
const saveMemory = (key: string, value: string): string => {
  const mem = localStorage.getItem('nexus_agent_memory');
  const parsed = mem ? JSON.parse(mem) : {};
  parsed[key] = value;
  localStorage.setItem('nexus_agent_memory', JSON.stringify(parsed));
  return `Saved to memory: ${key} = ${value}`;
};

// Wikipedia Search Implementation (Fallback for OpenRouter Web Access)
const performWebSearch = async (query: string): Promise<string> => {
  try {
    const endpoint = `https://en.wikipedia.org/w/api.php?action=query&list=search&prop=info&inprop=url&utf8=&format=json&origin=*&srlimit=3&srsearch=${encodeURIComponent(query)}`;
    const response = await fetch(endpoint);
    const data = await response.json();
    
    if (data.query && data.query.search && data.query.search.length > 0) {
      return data.query.search.map((result: any) => 
        `Title: ${result.title}\nSnippet: ${result.snippet.replace(/<[^>]*>/g, '')}`
      ).join('\n\n');
    }
    return "No results found for this query.";
  } catch (error) {
    return "Error performing web search.";
  }
};

export const generateAgentResponse = async (
  history: Message[],
  userMessage: string,
  apiKey: string,
  onToolStart: (toolName: string) => void,
  onToolEnd: () => void
): Promise<{ 
  text: string; 
  toolCalls: ToolCallInfo[]; 
  groundingSources: GroundingSource[];
  generatedImages: string[];
}> => {
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please enter your OpenRouter API Key in settings.");
  }

  // Current Time Context
  const now = new Date();
  const timeString = now.toLocaleString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: 'numeric', 
    second: 'numeric'
  });

  const systemInstruction = `
You are an Advanced AI Agent named "Nexus", powered by the OpenRouter API.
Your goal is to provide accurate, fast, and helpful responses.

BEHAVIOR RULES:
- Always think step by step.
- Use tools efficiently.
- Provide clear and human-friendly output.
- If a user writes in Hindi, answer in Hindi.
- If a user writes in English, answer in English.
- Always stay concise unless the user asks for detailed explanation.

TOOLS AVAILABLE:
1. Memory Tool: Store and recall user preferences.
2. Calculator Tool: For math calculations.
3. Pika Image Gen: Use 'pika_generate_image' when the user wants to create visuals.
4. Time & Date: The current system time is: ${timeString}. Use this for all time-based queries.
5. Web Access: Use 'web_search' when the user asks for "latest", "search", "verify", "news".

If the user asks about time, use the provided system time.
If the user provides information to remember, use the 'save_to_memory' tool.
If the user asks a math question, use 'calculate_expression'.
If the user asks to generate an image, use 'pika_generate_image'.
`;

  // Map internal messages to OpenAI format
  const messages = [
    { role: 'system', content: systemInstruction },
    ...history
      .filter(m => !m.isError) // Filter out error messages
      .map(m => ({
        role: m.role === Sender.AI ? 'assistant' : m.role === Sender.USER ? 'user' : 'system',
        content: m.content,
        // Map existing tool calls if any (simplified for context preservation)
        name: m.role === Sender.USER ? undefined : 'nexus_ai'
      }))
  ];

  // Add current user message
  messages.push({ role: 'user', content: userMessage, name: 'user' });

  // Define Tools in OpenAI format
  const tools = [
    { type: 'function', function: memorySaveTool },
    { type: 'function', function: memoryReadTool },
    { type: 'function', function: calculatorTool },
    { type: 'function', function: imageGenerationTool },
    { type: 'function', function: webSearchTool }
  ];

  const MODEL = 'google/gemini-2.0-flash-001'; // Using a Gemini model via OpenRouter
  
  let finalResponseText = "";
  const accumulatedToolCalls: ToolCallInfo[] = [];
  const accumulatedGrounding: GroundingSource[] = [];
  const generatedImages: string[] = [];

  let turnCount = 0;
  const MAX_TURNS = 5;
  let shouldContinue = true;

  while (shouldContinue && turnCount < MAX_TURNS) {
    turnCount++;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin, // Site URL for OpenRouter rankings
          "X-Title": "Nexus AI Agent"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: messages,
          tools: tools
        })
      });

      if (!response.ok) {
        // Handle Invalid Key - propagate specific error code
        if (response.status === 401 || response.status === 403) {
           throw new Error("AUTH_ERROR");
        }

        const errorData = await response.json();
        throw new Error(`OpenRouter API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const choice = data.choices[0];
      const message = choice.message;

      // Append the model's response to history
      messages.push(message);

      if (message.content) {
        finalResponseText += message.content;
      }

      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolId = toolCall.id;
          const argsString = toolCall.function.arguments;
          let args = {};
          try {
            args = JSON.parse(argsString);
          } catch (e) {
            console.error("Failed to parse tool args", e);
          }

          onToolStart(toolName);
          let functionResult = "";

          // Execute Tool
          if (toolName === 'save_to_memory') {
            functionResult = saveMemory((args as any).key, (args as any).value);
          } else if (toolName === 'read_from_memory') {
            functionResult = getMemory((args as any).key);
          } else if (toolName === 'calculate_expression') {
            functionResult = safeEvaluate((args as any).expression);
          } else if (toolName === 'web_search') {
            functionResult = await performWebSearch((args as any).query);
            accumulatedGrounding.push({ 
              title: 'Wikipedia Search', 
              uri: `https://en.wikipedia.org/wiki/${encodeURIComponent((args as any).query)}` 
            });
          } else if (toolName === 'pika_generate_image') {
             // Using Pollinations.ai for generic image generation via URL
             const prompt = (args as any).prompt;
             const encodedPrompt = encodeURIComponent(prompt);
             // Use a random seed to ensure freshness
             const seed = Math.floor(Math.random() * 1000);
             const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&nologo=true`;
             
             generatedImages.push(imageUrl);
             functionResult = `Image generated successfully: ${imageUrl}`;
          }

          accumulatedToolCalls.push({
            toolName,
            args: args as Record<string, any>,
            result: functionResult
          });

          // Append Tool Result to messages
          messages.push({
            role: "tool",
            content: functionResult,
            tool_call_id: toolId,
            name: toolName
          } as any); // Cast to any because OpenAI types might vary slightly in different TS defs

          onToolEnd();
        }
      } else {
        shouldContinue = false;
      }

    } catch (error) {
      console.error("OpenRouter Service Error:", error);
      throw error;
    }
  }

  return {
    text: finalResponseText,
    toolCalls: accumulatedToolCalls,
    groundingSources: accumulatedGrounding,
    generatedImages
  };
};
