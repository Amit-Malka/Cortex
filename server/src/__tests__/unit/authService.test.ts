import { describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('../../lib/prisma');
jest.mock('../../utils/googleClient');

import prisma from '../../lib/prisma';
import GoogleClient from '../../utils/googleClient';
import AppError from '../../utils/AppError';
import authService from '../../services/authService';

const MockGoogleClient = GoogleClient as jest.MockedClass<typeof GoogleClient>;

const mockTokens = {
  access_token: 'access-123',
  refresh_token: 'refresh-456',
  scope: 'email profile',
  token_type: 'Bearer',
  expiry_date: Date.now() + 3600000,
};

const mockUserInfo = {
  email: 'user@example.com',
  name: 'Test User',
};

const mockDbUser = {
  id: 'user-uuid-1',
  email: 'user@example.com',
  name: 'Test User',
  googleRefreshToken: 'refresh-456',
  lastSyncAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let mockClientInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    (authService as any).googleClient = null;

    mockClientInstance = {
      getAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/auth?scope=...'),
      getTokens: jest.fn().mockResolvedValue(mockTokens),
      getUserInfo: jest.fn().mockResolvedValue(mockUserInfo),
      refreshAccessToken: jest.fn(),
      setCredentials: jest.fn(),
      getOAuth2Client: jest.fn(),
    };

    MockGoogleClient.mockImplementation(() => mockClientInstance);
  });

  // ─── handleLogin ────────────────────────────────────────────────────────────

  describe('handleLogin', () => {
    it('exchanges code for tokens, upserts user, and returns a JWT', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.upsert as jest.Mock).mockResolvedValue(mockDbUser);

      const result = await authService.handleLogin('oauth-code-123');

      expect(mockClientInstance.getTokens).toHaveBeenCalledWith('oauth-code-123');
      expect(mockClientInstance.getUserInfo).toHaveBeenCalledWith('access-123');
      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'user@example.com' },
          create: expect.objectContaining({ email: 'user@example.com', googleRefreshToken: 'refresh-456' }),
          update: expect.objectContaining({ name: 'Test User' }),
        })
      );

      expect(result.user.id).toBe('user-uuid-1');
      expect(result.user.email).toBe('user@example.com');
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.')).toHaveLength(3);
    });

    it('preserves existing refresh token when new token is absent', async () => {
      const existingUser = { ...mockDbUser, googleRefreshToken: 'old-refresh' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.upsert as jest.Mock).mockResolvedValue(existingUser);

      mockClientInstance.getTokens.mockResolvedValue({
        ...mockTokens,
        refresh_token: undefined,
      });

      await authService.handleLogin('code-without-refresh');

      const upsertCall = (prisma.user.upsert as jest.Mock).mock.calls[0][0] as any;
      expect(upsertCall.update.googleRefreshToken).toBe('old-refresh');
    });

    it('wraps errors into AppError with status 401', async () => {
      mockClientInstance.getTokens.mockRejectedValue(new Error('Invalid code'));

      await expect(authService.handleLogin('bad-code')).rejects.toThrow(AppError);
      await expect(authService.handleLogin('bad-code')).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  // ─── getAuthUrl ──────────────────────────────────────────────────────────────

  describe('getAuthUrl', () => {
    it('delegates to GoogleClient and returns the auth URL', () => {
      const url = authService.getAuthUrl();
      expect(url).toBe('https://accounts.google.com/auth?scope=...');
      expect(mockClientInstance.getAuthUrl).toHaveBeenCalled();
    });
  });
});
