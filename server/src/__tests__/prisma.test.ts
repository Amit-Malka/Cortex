import prisma from '../lib/prisma';
import { initBigIntSerializer } from '../utils/bigintSerializer';

// Initialize BigInt serialization for tests
initBigIntSerializer();

describe('Prisma Connection & Data Isolation', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should connect to database', async () => {
    await expect(prisma.$connect()).resolves.not.toThrow();
  });

  it('should create and retrieve a user', async () => {
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
      },
    });

    expect(user.id).toBeDefined();
    expect(user.email).toContain('test-');
    expect(user.name).toBe('Test User');

    await prisma.user.delete({ where: { id: user.id } });
  });

  it('should enforce user isolation with composite key', async () => {
    const user1 = await prisma.user.create({
      data: {
        email: `user1-${Date.now()}@example.com`,
        name: 'User One',
      },
    });

    const user2 = await prisma.user.create({
      data: {
        email: `user2-${Date.now()}@example.com`,
        name: 'User Two',
      },
    });

    const sharedFileId = 'shared-file-123';

    await prisma.file.create({
      data: {
        id: sharedFileId,
        userId: user1.id,
        name: 'Shared Document.pdf',
        mimeType: 'application/pdf',
        size: BigInt(1024000),
        webViewLink: 'https://example.com/file',
        ownerEmail: 'owner@example.com',
        ownerName: 'Owner',
        createdTime: new Date(),
        modifiedTime: new Date(),
      },
    });

    await prisma.file.create({
      data: {
        id: sharedFileId,
        userId: user2.id,
        name: 'Shared Document.pdf',
        mimeType: 'application/pdf',
        size: BigInt(1024000),
        webViewLink: 'https://example.com/file',
        ownerEmail: 'owner@example.com',
        ownerName: 'Owner',
        createdTime: new Date(),
        modifiedTime: new Date(),
      },
    });

    const user1Files = await prisma.file.findMany({
      where: { userId: user1.id },
    });

    const user2Files = await prisma.file.findMany({
      where: { userId: user2.id },
    });

    expect(user1Files).toHaveLength(1);
    expect(user2Files).toHaveLength(1);
    expect(user1Files[0].id).toBe(sharedFileId);
    expect(user2Files[0].id).toBe(sharedFileId);
    expect(user1Files[0].userId).toBe(user1.id);
    expect(user2Files[0].userId).toBe(user2.id);

    await prisma.user.delete({ where: { id: user1.id } });
    await prisma.user.delete({ where: { id: user2.id } });
  });

  it('should handle BigInt serialization', async () => {
    const user = await prisma.user.create({
      data: {
        email: `bigint-test-${Date.now()}@example.com`,
        name: 'BigInt Test',
      },
    });

    const file = await prisma.file.create({
      data: {
        id: 'file-bigint-test',
        userId: user.id,
        name: 'Large File.zip',
        mimeType: 'application/zip',
        size: BigInt('9999999999999'),
        webViewLink: 'https://example.com/large-file',
        ownerEmail: 'owner@example.com',
        ownerName: 'Owner',
        createdTime: new Date(),
        modifiedTime: new Date(),
      },
    });

    const jsonString = JSON.stringify(file);
    expect(jsonString).toContain('"9999999999999"');
    expect(typeof file.size).toBe('bigint');

    await prisma.user.delete({ where: { id: user.id } });
  });
});
