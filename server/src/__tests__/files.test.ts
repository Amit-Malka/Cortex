import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import { signToken } from '../utils/jwt';

describe('File Controller', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // 1. Create User
    const testUser = await prisma.user.create({
      data: {
        email: `files-test-${Date.now()}@example.com`,
        name: 'Files Test User',
      },
    });
    testUserId = testUser.id;
    authToken = signToken(testUserId);

    // 2. Create Files
    await prisma.file.createMany({
      data: [
        {
          id: 'file-1',
          userId: testUserId,
          name: 'Project Proposal.pdf',
          mimeType: 'application/pdf',
          size: BigInt(1024),
          webViewLink: 'http://drive.google.com/file1',
          ownerEmail: 'me@example.com',
          ownerName: 'Me',
          createdTime: new Date(),
          modifiedTime: new Date(),
        },
        {
          id: 'file-2',
          userId: testUserId,
          name: 'Budget.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: BigInt(2048),
          webViewLink: 'http://drive.google.com/file2',
          ownerEmail: 'me@example.com',
          ownerName: 'Me',
          createdTime: new Date(),
          modifiedTime: new Date(),
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.file.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('GET /api/files', () => {
    it('should return 401 if not authenticated', async () => {
      await request(app).get('/api/files').expect(401);
    });

    it('should return paginated files for authenticated user', async () => {
      const response = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.files).toHaveLength(2);
      expect(response.body.data.meta.total).toBe(2);
      
      // Check serialization of BigInt
      const file1 = response.body.data.files.find((f: any) => f.id === 'file-1');
      expect(file1.name).toBe('Project Proposal.pdf');
      // JSON response usually converts BigInt to string if custom serializer is used, 
      // or to number if it fits. The app uses 'bigintSerializer.ts' which does .toString()
      expect(typeof file1.size).toBe('string');
    });

    it('should filter files by search query', async () => {
      const response = await request(app)
        .get('/api/files?search=Budget')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.files).toHaveLength(1);
      expect(response.body.data.files[0].name).toBe('Budget.xlsx');
    });
  });

  describe('GET /api/files/stats', () => {
    it('should return correct storage stats', async () => {
      const response = await request(app)
        .get('/api/files/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      
      const stats = response.body.data;
      expect(stats.fileCount).toBe(2);
      expect(stats.totalStorage).toBe((1024 + 2048).toString());
      
      // Check type distribution
      expect(stats.typeDistribution).toHaveLength(2);
      const pdfStat = stats.typeDistribution.find((t: any) => t.mimeType === 'application/pdf');
      expect(pdfStat).toBeDefined();
      expect(pdfStat.count).toBe(1);
    });
  });
});
