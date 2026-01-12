import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import { signToken } from '../utils/jwt';

// Ensure environment variables are loaded (should be handled by jest.setup.ts, but safe to verify)
const apiKey = process.env.OPENAI_API_KEY;

// Conditional execution: Run only if API Key is present
const runIfApiKey = apiKey ? describe : describe.skip;

runIfApiKey('Live LLM / Chat API Integration', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create a temporary test user
    const testUser = await prisma.user.create({
      data: {
        email: `live-llm-test-${Date.now()}@example.com`,
        name: 'Live LLM User',
      },
    });

    testUserId = testUser.id;
    authToken = signToken(testUserId);
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('should successfully connect to OpenAI and return a response', async () => {
    // Short prompt to save tokens
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ message: 'Hi' });

    if (response.status !== 200) {
      throw new Error(`API FAILED: ${response.status} - ${JSON.stringify(response.body, null, 2)}`);
    }

    // Expecting success
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(typeof response.body.data.reply).toBe('string');
    expect(response.body.data.reply.length).toBeGreaterThan(0);
  }, 30000); // 30 second timeout
});

if (!apiKey) {
  describe('LLM / Chat API (Skipped)', () => {
    it('skips live tests because OPENAI_API_KEY is missing', () => {
      console.warn('⚠️  Skipping Live LLM tests: OPENAI_API_KEY is not set.');
    });
  });
}