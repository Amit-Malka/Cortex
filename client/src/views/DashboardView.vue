<script setup lang="ts">
import { onMounted } from 'vue';
import { useFileStore } from '../stores/files';
import { useAuthStore } from '../stores/auth';
import { RefreshCw, LogOut, LayoutDashboard } from 'lucide-vue-next';
import StatsGrid from '../components/StatsGrid.vue';
import FileTable from '../components/FileTable.vue';
import AiSearchBar from '../components/AiSearchBar.vue';
import { useRouter } from 'vue-router';

const fileStore = useFileStore();
const authStore = useAuthStore();
const router = useRouter();

onMounted(() => {
  fileStore.fetchStats();
  fileStore.fetchFiles();
});

const handleSync = async () => {
  await fileStore.syncDrive();
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

const changePage = (newPage: number) => {
  if (newPage >= 1 && newPage <= fileStore.pagination.totalPages) {
    fileStore.fetchFiles(newPage);
  }
};
</script>

<template>
  <div class="min-h-screen">
    <!-- Header -->
    <header class="bg-white/80 backdrop-blur-md border-b border-[#DED8CF]/30 sticky top-0 z-20 transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
        <div class="flex items-center space-x-4">
          <div class="p-2.5 bg-primary/10 rounded-xl">
            <LayoutDashboard class="h-6 w-6 text-primary" stroke-width="2" />
          </div>
          <h1 class="text-5xl font-serif font-bold text-primary tracking-tight">My Drive</h1>
        </div>
        
        <div class="flex items-center space-x-6">
          <button
            @click="handleSync"
            :disabled="fileStore.syncing"
            class="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-bold rounded-full text-[#F3F4F1] bg-primary shadow-soft hover:scale-105 hover:shadow-float focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-out"
          >
            <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': fileStore.syncing }" stroke-width="2.5" />
            {{ fileStore.syncing ? 'Syncing...' : 'Sync Now' }}
          </button>
          
          <button
            @click="handleLogout"
            class="p-2 text-gray-400 hover:text-secondary transition-colors duration-300"
            title="Sign out"
          >
            <LogOut class="h-5 w-5" stroke-width="2" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- AI Search Bar -->
      <AiSearchBar />

      <!-- Stats -->
      <StatsGrid :stats="fileStore.stats" />

      <!-- Files Section -->
      <div class="space-y-6">
        <div class="flex justify-between items-end px-2">
          <h2 class="text-2xl font-serif font-bold text-foreground">Recent Files</h2>
          <span class="text-sm font-medium text-gray-500 font-sans">
            Page {{ fileStore.pagination.page }} of {{ fileStore.pagination.totalPages }}
          </span>
        </div>

        <FileTable :files="fileStore.files" :loading="fileStore.loading" />

        <!-- Pagination -->
        <div class="flex justify-between items-center bg-white/50 backdrop-blur-sm px-6 py-4 border border-[#DED8CF]/30 rounded-2xl shadow-sm">
          <button
            @click="changePage(fileStore.pagination.page - 1)"
            :disabled="fileStore.pagination.page === 1 || fileStore.loading"
            class="relative inline-flex items-center px-5 py-2 border border-[#DED8CF] text-sm font-bold rounded-full text-foreground bg-white hover:bg-[#FDFCF8] hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Previous
          </button>
          <button
            @click="changePage(fileStore.pagination.page + 1)"
            :disabled="fileStore.pagination.page === fileStore.pagination.totalPages || fileStore.loading"
            class="relative inline-flex items-center px-5 py-2 border border-[#DED8CF] text-sm font-bold rounded-full text-foreground bg-white hover:bg-[#FDFCF8] hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Next
          </button>
        </div>
      </div>
    </main>
  </div>
</template>
