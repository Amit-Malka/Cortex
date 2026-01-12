import { Request, Response } from 'express';
import fileService from '../services/fileService';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/AppError';

export const getFiles = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const result = await fileService.getUserFiles(req.user.id, req.query);

  res.status(200).json({
    status: 'success',
    data: {
      files: result.files,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: result.files.length,
      },
    },
  });
});

export const getStats = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const stats = await fileService.getUserStats(req.user.id);

  res.status(200).json({
    status: 'success',
    data: stats,
  });
});
