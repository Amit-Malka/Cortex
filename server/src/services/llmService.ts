import OpenAI from 'openai';
import AppError from '../utils/AppError';

class LlmService {
  private client: OpenAI | null = null;
  private model: string;
  private systemPrompt: string;

  constructor() {
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
    this.systemPrompt = 
      "You are Cortex, an intelligent assistant. You have access to the user's file metadata. " +
      "Use the provided context to answer questions.";
  }

  private getClient(): OpenAI {
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
      });
    }

    return this.client;
  }

  async generateChatResponse(userMessage: string, context?: string): Promise<string> {
    try {
      const client = this.getClient();

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: this.systemPrompt,
        },
      ];

      if (context) {
        messages.push({
          role: 'system',
          content: `Context: ${context}`,
        });
      }

      messages.push({
        role: 'user',
        content: userMessage,
      });

      const response = await client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const reply = response.choices[0]?.message?.content;

      if (!reply) {
        throw new AppError('No response generated from AI model', 500);
      }

      return reply;
    } catch (error) {
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

      throw new AppError('Failed to generate response', 500);
    }
  }
}

export default new LlmService();
