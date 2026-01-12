import { Request, Response } from 'express';
import llmService from '../services/llmService';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/AppError';

interface ChatRequestBody {
  message: string;
  context?: string;
}

export const chat = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const { message, context } = req.body as ChatRequestBody;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new AppError('Message is required and must be a non-empty string', 400);
  }

  const reply = await llmService.generateChatResponse(message.trim(), context);

  res.status(200).json({
    status: 'success',
    data: {
      reply,
    },
  });
});
