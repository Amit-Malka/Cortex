import { describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

jest.mock('../../lib/prisma');
jest.mock('../../services/fileService');
jest.mock('../../services/driveService');
jest.mock('../../services/llmService');
jest.mock('../../utils/googleClient');

import prisma from '../../lib/prisma';
import fileService from '../../services/fileService';
import driveService from '../../services/driveService';
import llmService from '../../services/llmService';
import GoogleClient from '../../utils/googleClient';
import { getFiles, getStats, deleteFile, updateFile } from '../../controllers/fileController';
import { chat } from '../../controllers/chatController';
import { syncDrive } from '../../controllers/driveController';
import { protect } from '../../middleware/protect';
import { signToken } from '../../utils/jwt';

const MockGoogleClient = GoogleClient as jest.MockedClass<typeof GoogleClient>;

// ─── Test helpers ────────────────────────────────────────────────────────────

const makeReq = (overrides: Partial<Request> = {}): Request => ({
  user: {
    id: 'user-1',
    email: 'user@test.com',
    name: 'Test',
    googleRefreshToken: 'refresh-token',
    lastSyncAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  params: {},
  query: {},
  body: {},
  headers: {},
  ...overrides,
} as unknown as Request);

const makeRes = (): Response => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  (res.json as jest.Mock).mockReturnValue(res);
  return res;
};

const makeNext = () => jest.fn() as unknown as NextFunction;

const callHandler = (
  handler: (req: Request, res: Response, next: NextFunction) => void,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  handler(req, res, next);
  return new Promise<void>(resolve => setImmediate(resolve));
};

// ─── fileController ──────────────────────────────────────────────────────────

describe('fileController', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    MockGoogleClient.mockImplementation(() => ({
      refreshAccessToken: jest.fn().mockResolvedValue({ access_token: 'new-token', expiry_date: 9999 }),
      setCredentials: jest.fn(),
      getOAuth2Client: jest.fn().mockReturnValue({}),
      getAuthUrl: jest.fn(),
      getTokens: jest.fn(),
      getUserInfo: jest.fn(),
    }) as any);
  });

  describe('getFiles', () => {
    it('returns 200 with paginated file data', async () => {
      (fileService.getUserFiles as jest.Mock).mockResolvedValue({
        files: [{ id: 'f1', name: 'doc.pdf' }],
        total: 1,
        page: 1,
        totalPages: 1,
      });

      const req = makeReq({ query: {} });
      const res = makeRes();
      const next = makeNext();

      await callHandler(getFiles, req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as jest.Mock).mock.calls[0][0] as any;
      expect(body.status).toBe('success');
      expect(body.data.files).toHaveLength(1);
      expect(body.data.meta.total).toBe(1);
    });

    it('calls next with 401 when req.user is missing', async () => {
      const req = makeReq({ user: undefined });
      const res = makeRes();
      const next = makeNext();

      await callHandler(getFiles, req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });
  });

  describe('getStats', () => {
    it('returns 200 with stats data', async () => {
      (fileService.getUserStats as jest.Mock).mockResolvedValue({
        totalStorage: '1024',
        fileCount: 5,
        typeDistribution: [],
      });

      const req = makeReq();
      const res = makeRes();
      const next = makeNext();

      await callHandler(getStats, req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as jest.Mock).mock.calls[0][0] as any;
      expect(body.data.fileCount).toBe(5);
    });
  });

  describe('deleteFile', () => {
    it('returns 204 and deletes from Drive and DB', async () => {
      const file = { id: 'file-x', userId: 'user-1', name: 'doc.pdf' };
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(file);
      (driveService.deleteFile as jest.Mock).mockResolvedValue(undefined);
      (prisma.file.delete as jest.Mock).mockResolvedValue(file);

      const req = makeReq({ params: { id: 'file-x' } });
      const res = makeRes();
      const next = makeNext();

      await callHandler(deleteFile, req, res, next);

      expect(driveService.deleteFile).toHaveBeenCalled();
      expect(prisma.file.delete).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('calls next with 404 when file is not found', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(null);

      const req = makeReq({ params: { id: 'missing' } });
      const res = makeRes();
      const next = makeNext();

      await callHandler(deleteFile, req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
      expect(driveService.deleteFile).not.toHaveBeenCalled();
    });

    it('calls next with 401 when googleRefreshToken is absent', async () => {
      const req = makeReq({
        user: { id: 'u1', email: 'a@a.com', name: 'A', googleRefreshToken: null, lastSyncAt: null, createdAt: new Date(), updatedAt: new Date() },
        params: { id: 'file-x' },
      });
      const res = makeRes();
      const next = makeNext();

      await callHandler(deleteFile, req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });
  });

  describe('updateFile', () => {
    it('returns 200 with the updated file', async () => {
      const file = { id: 'file-x', userId: 'user-1', name: 'Old.pdf' };
      const updated = { ...file, name: 'New.pdf' };
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(file);
      (driveService.renameFile as jest.Mock).mockResolvedValue(undefined);
      (prisma.file.update as jest.Mock).mockResolvedValue(updated);

      const req = makeReq({ params: { id: 'file-x' }, body: { name: 'New.pdf' } });
      const res = makeRes();
      const next = makeNext();

      await callHandler(updateFile, req, res, next);

      expect(driveService.renameFile).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as jest.Mock).mock.calls[0][0] as any;
      expect(body.data.file.name).toBe('New.pdf');
    });

    it('calls next with 400 when name is missing', async () => {
      const req = makeReq({ params: { id: 'file-x' }, body: {} });
      const res = makeRes();
      const next = makeNext();

      await callHandler(updateFile, req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('calls next with 404 when file is not found', async () => {
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(null);

      const req = makeReq({ params: { id: 'missing' }, body: { name: 'New.pdf' } });
      const res = makeRes();
      const next = makeNext();

      await callHandler(updateFile, req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });
  });
});

// ─── chatController ──────────────────────────────────────────────────────────

describe('chatController', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('chat', () => {
    it('returns 200 with the AI reply', async () => {
      (llmService.generateChatResponse as jest.Mock).mockResolvedValue('Here is your answer.');

      const req = makeReq({ body: { message: 'list my files' } });
      const res = makeRes();
      const next = makeNext();

      await callHandler(chat, req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as jest.Mock).mock.calls[0][0] as any;
      expect(body.data.reply).toBe('Here is your answer.');
    });

    it('calls next with 400 when message is empty', async () => {
      const req = makeReq({ body: { message: '   ' } });
      const res = makeRes();
      const next = makeNext();

      await callHandler(chat, req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
      expect(llmService.generateChatResponse).not.toHaveBeenCalled();
    });

    it('calls next with 400 when message is absent', async () => {
      const req = makeReq({ body: {} });
      const res = makeRes();
      const next = makeNext();

      await callHandler(chat, req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });
  });
});

// ─── driveController ─────────────────────────────────────────────────────────

describe('driveController', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('syncDrive', () => {
    it('returns 200 with filesProcessed count', async () => {
      (driveService.syncUserFiles as jest.Mock).mockResolvedValue(42);

      const req = makeReq();
      const res = makeRes();
      const next = makeNext();

      await callHandler(syncDrive, req, res, next);

      expect(driveService.syncUserFiles).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      const body = (res.json as jest.Mock).mock.calls[0][0] as any;
      expect(body.data.filesProcessed).toBe(42);
      expect(body.data.message).toBe('Drive sync completed successfully');
    });

    it('calls next with 401 when req.user is missing', async () => {
      const req = makeReq({ user: undefined });
      const res = makeRes();
      const next = makeNext();

      await callHandler(syncDrive, req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });
  });
});

// ─── protect middleware ───────────────────────────────────────────────────────

describe('protect middleware', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('calls next with 401 when no Authorization header is present', async () => {
    const req = makeReq({ headers: {} });
    const res = makeRes();
    const next = makeNext();

    await callHandler(protect, req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with 401 when the token is invalid', async () => {
    const req = makeReq({ headers: { authorization: 'Bearer not-a-real-token' } });
    const res = makeRes();
    const next = makeNext();

    await callHandler(protect, req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with 401 when user no longer exists in DB', async () => {
    const token = signToken('ghost-user');
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeReq({ headers: { authorization: `Bearer ${token}` } });
    const res = makeRes();
    const next = makeNext();

    await callHandler(protect, req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('attaches user to req and calls next() on valid token + existing user', async () => {
    const dbUser = {
      id: 'user-abc',
      email: 'valid@test.com',
      name: 'Valid User',
      googleRefreshToken: null,
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const token = signToken('user-abc');
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(dbUser);

    const req = makeReq({ headers: { authorization: `Bearer ${token}` } });
    const res = makeRes();
    const next = makeNext();

    await callHandler(protect, req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect((req as any).user).toEqual(dbUser);
  });
});
