import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
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

  // Sorting
  const sortBy = ref<'name' | 'size' | 'mimeType' | 'modifiedTime'>('modifiedTime');
  const sortOrder = ref<'asc' | 'desc'>('desc');

  const sortedFiles = computed(() => {
    return [...files.value].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy.value) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = Number(BigInt(a.size) - BigInt(b.size));
          break;
        case 'mimeType':
          comparison = a.mimeType.localeCompare(b.mimeType);
          break;
        case 'modifiedTime':
          comparison = new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime();
          break;
      }
      
      return sortOrder.value === 'asc' ? comparison : -comparison;
    });
  });

  const toggleSort = (field: 'name' | 'size' | 'mimeType' | 'modifiedTime') => {
    if (sortBy.value === field) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy.value = field;
      sortOrder.value = 'asc';
    }
  };

  const filesByType = computed(() => {
    if (!stats.value?.typeDistribution) return {};
    
    // Simplify types
    const distribution: Record<string, number> = {};
    
    stats.value.typeDistribution.forEach(item => {
      let simpleType = 'Other';
      const type = item.mimeType.toLowerCase();
      
      if (type.includes('image')) simpleType = 'Images';
      else if (type.includes('pdf')) simpleType = 'PDF';
      else if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv') || type.includes('sheet')) simpleType = 'Spreadsheets';
      else if (type.includes('document') || type.includes('word') || type.includes('doc')) simpleType = 'Documents';
      else if (type.includes('presentation') || type.includes('powerpoint') || type.includes('slide')) simpleType = 'Presentations';
      else if (type.includes('video')) simpleType = 'Video';
      else if (type.includes('audio')) simpleType = 'Audio';
      else if (type === 'application/vnd.google-apps.folder') simpleType = 'Folders';
      
      distribution[simpleType] = (distribution[simpleType] || 0) + item.count;
    });
    
    return distribution;
  });

  const storageBySize = computed(() => {
    const categories = {
      'Small (<1MB)': 0,
      'Medium (1-10MB)': 0,
      'Large (>10MB)': 0
    };

    files.value.forEach(file => {
      const size = Number(file.size);
      const mb = size / (1024 * 1024);
      
      if (mb < 1) categories['Small (<1MB)']++;
      else if (mb < 10) categories['Medium (1-10MB)']++;
      else categories['Large (>10MB)']++;
    });

    return categories;
  });

  const filesByDate = computed(() => {
    const grouped: Record<string, number> = {};
    
    // Use files directly to compute stats
    files.value.forEach(file => {
      const date = new Date(file.modifiedTime);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      grouped[key] = (grouped[key] || 0) + 1;
    });

    // Sort by date chronologically
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    // Create sorted object
    const sortedGrouped: Record<string, number> = {};
    sortedKeys.forEach(key => {
      sortedGrouped[key] = grouped[key];
    });

    return sortedGrouped;
  });

  const topOwners = computed(() => {
    const counts: Record<string, number> = {};
    
    files.value.forEach(file => {
      const owner = file.ownerName || 'Unknown';
      counts[owner] = (counts[owner] || 0) + 1;
    });

    // Sort by count descending and take top 5
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .reduce((obj, [key, val]) => {
        obj[key] = val;
        return obj;
      }, {} as Record<string, number>);
  });

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

  async function fetchAllFiles() {
    loading.value = true;
    try {
      const response = await api.get('/files', {
        params: { 
          page: 1, 
          limit: 2000 
        }
      });
      files.value = response.data.data.files;
    } catch (error) {
      console.error('Failed to fetch all files:', error);
    } finally {
      loading.value = false;
    }
  }

  async function syncDrive() {
    syncing.value = true;
    try {
      await api.post('/drive/sync');
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

  async function deleteFile(id: string) {
    try {
      await api.delete(`/files/${id}`);
      files.value = files.value.filter(f => f.id !== id);
      // Update count in stats if available
      if (stats.value) {
        stats.value.fileCount--;
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  async function renameFile(id: string, newName: string) {
    try {
      const response = await api.patch(`/files/${id}`, { name: newName });
      const updatedFile = response.data.data.file;
      
      // Update local state
      const index = files.value.findIndex(f => f.id === id);
      if (index !== -1) {
        // Preserve other properties while updating from response
        files.value[index] = { ...files.value[index], ...updatedFile };
      }
    } catch (error) {
      console.error('Failed to rename file:', error);
      throw error;
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
    sortBy,
    sortOrder,
    sortedFiles,
    filesByType,
    storageBySize,
    filesByDate,
    topOwners,
    fetchStats,
    fetchFiles,
    fetchAllFiles,
    syncDrive,
    queryAI,
    toggleSort,
    deleteFile,
    renameFile
  };
});
