import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import { signToken } from '../utils/jwt';

describe('Authentication & Authorization', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const testUser = await prisma.user.create({
      data: {
        email: `auth-test-${Date.now()}@example.com`,
        name: 'Auth Test User',
      },
    });

    testUserId = testUser.id;
    authToken = signToken(testUserId);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('GET /auth/google', () => {
    it('should redirect to Google OAuth URL', async () => {
      const response = await request(app).get('/auth/google');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('accounts.google.com');
      expect(response.headers.location).toContain('scope=');
      expect(response.headers.location).toContain('access_type=offline');
    });
  });

  describe('Protected Routes', () => {
    describe('GET /api/users/profile', () => {
      it('should return 401 without token', async () => {
        const response = await request(app).get('/api/users/profile');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('status', 'fail');
        expect(response.body.message).toContain('not logged in');
      });

      it('should return 401 with invalid token', async () => {
        const response = await request(app)
          .get('/api/users/profile')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('status', 'fail');
        expect(response.body.message).toContain('Invalid or expired token');
      });

      it('should return user profile with valid token', async () => {
        const response = await request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'success');
        expect(response.body.data.user).toHaveProperty('id', testUserId);
        expect(response.body.data.user).toHaveProperty('email');
        expect(response.body.data.user).not.toHaveProperty('googleRefreshToken');
      });
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate valid JWT token', () => {
      const token = signToken(testUserId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });
});
