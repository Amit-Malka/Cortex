<script setup lang="ts">
import { ref } from 'vue';
import { useFileStore, type File } from '../stores/files';
import { formatBytes, formatDate } from '../utils/format';
import { ExternalLink, File as FileIcon, Pencil, Trash2 } from 'lucide-vue-next';
import RenameModal from './RenameModal.vue';

defineProps<{
  files: File[];
  loading: boolean;
}>();

const store = useFileStore();
const isRenameModalOpen = ref(false);
const fileToRename = ref<File | null>(null);

const openRenameModal = (file: File) => {
  fileToRename.value = file;
  isRenameModalOpen.value = true;
};

const closeRenameModal = () => {
  isRenameModalOpen.value = false;
  fileToRename.value = null;
};

const handleRename = async (newName: string) => {
  if (fileToRename.value) {
    await store.renameFile(fileToRename.value.id, newName);
    closeRenameModal();
  }
};

const handleDelete = async (file: File) => {
  if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
    await store.deleteFile(file.id);
  }
};
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
              Actions
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
              <div class="flex justify-end items-center gap-2">
                <a :href="file.webViewLink" target="_blank" class="p-2 rounded-full text-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors" title="Open in Drive">
                  <ExternalLink class="h-4 w-4" />
                </a>
                <button @click="openRenameModal(file)" class="p-2 rounded-full text-foreground/40 hover:text-secondary hover:bg-secondary/10 transition-colors" title="Rename">
                  <Pencil class="h-4 w-4" />
                </button>
                <button @click="handleDelete(file)" class="p-2 rounded-full text-foreground/40 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <RenameModal
      :is-open="isRenameModalOpen"
      :file-name="fileToRename?.name || ''"
      @close="closeRenameModal"
      @save="handleRename"
    />
  </div>
</template>