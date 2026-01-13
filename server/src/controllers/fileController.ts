import { Request, Response } from 'express';
import fileService from '../services/fileService';
import driveService from '../services/driveService';
import prisma from '../lib/prisma';
import GoogleClient from '../utils/googleClient';
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

export const deleteFile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user || !req.user.googleRefreshToken) {
    throw new AppError('User not authenticated or Google Drive not connected', 401);
  }

  const { id } = req.params;

  const file = await prisma.file.findUnique({
    where: {
      id_userId: {
        id,
        userId: req.user.id,
      },
    },
  });

  if (!file) {
    throw new AppError('File not found', 404);
  }

  // Get OAuth2 Client
  const googleClient = new GoogleClient();
  const { access_token } = await googleClient.refreshAccessToken(req.user.googleRefreshToken);
  googleClient.setCredentials({ access_token });
  const oauth2Client = googleClient.getOAuth2Client();

  // Delete from Drive
  await driveService.deleteFile(oauth2Client, file.id);

  // Delete from DB
  await prisma.file.delete({
    where: {
      id_userId: {
        id,
        userId: req.user.id,
      },
    },
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

export const updateFile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user || !req.user.googleRefreshToken) {
    throw new AppError('User not authenticated or Google Drive not connected', 401);
  }

  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    throw new AppError('New name is required', 400);
  }

  const file = await prisma.file.findUnique({
    where: {
      id_userId: {
        id,
        userId: req.user.id,
      },
    },
  });

  if (!file) {
    throw new AppError('File not found', 404);
  }

  // Get OAuth2 Client
  const googleClient = new GoogleClient();
  const { access_token } = await googleClient.refreshAccessToken(req.user.googleRefreshToken);
  googleClient.setCredentials({ access_token });
  const oauth2Client = googleClient.getOAuth2Client();

  // Rename in Drive
  await driveService.renameFile(oauth2Client, file.id, name);

  // Update in DB
  const updatedFile = await prisma.file.update({
    where: {
      id_userId: {
        id,
        userId: req.user.id,
      },
    },
    data: {
      name,
      modifiedTime: new Date(),
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      file: updatedFile,
    },
  });
});
