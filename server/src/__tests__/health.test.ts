import request from 'supertest';
import app from '../app';

describe('Health Check & Error Handling', () => {
  describe('GET /health', () => {
    it('should return 200 and success message', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Server is running');
    });
  });

  describe('GET /api', () => {
    it('should return 200 and API ready message', async () => {
      const response = await request(app).get('/api');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'API is ready');
    });
  });

  describe('Error Handler', () => {
    it('should return 404 JSON for non-existent route', async () => {
      const response = await request(app).get('/non-existent-route');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Cannot find /non-existent-route');
    });

    it('should not leak stack trace in production mode', async () => {
      process.env.NODE_ENV = 'production';
      
      const response = await request(app).get('/non-existent-route');
      
      expect(response.status).toBe(404);
      expect(response.body).not.toHaveProperty('stack');
      
      process.env.NODE_ENV = 'test';
    });
  });
});
