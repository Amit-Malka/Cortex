import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api/axios';

export interface File {
  id: string;
  name: string;
  mimeType: string;
  size: string; // serialized BigInt
  webViewLink: string;
  ownerEmail: string;
  ownerName: string;
  createdTime: string;
  modifiedTime: string;
  indexedAt: string;
}

export interface Stats {
  totalStorage: string; // serialized BigInt
  fileCount: number;
  typeDistribution: Array<{
    mimeType: string;
    count: number;
    percentage: number;
  }>;
}

interface Pagination {
  page: number;
  total: number;
  totalPages: number;
  limit: number;
}

export const useFileStore = defineStore('files', () => {
  const stats = ref<Stats | null>(null);
  const files = ref<File[]>([]);
  const pagination = ref<Pagination>({
    page: 1,
    total: 0,
    totalPages: 1,
    limit: 20
  });
  
  const loading = ref(false);
  const syncing = ref(false);
  const aiResponse = ref<string | null>(null);
  const aiLoading = ref(false);

  async function fetchStats() {
    try {
      const response = await api.get('/files/stats');
      stats.value = response.data.data;
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }

  async function fetchFiles(page = 1) {
    loading.value = true;
    try {
      const response = await api.get('/files', {
        params: { page }
      });
      files.value = response.data.data.files;
      pagination.value = response.data.data.meta;
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      loading.value = false;
    }
  }

  async function syncDrive() {
    syncing.value = true;
    try {
      await api.post('/drive/sync');
      // Refresh data after sync
      await Promise.all([
        fetchStats(),
        fetchFiles(1) // Reset to page 1
      ]);
    } catch (error) {
      console.error('Failed to sync drive:', error);
    } finally {
      syncing.value = false;
    }
  }

  async function queryAI(message: string) {
    aiLoading.value = true;
    aiResponse.value = null;
    try {
      // Create context from current files
      const context = files.value.map(f => `${f.name} (${f.mimeType}, ${f.size} bytes)`).join(', ');
      
      const response = await api.post('/chat', {
        message,
        context: `The user has the following files in their Drive: ${context}`
      });
      
      aiResponse.value = response.data.data.reply;
    } catch (error) {
      console.error('Failed to query AI:', error);
      aiResponse.value = 'Sorry, I encountered an error while processing your request.';
    } finally {
      aiLoading.value = false;
    }
  }

  return {
    stats,
    files,
    pagination,
    loading,
    syncing,
    aiResponse,
    aiLoading,
    fetchStats,
    fetchFiles,
    syncDrive,
    queryAI
  };
});
