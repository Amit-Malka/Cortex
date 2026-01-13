import OpenAI from 'openai';
import prisma from '../lib/prisma';
import AppError from '../utils/AppError';

// Define types for the Responses API
interface ResponseCreateOptions {
  model: string;
  input: Array<{ role: string; content: string }>;
  max_output_tokens?: number;
  temperature?: number;
}

interface ResponseOutput {
  output_text: string;
  refusal?: string;
  [key: string]: any;
}

// Extend the OpenAI client type
type ExtendedOpenAI = OpenAI & {
  responses: {
    create: (options: ResponseCreateOptions) => Promise<ResponseOutput>;
  };
};

class LlmService {
  private client: ExtendedOpenAI | null = null;
  private model: string;

  constructor() {
    this.model = process.env.OPENAI_MODEL || 'gpt-5-nano';
  }

  private getClient(): ExtendedOpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new AppError(
          'OpenAI API key is not configured. Please set OPENAI_API_KEY in environment variables.',
          500
        );
      }

      this.client = new OpenAI({
        apiKey,
        timeout: 60000, // 60 seconds timeout
      }) as ExtendedOpenAI;
    }

    return this.client;
  }

  async generateChatResponse(userId: string, userMessage: string, context?: string): Promise<string> {
    try {
      const client = this.getClient();

      // 1. Fetch files (Limit to 100 most recent to avoid context overflow)
      const files = await prisma.file.findMany({
        where: { userId },
        orderBy: { modifiedTime: 'desc' },
        take: 100,
        select: {
          name: true,
          mimeType: true,
          size: true,
          modifiedTime: true,
          ownerName: true,
          lastModifierName: true,
          isStarred: true,
          isShared: true,
        },
      });

      // 2. Construct System Prompt
      let systemPrompt = '';
      if (files.length === 0) {
        systemPrompt = 
          "You are Cortex, an intelligent Drive assistant. " +
          "The user currently has no files in their drive. " +
          "If they ask about files, politely inform them: 'I don't see any files yet. Please sync your drive.'";
      } else {
        const filesString = files.map(f => {
          const owner = f.ownerName ? ` | Owner: ${f.ownerName}` : '';
          const modifier = f.lastModifierName ? ` | Modified By: ${f.lastModifierName}` : '';
          const starred = f.isStarred ? ' | [STARRED]' : '';
          const shared = f.isShared ? ' | [SHARED]' : '';
          return `[${f.name} | ${f.mimeType} | ${f.size} bytes | Modified: ${f.modifiedTime.toISOString().split('T')[0]}${owner}${modifier}${starred}${shared}]`;
        }).join('\n');

        systemPrompt = 
          `You are Cortex, an intelligent Drive assistant.
           Here is the list of the user's most recent files (max 100):
           ${filesString}
           
           Answer the user's question based strictly on this data.
           
           Guidelines:
           - If asked about 'largest file', compare the sizes provided.
           - If asked about 'recent', check modifiedTime.
           - If asked about 'distribution' of types, count the mimeTypes.
           - If asked about 'distribution' of dates, group files by MONTH and YEAR (e.g., "3 files in Dec 2025").
           - If asked about 'owners', count the unique names in the 'Owner' field. If everyone is 'Me', say so.
           - If asked about 'starred' or 'important' files, look for [STARRED].
           - If asked about 'shared' files, look for [SHARED].
           - If asked about who changed a file, look at 'Modified By'.
           - Do not hallucinate files not in this list.
           - Be concise and helpful.`;
      }

      const inputs = [
        {
          role: 'system',
          content: systemPrompt,
        },
      ];

      if (context) {
        inputs.push({
          role: 'system',
          content: `Additional Context: ${context}`,
        });
      }

      inputs.push({
        role: 'user',
        content: userMessage,
      });

      console.log(`Sending request to OpenAI ${this.model} with ${inputs.length} messages.`);

      // 3. Call OpenAI Responses API
      // @ts-ignore - bypassing strict type check for experimental API
      const response: any = await client.responses.create({
        model: this.model,
        input: inputs,
        max_output_tokens: 8000,
      });

      console.log('Raw OpenAI Response Keys:', Object.keys(response));

      // Check if response is wrapped in a 'data' property (common in some client configs)
      // @ts-ignore
      const actualResponse = response.data || response;
      if (response.data) {
          console.log('Response is wrapped in .data. Keys:', Object.keys(response.data));
      }

      // Check for API-level errors returned in the success body
      if (actualResponse.error) {
        console.error('OpenAI Response Error Object:', JSON.stringify(actualResponse.error, null, 2));
        throw new AppError(`OpenAI Model Error: ${actualResponse.error.message || JSON.stringify(actualResponse.error)}`, 500);
      }

      // 4. Robust Response Parsing
      let reply = actualResponse.output_text;

      // Check for explicit refusal
      if (actualResponse.refusal) {
        return `I cannot answer that: ${actualResponse.refusal}`;
      }

      // Check nested structures (common in beta APIs)
      if (!reply) {
        if (actualResponse.output && typeof actualResponse.output === 'string') reply = actualResponse.output;
        else if (actualResponse.text && typeof actualResponse.text === 'string') reply = actualResponse.text;
        else if (actualResponse.content && typeof actualResponse.content === 'string') reply = actualResponse.content;
      }

      // Deep check for output array structure
      if (!reply && Array.isArray(actualResponse.output) && actualResponse.output.length > 0) {
        // Sometimes output is an array of objects with 'text' or 'content'
        const first = actualResponse.output[0];
        reply = first.text || first.content || (first.message && first.message.content);
      }

      // Legacy/Fallback check (standard chat completion structure)
      if (!reply && actualResponse.choices && actualResponse.choices.length > 0) {
         reply = actualResponse.choices[0].message?.content;
      }

      if (!reply) {
        console.error('Standard parsing failed. Attempting brute-force search for content...');
        console.log('Full Response Object (First 500 chars):', JSON.stringify(actualResponse).substring(0, 500));
        
        // Log incomplete details if present
        if (actualResponse.incomplete_details) {
            console.error('Incomplete Details:', JSON.stringify(actualResponse.incomplete_details));
        }

        // Brute force: Search for any string property that looks like a response
        const skipKeys = ['id', 'object', 'created_at', 'status', 'model', 'system_fingerprint', 'usage', 'metadata'];
        
        for (const [key, value] of Object.entries(actualResponse)) {
            if (skipKeys.includes(key)) continue;
            
            if (typeof value === 'string' && value.length > 20) { // arbitrary length to avoid short status codes
                console.log(`Found candidate content in key: '${key}'`);
                reply = value;
                break; 
            }
        }
      }

      if (!reply) {
        // Explicitly check if output_text was present but empty
        if (actualResponse.hasOwnProperty('output_text')) {
            console.error(`output_text key exists but value is: "${actualResponse.output_text}" (type: ${typeof actualResponse.output_text})`);
        }
        
        const keys = Object.keys(actualResponse).join(', ');
        throw new AppError(`No response text found. Status: ${actualResponse.status}. Keys: ${keys}`, 500);
      }

      return reply;

    } catch (error) {
      console.error('LLM Service Error:', error);

      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new AppError('Invalid OpenAI API key', 401);
        }
        if (error.status === 429) {
          throw new AppError('OpenAI API rate limit exceeded. Please try again later.', 429);
        }
        if (error.status === 500) {
          throw new AppError('OpenAI service error. Please try again later.', 503);
        }
        throw new AppError(`OpenAI API error: ${error.message}`, error.status || 500);
      }

      if (error instanceof AppError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(`Failed to generate response: ${errorMessage}`, 500);
    }
  }
}

export default new LlmService();