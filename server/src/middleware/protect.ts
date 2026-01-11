import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import prisma from '../lib/prisma';
import AppError from '../utils/AppError';
import catchAsync from '../utils/catchAsync';

export const protect = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError('You are not logged in. Please log in to get access.', 401)
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return next(new AppError('Invalid or expired token.', 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }

    req.user = user;
    next();
  }
);
