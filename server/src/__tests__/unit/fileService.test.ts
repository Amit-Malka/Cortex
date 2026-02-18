import { describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('../../lib/prisma');

import prisma from '../../lib/prisma';
import fileService from '../../services/fileService';

const makeFile = (overrides = {}) => ({
  id: 'file-1',
  name: 'Report.pdf',
  mimeType: 'application/pdf',
  size: BigInt(1024),
  webViewLink: 'https://drive.google.com/file1',
  ownerEmail: 'owner@test.com',
  ownerName: 'Owner',
  createdTime: new Date('2024-01-01'),
  modifiedTime: new Date('2024-06-01'),
  indexedAt: new Date('2024-06-01'),
  ...overrides,
});

describe('FileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── getUserFiles ──────────────────────────────────────────────────────────

  describe('getUserFiles', () => {
    it('returns paginated files and correct meta', async () => {
      const files = [makeFile({ id: 'f1' }), makeFile({ id: 'f2' })];
      (prisma.file.findMany as jest.Mock).mockResolvedValue(files);
      (prisma.file.count as jest.Mock).mockResolvedValue(2);

      const result = await fileService.getUserFiles('user-1', { page: 1, limit: 20 });

      expect(result.files).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('applies search filter via name contains', async () => {
      (prisma.file.findMany as jest.Mock).mockResolvedValue([makeFile({ name: 'Budget.xlsx' })]);
      (prisma.file.count as jest.Mock).mockResolvedValue(1);

      await fileService.getUserFiles('user-1', { search: 'Budget' });

      const whereArg = (prisma.file.findMany as jest.Mock).mock.calls[0][0] as any;
      expect(whereArg.where.name).toEqual({
        contains: 'Budget',
        mode: 'insensitive',
      });
    });

    it('does not apply search filter when search is empty', async () => {
      (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.file.count as jest.Mock).mockResolvedValue(0);

      await fileService.getUserFiles('user-1', { search: '   ' });

      const whereArg = (prisma.file.findMany as jest.Mock).mock.calls[0][0] as any;
      expect(whereArg.where.name).toBeUndefined();
    });

    it('falls back to modifiedTime when sortBy is invalid', async () => {
      (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.file.count as jest.Mock).mockResolvedValue(0);

      await fileService.getUserFiles('user-1', { sortBy: 'injected_field' });

      const findArg = (prisma.file.findMany as jest.Mock).mock.calls[0][0] as any;
      expect(findArg.orderBy).toEqual({ modifiedTime: 'desc' });
    });

    it('accepts valid sortBy fields', async () => {
      (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.file.count as jest.Mock).mockResolvedValue(0);

      await fileService.getUserFiles('user-1', { sortBy: 'name', order: 'asc' });

      const findArg = (prisma.file.findMany as jest.Mock).mock.calls[0][0] as any;
      expect(findArg.orderBy).toEqual({ name: 'asc' });
    });

    it('computes correct skip for page 2', async () => {
      (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.file.count as jest.Mock).mockResolvedValue(40);

      await fileService.getUserFiles('user-1', { page: 2, limit: 10 });

      const findArg = (prisma.file.findMany as jest.Mock).mock.calls[0][0] as any;
      expect(findArg.skip).toBe(10);
      expect(findArg.take).toBe(10);
      expect((await fileService.getUserFiles('user-1', { page: 2, limit: 10 })).totalPages).toBe(4);
    });

    it('clamps page to minimum 1', async () => {
      (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.file.count as jest.Mock).mockResolvedValue(0);

      await fileService.getUserFiles('user-1', { page: -5 });

      const findArg = (prisma.file.findMany as jest.Mock).mock.calls[0][0] as any;
      expect(findArg.skip).toBe(0);
    });

    it('clamps limit to maximum 2000', async () => {
      (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.file.count as jest.Mock).mockResolvedValue(0);

      await fileService.getUserFiles('user-1', { limit: 99999 });

      const findArg = (prisma.file.findMany as jest.Mock).mock.calls[0][0] as any;
      expect(findArg.take).toBe(2000);
    });
  });

  // ─── getUserStats ──────────────────────────────────────────────────────────

  describe('getUserStats', () => {
    it('returns totalStorage, fileCount, and typeDistribution', async () => {
      (prisma.file.aggregate as jest.Mock).mockResolvedValue({ _sum: { size: BigInt(3072) } });
      (prisma.file.count as jest.Mock).mockResolvedValue(3);
      (prisma.file.groupBy as jest.Mock).mockResolvedValue([
        { mimeType: 'application/pdf', _count: { mimeType: 2 } },
        { mimeType: 'image/png', _count: { mimeType: 1 } },
      ]);

      const stats = await fileService.getUserStats('user-1');

      expect(stats.totalStorage).toBe('3072');
      expect(stats.fileCount).toBe(3);
      expect(stats.typeDistribution).toHaveLength(2);
    });

    it('returns "0" for totalStorage when no files exist', async () => {
      (prisma.file.aggregate as jest.Mock).mockResolvedValue({ _sum: { size: null } });
      (prisma.file.count as jest.Mock).mockResolvedValue(0);
      (prisma.file.groupBy as jest.Mock).mockResolvedValue([]);

      const stats = await fileService.getUserStats('user-1');

      expect(stats.totalStorage).toBe('0');
      expect(stats.fileCount).toBe(0);
      expect(stats.typeDistribution).toHaveLength(0);
    });

    it('groups types beyond 5 into an "Other" bucket', async () => {
      const types = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(t => ({
        mimeType: t,
        _count: { mimeType: 1 },
      }));
      (prisma.file.aggregate as jest.Mock).mockResolvedValue({ _sum: { size: BigInt(0) } });
      (prisma.file.count as jest.Mock).mockResolvedValue(7);
      (prisma.file.groupBy as jest.Mock).mockResolvedValue(types);

      const stats = await fileService.getUserStats('user-1');

      const other = stats.typeDistribution.find(t => t.mimeType === 'Other');
      expect(other).toBeDefined();
      expect(other!.count).toBe(2);
      expect(stats.typeDistribution.length).toBe(6); // top 5 + Other
    });

    it('calculates percentages correctly', async () => {
      (prisma.file.aggregate as jest.Mock).mockResolvedValue({ _sum: { size: BigInt(0) } });
      (prisma.file.count as jest.Mock).mockResolvedValue(4);
      (prisma.file.groupBy as jest.Mock).mockResolvedValue([
        { mimeType: 'application/pdf', _count: { mimeType: 3 } },
        { mimeType: 'image/png', _count: { mimeType: 1 } },
      ]);

      const stats = await fileService.getUserStats('user-1');

      const pdf = stats.typeDistribution.find(t => t.mimeType === 'application/pdf')!;
      expect(pdf.percentage).toBe(75);
      const png = stats.typeDistribution.find(t => t.mimeType === 'image/png')!;
      expect(png.percentage).toBe(25);
    });

    it('returns 0% when fileCount is 0', async () => {
      (prisma.file.aggregate as jest.Mock).mockResolvedValue({ _sum: { size: BigInt(0) } });
      (prisma.file.count as jest.Mock).mockResolvedValue(0);
      (prisma.file.groupBy as jest.Mock).mockResolvedValue([]);

      const stats = await fileService.getUserStats('user-1');

      expect(stats.typeDistribution).toHaveLength(0);
    });
  });
});
