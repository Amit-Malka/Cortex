<script setup lang="ts">
import { HardDrive, FileText, PieChart } from 'lucide-vue-next';
import { type Stats } from '../stores/files';
import { formatBytes } from '../utils/format';

defineProps<{
  stats: Stats | null;
}>();
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <!-- Storage Card -->
    <div class="bg-[#FEFEFA] dark:bg-dark-surface p-8 rounded-[2rem] rounded-tl-[3rem] shadow-soft border border-[#DED8CF]/50 dark:border-white/10 flex items-center space-x-6 hover:translate-y-[-2px] transition-all duration-300">
      <div class="p-4 bg-primary/10 dark:bg-primary-light/10 rounded-2xl text-primary dark:text-primary-light">
        <HardDrive class="w-8 h-8" stroke-width="1.5" />
      </div>
      <div>
        <p class="text-sm font-medium text-foreground/60 dark:text-dark-text/60 uppercase tracking-wider mb-1">Total Storage</p>
        <p class="text-3xl font-bold font-serif text-foreground dark:text-dark-text">
          {{ stats ? formatBytes(stats.totalStorage) : 'Loading...' }}
        </p>
      </div>
    </div>

    <!-- File Count Card -->
    <div class="bg-[#FEFEFA] dark:bg-dark-surface p-8 rounded-[2rem] shadow-soft border border-[#DED8CF]/50 dark:border-white/10 flex items-center space-x-6 hover:translate-y-[-2px] transition-all duration-300">
      <div class="p-4 bg-secondary/10 rounded-2xl text-secondary">
        <FileText class="w-8 h-8" stroke-width="1.5" />
      </div>
      <div>
        <p class="text-sm font-medium text-foreground/60 dark:text-dark-text/60 uppercase tracking-wider mb-1">Total Files</p>
        <p class="text-3xl font-bold font-serif text-foreground dark:text-dark-text">
          {{ stats ? stats.fileCount.toLocaleString() : 'Loading...' }}
        </p>
      </div>
    </div>

    <!-- Top Type Card -->
    <div class="bg-[#FEFEFA] dark:bg-dark-surface p-8 rounded-[2rem] rounded-br-[3rem] shadow-soft border border-[#DED8CF]/50 dark:border-white/10 flex items-center space-x-6 hover:translate-y-[-2px] transition-all duration-300">
      <div class="p-4 bg-muted dark:bg-white/5 rounded-2xl text-foreground/70 dark:text-dark-text/70">
        <PieChart class="w-8 h-8" stroke-width="1.5" />
      </div>
      <div>
        <p class="text-sm font-medium text-foreground/60 dark:text-dark-text/60 uppercase tracking-wider mb-1">Top File Type</p>
        <p class="text-2xl font-bold font-serif text-foreground dark:text-dark-text truncate max-w-[150px]" title="Based on count">
          {{ stats && stats.typeDistribution.length > 0 ? stats.typeDistribution[0].mimeType.split('/').pop()?.toUpperCase() : 'N/A' }}
        </p>
        <p v-if="stats && stats.typeDistribution.length > 0" class="text-sm text-foreground/40 dark:text-dark-text/40 mt-1">
          {{ stats.typeDistribution[0].percentage }}% of files
        </p>
      </div>
    </div>
  </div>
</template>