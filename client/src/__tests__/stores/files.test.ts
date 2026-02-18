import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    defaults: { headers: { common: {} } },
    interceptors: { request: { use: vi.fn() } },
  },
}));

import api from '../../api/axios';
import { useFileStore, type File, type Stats } from '../../stores/files';

const mockGet = api.get as ReturnType<typeof vi.fn>;
const mockPost = api.post as ReturnType<typeof vi.fn>;
const mockDelete = api.delete as ReturnType<typeof vi.fn>;
const mockPatch = api.patch as ReturnType<typeof vi.fn>;

const makeFile = (overrides: Partial<File> = {}): File => ({
  id: 'file-1',
  name: 'Report.pdf',
  mimeType: 'application/pdf',
  size: '1024',
  webViewLink: 'https://drive.google.com/file1',
  ownerEmail: 'owner@test.com',
  ownerName: 'Alice',
  createdTime: '2024-01-01T00:00:00Z',
  modifiedTime: '2024-06-01T00:00:00Z',
  indexedAt: '2024-06-01T00:00:00Z',
  ...overrides,
});

const makeStats = (overrides: Partial<Stats> = {}): Stats => ({
  totalStorage: '10240',
  fileCount: 5,
  typeDistribution: [
    { mimeType: 'application/pdf', count: 3, percentage: 60 },
    { mimeType: 'image/png', count: 2, percentage: 40 },
  ],
  ...overrides,
});

