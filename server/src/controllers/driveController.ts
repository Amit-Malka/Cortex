import { Request, Response } from 'express';
import driveService from '../services/driveService';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/AppError';

export const syncDrive = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401);
  }

  const count = await driveService.syncUserFiles(req.user.id);

  res.status(200).json({
    status: 'success',
    data: {
      message: 'Drive sync completed successfully',
      filesProcessed: count,
    },
  });
});
