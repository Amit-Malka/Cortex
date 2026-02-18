import { describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('../../lib/prisma');
jest.mock('../../utils/googleClient');

const mockFilesList = jest.fn();
const mockFilesDelete = jest.fn();
const mockFilesUpdate = jest.fn();

jest.mock('googleapis', () => ({
  google: {
    drive: jest.fn().mockReturnValue({
      files: {
        list: (...args: any[]) => mockFilesList(...args),
        delete: (...args: any[]) => mockFilesDelete(...args),
        update: (...args: any[]) => mockFilesUpdate(...args),
      },
    }),
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: jest.fn(),
        getToken: jest.fn(),
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn(),
      })),
    },
  },
}));

import prisma from '../../lib/prisma';
import GoogleClient from '../../utils/googleClient';
import driveService from '../../services/driveService';
import { OAuth2Client } from 'google-auth-library';

const MockGoogleClient = GoogleClient as jest.MockedClass<typeof GoogleClient>;

const makeDriveFile = (id: string) => ({
  id,
  name: `File ${id}.pdf`,
  mimeType: 'application/pdf',
  size: '1024',
  webViewLink: `https://drive.google.com/${id}`,
  createdTime: '2024-01-01T00:00:00.000Z',
  modifiedTime: '2024-06-01T00:00:00.000Z',
  owners: [{ displayName: 'Owner', emailAddress: 'owner@test.com' }],
  lastModifyingUser: { displayName: 'Modifier' },
  starred: false,
  shared: false,
});

describe('DriveService', () => {
  let mockGoogleClientInstance: any;
  const mockOAuth2Client = {} as OAuth2Client;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFilesList.mockReset();
    mockFilesDelete.mockReset();
    mockFilesUpdate.mockReset();

    mockGoogleClientInstance = {
      getAuthUrl: jest.fn(),
      getTokens: jest.fn(),
      getUserInfo: jest.fn(),
      refreshAccessToken: jest.fn().mockResolvedValue({ access_token: 'new-access', expiry_date: 9999 }),
      setCredentials: jest.fn(),
      getOAuth2Client: jest.fn().mockReturnValue(mockOAuth2Client),
    };

    MockGoogleClient.mockImplementation(() => mockGoogleClientInstance);
    (driveService as any).googleClient = mockGoogleClientInstance;
  });

  // ─── syncUserFiles ──────────────────────────────────────────────────────────

  describe('syncUserFiles', () => {
    it('throws 401 when user has no refresh token', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ googleRefreshToken: null });

      await expect(driveService.syncUserFiles('user-1')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('throws 401 when user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(driveService.syncUserFiles('user-1')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('returns 0 when Drive returns no files', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ googleRefreshToken: 'refresh-token' });
      mockFilesList.mockResolvedValue({ data: { files: [], nextPageToken: null } });

      const count = await driveService.syncUserFiles('user-1');

      expect(count).toBe(0);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('syncs a single page of files and returns the count', async () => {
      const driveFiles = [makeDriveFile('file-1'), makeDriveFile('file-2')];
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ googleRefreshToken: 'refresh-token' });
      mockFilesList.mockResolvedValue({ data: { files: driveFiles, nextPageToken: null } });
      (prisma.file.upsert as jest.Mock).mockResolvedValue({});
      (prisma.$transaction as jest.Mock).mockResolvedValue([]);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const count = await driveService.syncUserFiles('user-1');

      expect(count).toBe(2);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ lastSyncAt: expect.any(Date) }),
        })
      );
    });

    it('paginates through multiple pages and accumulates all files', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ googleRefreshToken: 'refresh-token' });
      mockFilesList
        .mockResolvedValueOnce({ data: { files: [makeDriveFile('f1')], nextPageToken: 'page2token' } })
        .mockResolvedValueOnce({ data: { files: [makeDriveFile('f2'), makeDriveFile('f3')], nextPageToken: null } });
      (prisma.$transaction as jest.Mock).mockResolvedValue([]);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const count = await driveService.syncUserFiles('user-1');

      expect(count).toBe(3);
      expect(mockFilesList).toHaveBeenCalledTimes(2);
    });

    it('passes correct data shape to upsert operations', async () => {
      const driveFiles = [makeDriveFile('file-x')];
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ googleRefreshToken: 'refresh-token' });
      mockFilesList.mockResolvedValue({ data: { files: driveFiles, nextPageToken: null } });
      (prisma.$transaction as jest.Mock).mockResolvedValue([]);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await driveService.syncUserFiles('user-1');

      expect(prisma.file.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_userId: { id: 'file-x', userId: 'user-1' } },
          create: expect.objectContaining({
            id: 'file-x',
            userId: 'user-1',
            mimeType: 'application/pdf',
          }),
          update: expect.objectContaining({ mimeType: 'application/pdf' }),
        })
      );
    });

    it('uses BigInt(0) when file size is absent', async () => {
      const fileWithoutSize = { ...makeDriveFile('no-size'), size: undefined };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ googleRefreshToken: 'refresh-token' });
      mockFilesList.mockResolvedValue({ data: { files: [fileWithoutSize], nextPageToken: null } });
      (prisma.$transaction as jest.Mock).mockResolvedValue([]);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await driveService.syncUserFiles('user-1');

      const upsertCall = (prisma.file.upsert as jest.Mock).mock.calls[0][0] as any;
      expect(upsertCall.create.size).toBe(BigInt(0));
    });
  });

  // ─── deleteFile ─────────────────────────────────────────────────────────────

  describe('deleteFile', () => {
    it('calls drive.files.delete with the correct fileId', async () => {
      mockFilesDelete.mockResolvedValue({});

      await driveService.deleteFile(mockOAuth2Client, 'file-123');

      expect(mockFilesDelete).toHaveBeenCalledWith({ fileId: 'file-123' });
    });

    it('throws AppError 500 when the Drive API call fails', async () => {
      mockFilesDelete.mockRejectedValue(new Error('Drive API error'));

      await expect(driveService.deleteFile(mockOAuth2Client, 'file-123')).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining('delete'),
      });
    });
  });

  // ─── renameFile ─────────────────────────────────────────────────────────────

  describe('renameFile', () => {
    it('calls drive.files.update with the correct fileId and new name', async () => {
      mockFilesUpdate.mockResolvedValue({});

      await driveService.renameFile(mockOAuth2Client, 'file-456', 'New Name.pdf');

      expect(mockFilesUpdate).toHaveBeenCalledWith({
        fileId: 'file-456',
        requestBody: { name: 'New Name.pdf' },
      });
    });

    it('throws AppError 500 when the Drive API call fails', async () => {
      mockFilesUpdate.mockRejectedValue(new Error('Drive API error'));

      await expect(driveService.renameFile(mockOAuth2Client, 'file-456', 'New.pdf')).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining('rename'),
      });
    });
  });
});
