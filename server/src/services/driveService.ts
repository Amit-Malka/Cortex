import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../lib/prisma';
import GoogleClient from '../utils/googleClient';
import AppError from '../utils/AppError';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  owners?: Array<{
    displayName?: string;
    emailAddress?: string;
  }>;
}

class DriveService {
  private googleClient: GoogleClient;

  constructor() {
    this.googleClient = new GoogleClient();
  }

  async deleteFile(oauth2Client: OAuth2Client, fileId: string): Promise<void> {
    const drive = google.drive({
      version: 'v3',
      auth: oauth2Client,
    });

    try {
      await drive.files.delete({
        fileId,
      });
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw new AppError('Failed to delete file from Google Drive', 500);
    }
  }

  async renameFile(oauth2Client: OAuth2Client, fileId: string, newName: string): Promise<void> {
    const drive = google.drive({
      version: 'v3',
      auth: oauth2Client,
    });

    try {
      await drive.files.update({
        fileId,
        requestBody: {
          name: newName,
        },
      });
    } catch (error) {
      console.error('Error renaming file in Google Drive:', error);
      throw new AppError('Failed to rename file in Google Drive', 500);
    }
  }

  async syncUserFiles(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleRefreshToken: true },
    });

    if (!user || !user.googleRefreshToken) {
      throw new AppError('Google Drive not connected. Please authenticate again.', 401);
    }

    const { access_token } = await this.googleClient.refreshAccessToken(
      user.googleRefreshToken
    );

    this.googleClient.setCredentials({ access_token });

    const drive = google.drive({
      version: 'v3',
      auth: this.googleClient.getOAuth2Client(),
    });

    let allFiles: DriveFile[] = [];
    let pageToken: string | undefined;

    do {
      const response = await drive.files.list({
        pageSize: 100,
        pageToken,
        fields: 'nextPageToken, files(id, name, mimeType, size, webViewLink, createdTime, modifiedTime, owners)',
      });

      const files = response.data.files as DriveFile[];
      if (files && files.length > 0) {
        allFiles = allFiles.concat(files);
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    if (allFiles.length === 0) {
      return 0;
    }

    const upsertOperations = allFiles.map(file => {
      const owner = file.owners?.[0];
      
      return prisma.file.upsert({
        where: {
          id_userId: {
            id: file.id,
            userId,
          },
        },
        create: {
          id: file.id,
          userId,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size ? BigInt(file.size) : BigInt(0),
          webViewLink: file.webViewLink || '',
          ownerEmail: owner?.emailAddress || '',
          ownerName: owner?.displayName || '',
          createdTime: file.createdTime ? new Date(file.createdTime) : new Date(),
          modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
        },
        update: {
          name: file.name,
          mimeType: file.mimeType,
          size: file.size ? BigInt(file.size) : BigInt(0),
          webViewLink: file.webViewLink || '',
          ownerEmail: owner?.emailAddress || '',
          ownerName: owner?.displayName || '',
          modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
        },
      });
    });

    await prisma.$transaction(upsertOperations);

    await prisma.user.update({
      where: { id: userId },
      data: { lastSyncAt: new Date() },
    });

    return allFiles.length;
  }
}

export default new DriveService();
