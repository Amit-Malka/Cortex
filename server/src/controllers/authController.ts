import { Request, Response, NextFunction } from 'express';
import authService from '../services/authService';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/AppError';

export const googleAuth = catchAsync(async (_req: Request, res: Response) => {
  const authUrl = authService.getAuthUrl();
  
  res.redirect(authUrl);
});

export const googleCallback = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return next(new AppError('Authorization code is missing', 400));
    }

    const result = await authService.handleLogin(code);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}?token=${result.token}`);
  }
);