describe('useFileStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ─── fetchFiles ─────────────────────────────────────────────────────────────

  describe('fetchFiles', () => {
    it('sets files and pagination from the API response', async () => {
      const files = [makeFile({ id: 'f1' }), makeFile({ id: 'f2' })];
      mockGet.mockResolvedValue({
        data: { data: { files, meta: { total: 2, page: 1, totalPages: 1, limit: 20 } } },
      });

      const store = useFileStore();
      await store.fetchFiles(1);

      expect(store.files).toHaveLength(2);
      expect(store.pagination.total).toBe(2);
      expect(store.pagination.page).toBe(1);
    });

    it('sets loading to false after fetch completes', async () => {
      mockGet.mockResolvedValue({
        data: { data: { files: [], meta: { total: 0, page: 1, totalPages: 1, limit: 20 } } },
      });

      const store = useFileStore();
      await store.fetchFiles();

      expect(store.loading).toBe(false);
    });

    it('sets loading to false even when the request fails', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      const store = useFileStore();
      await store.fetchFiles();

      expect(store.loading).toBe(false);
    });
  });

  // ─── fetchStats ─────────────────────────────────────────────────────────────

  describe('fetchStats', () => {
    it('sets stats from the API response', async () => {
      const stats = makeStats();
      mockGet.mockResolvedValue({ data: { data: stats } });

      const store = useFileStore();
      await store.fetchStats();

      expect(store.stats?.fileCount).toBe(5);
      expect(store.stats?.totalStorage).toBe('10240');
    });
  });

  // ─── syncDrive ──────────────────────────────────────────────────────────────

  describe('syncDrive', () => {
    it('calls the sync endpoint and then refreshes files and stats', async () => {
      mockPost.mockResolvedValue({ data: {} });
      mockGet.mockResolvedValue({
        data: { data: { files: [], meta: { total: 0, page: 1, totalPages: 1, limit: 20 } } },
      });

      const store = useFileStore();
      await store.syncDrive();

      expect(mockPost).toHaveBeenCalledWith('/drive/sync');
      expect(mockGet).toHaveBeenCalled();
    });

    it('sets syncing to false after completion', async () => {
      mockPost.mockResolvedValue({ data: {} });
      mockGet.mockResolvedValue({
        data: { data: { files: [], meta: { total: 0, page: 1, totalPages: 1, limit: 20 } } },
      });

      const store = useFileStore();
      await store.syncDrive();

      expect(store.syncing).toBe(false);
    });
  });

  // ─── deleteFile ─────────────────────────────────────────────────────────────

  describe('deleteFile', () => {
    it('removes the file from local state after API call', async () => {
      mockDelete.mockResolvedValue({ data: {} });

      const store = useFileStore();
      store.files = [makeFile({ id: 'f1' }), makeFile({ id: 'f2' })];

      await store.deleteFile('f1');

      expect(store.files).toHaveLength(1);
      expect(store.files[0].id).toBe('f2');
    });

    it('decrements stats.fileCount', async () => {
      mockDelete.mockResolvedValue({ data: {} });

      const store = useFileStore();
      store.files = [makeFile({ id: 'f1' })];
      store.stats = makeStats({ fileCount: 3 });

      await store.deleteFile('f1');

      expect(store.stats?.fileCount).toBe(2);
    });

    it('throws when the API call fails', async () => {
      mockDelete.mockRejectedValue(new Error('Delete failed'));

      const store = useFileStore();
      store.files = [makeFile({ id: 'f1' })];

      await expect(store.deleteFile('f1')).rejects.toThrow('Delete failed');
    });
  });

  // ─── renameFile ─────────────────────────────────────────────────────────────

  describe('renameFile', () => {
    it('updates the file name in local state after API call', async () => {
      const updatedFile = makeFile({ id: 'f1', name: 'New Name.pdf' });
      mockPatch.mockResolvedValue({ data: { data: { file: updatedFile } } });

      const store = useFileStore();
      store.files = [makeFile({ id: 'f1', name: 'Old Name.pdf' })];

      await store.renameFile('f1', 'New Name.pdf');

      expect(store.files[0].name).toBe('New Name.pdf');
    });

    it('throws when the API call fails', async () => {
      mockPatch.mockRejectedValue(new Error('Rename failed'));

      const store = useFileStore();
      store.files = [makeFile({ id: 'f1' })];

      await expect(store.renameFile('f1', 'New.pdf')).rejects.toThrow('Rename failed');
    });
  });

  // ─── queryAI ────────────────────────────────────────────────────────────────

  describe('queryAI', () => {
    it('sets aiResponse from the reply', async () => {
      mockPost.mockResolvedValue({ data: { data: { reply: 'You have 3 PDFs.' } } });

      const store = useFileStore();
      store.files = [makeFile()];
      await store.queryAI('how many PDFs?');

      expect(store.aiResponse).toBe('You have 3 PDFs.');
      expect(store.aiLoading).toBe(false);
    });

    it('sets aiResponse to error message on failure', async () => {
      mockPost.mockRejectedValue(new Error('API error'));

      const store = useFileStore();
      await store.queryAI('hi');

      expect(store.aiResponse).toContain('error');
      expect(store.aiLoading).toBe(false);
    });
  });

  // ─── toggleSort ─────────────────────────────────────────────────────────────

  describe('toggleSort', () => {
    beforeEach(() => {
      mockGet.mockResolvedValue({
        data: { data: { files: [], meta: { total: 0, page: 1, totalPages: 1, limit: 20 } } },
      });
    });

    it('toggles order from desc to asc on the same field', async () => {
      const store = useFileStore();
      store.sortBy = 'modifiedTime';
      store.sortOrder = 'desc';

      await store.toggleSort('modifiedTime');

      expect(store.sortOrder).toBe('asc');
      expect(store.sortBy).toBe('modifiedTime');
    });

    it('toggles order from asc to desc on the same field', async () => {
      const store = useFileStore();
      store.sortBy = 'name';
      store.sortOrder = 'asc';

      await store.toggleSort('name');

      expect(store.sortOrder).toBe('desc');
    });

    it('switches to new field and resets order to asc', async () => {
      const store = useFileStore();
      store.sortBy = 'modifiedTime';
      store.sortOrder = 'desc';

      await store.toggleSort('name');

      expect(store.sortBy).toBe('name');
      expect(store.sortOrder).toBe('asc');
    });
  });

  // ─── Computed: filesByType ───────────────────────────────────────────────────

  describe('filesByType', () => {
    it('returns empty object when stats has no typeDistribution', () => {
      const store = useFileStore();
      expect(store.filesByType).toEqual({});
    });

    it('maps PDF mimeType to "PDF" category', () => {
      const store = useFileStore();
      store.stats = makeStats({
        typeDistribution: [{ mimeType: 'application/pdf', count: 5, percentage: 100 }],
      });
      expect(store.filesByType['PDF']).toBe(5);
    });

    it('maps image mimeType to "Images" category', () => {
      const store = useFileStore();
      store.stats = makeStats({
        typeDistribution: [{ mimeType: 'image/jpeg', count: 3, percentage: 100 }],
      });
      expect(store.filesByType['Images']).toBe(3);
    });

    it('maps spreadsheet mimeType to "Spreadsheets"', () => {
      const store = useFileStore();
      store.stats = makeStats({
        typeDistribution: [
          { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', count: 2, percentage: 100 },
        ],
      });
      expect(store.filesByType['Spreadsheets']).toBe(2);
    });

    it('maps Google folder to "Folders"', () => {
      const store = useFileStore();
      store.stats = makeStats({
        typeDistribution: [{ mimeType: 'application/vnd.google-apps.folder', count: 4, percentage: 100 }],
      });
      expect(store.filesByType['Folders']).toBe(4);
    });

    it('aggregates counts for the same simplified type', () => {
      const store = useFileStore();
      store.stats = makeStats({
        typeDistribution: [
          { mimeType: 'image/jpeg', count: 2, percentage: 50 },
          { mimeType: 'image/png', count: 3, percentage: 50 },
        ],
      });
      expect(store.filesByType['Images']).toBe(5);
    });
  });

  // ─── Computed: storageBySize ─────────────────────────────────────────────────

  describe('storageBySize', () => {
    it('returns zeroed buckets when there are no files', () => {
      const store = useFileStore();
      const result = store.storageBySize;
      expect(result['Small (<1MB)']).toBe(0);
      expect(result['Medium (1-10MB)']).toBe(0);
      expect(result['Large (>10MB)']).toBe(0);
    });

    it('puts a 512-byte file in "Small (<1MB)"', () => {
      const store = useFileStore();
      store.files = [makeFile({ size: '512' })];
      expect(store.storageBySize['Small (<1MB)']).toBe(1);
    });

    it('puts a 5 MB file in "Medium (1-10MB)"', () => {
      const store = useFileStore();
      store.files = [makeFile({ size: String(5 * 1024 * 1024) })];
      expect(store.storageBySize['Medium (1-10MB)']).toBe(1);
    });

    it('puts a 20 MB file in "Large (>10MB)"', () => {
      const store = useFileStore();
      store.files = [makeFile({ size: String(20 * 1024 * 1024) })];
      expect(store.storageBySize['Large (>10MB)']).toBe(1);
    });
  });

  // ─── Computed: topOwners ──────────────────────────────────────────────────────

  describe('topOwners', () => {
    it('returns empty object when there are no files', () => {
      const store = useFileStore();
      expect(store.topOwners).toEqual({});
    });

    it('returns owners sorted by file count descending', () => {
      const store = useFileStore();
      store.files = [
        makeFile({ ownerName: 'Alice' }),
        makeFile({ ownerName: 'Bob' }),
        makeFile({ ownerName: 'Alice' }),
        makeFile({ ownerName: 'Charlie' }),
        makeFile({ ownerName: 'Alice' }),
      ];

      const owners = store.topOwners;
      const entries = Object.entries(owners);
      expect(entries[0][0]).toBe('Alice');
      expect(entries[0][1]).toBe(3);
    });

    it('returns at most 5 owners', () => {
      const store = useFileStore();
      store.files = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(name =>
        makeFile({ ownerName: name })
      );
      expect(Object.keys(store.topOwners).length).toBeLessThanOrEqual(5);
    });

    it('falls back to "Unknown" when ownerName is empty', () => {
      const store = useFileStore();
      store.files = [makeFile({ ownerName: '' })];
      expect(store.topOwners['Unknown']).toBe(1);
    });
  });
});
