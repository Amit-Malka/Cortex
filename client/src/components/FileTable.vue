<script setup lang="ts">
import { type File } from '../stores/files';
import { formatBytes, formatDate } from '../utils/format';
import { ExternalLink, File as FileIcon } from 'lucide-vue-next';

defineProps<{
  files: File[];
  loading: boolean;
}>();
</script>

<template>
  <div class="bg-white/50 backdrop-blur-sm rounded-3xl shadow-soft border border-[#DED8CF]/30 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-[#DED8CF]/30">
        <thead class="bg-muted/30">
          <tr>
            <th scope="col" class="px-8 py-5 text-left text-xs font-serif font-bold text-foreground/60 uppercase tracking-widest">
              Name
            </th>
            <th scope="col" class="px-8 py-5 text-left text-xs font-serif font-bold text-foreground/60 uppercase tracking-widest">
              Type
            </th>
            <th scope="col" class="px-8 py-5 text-left text-xs font-serif font-bold text-foreground/60 uppercase tracking-widest">
              Size
            </th>
            <th scope="col" class="px-8 py-5 text-left text-xs font-serif font-bold text-foreground/60 uppercase tracking-widest">
              Modified
            </th>
            <th scope="col" class="px-8 py-5 text-right text-xs font-serif font-bold text-foreground/60 uppercase tracking-widest">
              Action
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#DED8CF]/30">
          <tr v-if="loading" class="animate-pulse bg-white/40">
            <td colspan="5" class="px-8 py-8 text-center text-foreground/60">Loading files...</td>
          </tr>
          <tr v-else-if="files.length === 0" class="bg-white/40">
            <td colspan="5" class="px-8 py-16 text-center text-foreground/60">
              No files found. Sync your drive to get started.
            </td>
          </tr>
          <tr v-else v-for="file in files" :key="file.id" class="group hover:bg-primary/5 transition-all duration-300">
            <td class="px-8 py-5 whitespace-nowrap">
              <div class="flex items-center">
                <div class="p-2 rounded-lg bg-white shadow-sm border border-gray-100 group-hover:border-primary/20 transition-colors mr-4">
                  <FileIcon class="flex-shrink-0 h-4 w-4 text-foreground/40 group-hover:text-primary transition-colors" />
                </div>
                <div class="text-sm font-semibold text-foreground truncate max-w-xs font-sans" :title="file.name">
                  {{ file.name }}
                </div>
              </div>
            </td>
            <td class="px-8 py-5 whitespace-nowrap">
              <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                {{ file.mimeType.split('/').pop() }}
              </span>
            </td>
            <td class="px-8 py-5 whitespace-nowrap text-sm text-foreground/60 font-medium">
              {{ formatBytes(file.size) }}
            </td>
            <td class="px-8 py-5 whitespace-nowrap text-sm text-foreground/60">
              {{ formatDate(file.modifiedTime) }}
            </td>
            <td class="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
              <a :href="file.webViewLink" target="_blank" class="text-primary hover:text-primary/80 inline-flex items-center transition-colors">
                Open <ExternalLink class="ml-1 h-3 w-3" />
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>