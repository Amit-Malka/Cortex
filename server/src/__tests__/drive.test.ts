import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import { signToken } from '../utils/jwt';
import driveService from '../services/driveService';

describe('Drive Controller', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create a dummy user
    const testUser = await prisma.user.create({
      data: {
        email: `drive-test-${Date.now()}@example.com`,
        name: 'Drive Test User',
        googleRefreshToken: 'dummy-refresh-token', // Needed for sync check logic
      },
    });

    testUserId = testUser.id;
    authToken = signToken(testUserId);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('POST /api/drive/sync', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).post('/api/drive/sync');
      expect(response.status).toBe(401);
    });

    it('should trigger drive sync successfully', async () => {
      // Mock the service method
      const syncSpy = jest.spyOn(driveService, 'syncUserFiles').mockResolvedValue(5);

      const response = await request(app)
        .post('/api/drive/sync')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.message).toBe('Drive sync completed successfully');
      expect(response.body.data.filesProcessed).toBe(5);

      expect(syncSpy).toHaveBeenCalledWith(testUserId);
      syncSpy.mockRestore();
    });

    it('should handle errors during sync', async () => {
      const syncSpy = jest.spyOn(driveService, 'syncUserFiles').mockRejectedValue(new Error('Google API Error'));

      const response = await request(app)
        .post('/api/drive/sync')
        .set('Authorization', `Bearer ${authToken}`);

      // Expect 500 because it's a generic error, unless caught and rethrown as AppError
      // controller calls next(err) -> globalErrorHandler
      expect(response.status).toBe(500); 
      expect(response.body.status).toBe('error');

      syncSpy.mockRestore();
    });
  });
});
