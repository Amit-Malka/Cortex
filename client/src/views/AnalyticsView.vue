<script setup lang="ts">
import { onMounted } from 'vue';
import { useFileStore } from '../stores/files';
import { formatBytes } from '../utils/format';
import FileTypeChart from '../components/charts/FileTypeChart.vue';
import StorageChart from '../components/charts/StorageChart.vue';
import { LayoutDashboard, PieChart, BarChart3, Database, ArrowLeft } from 'lucide-vue-next';

const store = useFileStore();

onMounted(() => {
  if (!store.stats) {
    store.fetchStats();
  }
  if (store.files.length === 0) {
    store.fetchFiles();
  }
});
</script>

<template>
  <div class="p-6 md:p-8 max-w-7xl mx-auto space-y-8 pb-32">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-secondary/10 rounded-2xl text-secondary">
          <LayoutDashboard class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-3xl font-serif font-medium text-foreground">Analytics</h1>
          <p class="text-foreground/60">Overview of your drive usage and file distribution</p>
        </div>
      </div>
      <router-link
        to="/"
        class="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm hover:shadow-md border border-[#DED8CF] text-foreground/80 hover:text-primary transition-all"
      >
        <ArrowLeft class="w-4 h-4" />
        <span class="text-sm font-medium">Dashboard</span>
      </router-link>
    </div>

    <!-- Summary Card -->
    <div class="bg-[#FDFCF8] rounded-3xl p-6 shadow-soft border border-[#DED8CF] flex items-center gap-6">
      <div class="p-4 bg-primary/10 rounded-full text-primary">
        <Database class="w-8 h-8" />
      </div>
      <div>
        <p class="text-sm font-medium text-foreground/60 uppercase tracking-wider">Total Storage Used</p>
        <h2 class="text-4xl font-serif text-foreground mt-1">
          {{ store.stats ? formatBytes(store.stats.totalStorage) : 'Loading...' }}
        </h2>
        <p class="text-sm text-foreground/40 mt-1" v-if="store.stats">
          across {{ store.stats.fileCount }} files
        </p>
      </div>
    </div>

    <!-- Charts Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- File Types Chart -->
      <div class="bg-white/50 backdrop-blur-sm rounded-3xl p-6 shadow-soft border border-[#DED8CF]/50">
        <div class="flex items-center gap-2 mb-6">
          <PieChart class="w-5 h-5 text-secondary" />
          <h3 class="font-serif text-lg text-foreground">File Distribution</h3>
        </div>
        <FileTypeChart />
      </div>

      <!-- Storage Size Chart -->
      <div class="bg-white/50 backdrop-blur-sm rounded-3xl p-6 shadow-soft border border-[#DED8CF]/50">
        <div class="flex items-center gap-2 mb-6">
          <BarChart3 class="w-5 h-5 text-primary" />
          <h3 class="font-serif text-lg text-foreground">Files by Size</h3>
        </div>
        <StorageChart />
      </div>
    </div>
  </div>
</template>
