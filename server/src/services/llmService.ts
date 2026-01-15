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

      // 1. Fetch files (Limit to 3000 to prevent token overflow, but sorted by modifiedTime)
      const maxFiles = 3000;
      const files = await prisma.file.findMany({
        where: { userId },
        orderBy: { modifiedTime: 'desc' },
        take: maxFiles,
        select: {
          name: true,
          mimeType: true,
          size: true,
          modifiedTime: true,
          ownerName: true,
          isStarred: true,
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
        // Compact CSV-style context
        const header = "Name,Type,Size,Date,Owner,Starred";
        const filesString = files.map(f => {
          const starred = f.isStarred ? '*' : '';
          // Escape quotes in name if necessary
          const name = f.name.includes(',') ? `"${f.name}"` : f.name;
          return `${name},${f.mimeType},${f.size},${f.modifiedTime.toISOString().split('T')[0]},${f.ownerName},${starred}`;
        }).join('\n');

        const truncationNote = files.length === maxFiles 
          ? `\n(List truncated to ${maxFiles} most recent files)` 
          : '';

        systemPrompt = 
          `You are Cortex, an intelligent Drive assistant.
           Here is the list of the user's files (CSV format: ${header}):
           ${filesString}
           ${truncationNote}
           
           Answer the user's question based strictly on this data.
           
           Guidelines:
           - The data is in CSV format: Name, Type, Size (bytes), Date (YYYY-MM-DD), Owner, Starred (*).
           - If asked about 'largest file', compare the Size column.
           - If asked about 'recent', check the Date column.
           - If asked about 'distribution' of types, count the Type column.
           - If asked about 'distribution' of dates, group by Month/Year.
           - If asked about 'starred', look for the '*' in the Starred column.
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

      // 3. Call OpenAI Responses API
      // @ts-ignore - bypassing strict type check for experimental API
      const response: any = await client.responses.create({
        model: this.model,
        input: inputs,
        max_output_tokens: 8000,
      });

      // Check if response is wrapped in a 'data' property (common in some client configs)
      // @ts-ignore
      const actualResponse = response.data || response;

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
        
        // Log incomplete details if present
        if (actualResponse.incomplete_details) {
            console.error('Incomplete Details:', JSON.stringify(actualResponse.incomplete_details));
        }

        // Brute force: Search for any string property that looks like a response
        const skipKeys = ['id', 'object', 'created_at', 'status', 'model', 'system_fingerprint', 'usage', 'metadata'];
        
        for (const [key, value] of Object.entries(actualResponse)) {
            if (skipKeys.includes(key)) continue;
            
            if (typeof value === 'string' && value.length > 20) { // arbitrary length to avoid short status codes
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