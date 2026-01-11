import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';

export const getProfile = catchAsync(async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
});
