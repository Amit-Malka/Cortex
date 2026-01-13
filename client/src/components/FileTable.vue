<script setup lang="ts">
  import { ref } from 'vue';
  import { useFileStore, type File } from '../stores/files';
  import { formatBytes, formatDate } from '../utils/format';
  import { ExternalLink, File as FileIcon, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-vue-next';
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
    <div class="bg-white/50 dark:bg-dark-surface/50 backdrop-blur-sm rounded-3xl shadow-soft border border-[#DED8CF]/30 dark:border-white/10 transition-colors">
      <div class="">
        <table class="w-full table-fixed divide-y divide-[#DED8CF]/30 dark:divide-white/10">
          <thead class="z-50">
            <tr>
              <th 
                scope="col" 
                class="sticky top-0 z-50 bg-[#FDFCF8] dark:bg-[#1A1A18] border-b border-[#DED8CF] dark:border-white/20 w-[40%] px-4 py-3 text-left text-xs font-serif font-bold text-foreground/60 dark:text-dark-text/60 uppercase tracking-widest cursor-pointer hover:text-primary dark:hover:text-primary-light transition-colors select-none shadow-sm" 
                @click="store.toggleSort('name')"
              >
                <div class="flex items-center gap-1">
                  Name
                  <component :is="store.sortOrder === 'asc' ? ArrowUp : ArrowDown" v-if="store.sortBy === 'name'" class="w-3 h-3 text-primary dark:text-primary-light" />
                </div>
              </th>
  
              <th 
                scope="col" 
                class="sticky top-0 z-50 bg-[#FDFCF8] dark:bg-[#1A1A18] border-b border-[#DED8CF] dark:border-white/20 w-[15%] px-4 py-3 text-left text-xs font-serif font-bold text-foreground/60 dark:text-dark-text/60 uppercase tracking-widest cursor-pointer hover:text-primary dark:hover:text-primary-light transition-colors select-none shadow-sm" 
                @click="store.toggleSort('mimeType')"
              >
                <div class="flex items-center gap-1">
                  Type
                  <component :is="store.sortOrder === 'asc' ? ArrowUp : ArrowDown" v-if="store.sortBy === 'mimeType'" class="w-3 h-3 text-primary dark:text-primary-light" />
                </div>
              </th>
  
              <th 
                scope="col" 
                class="sticky top-0 z-50 bg-[#FDFCF8] dark:bg-[#1A1A18] border-b border-[#DED8CF] dark:border-white/20 w-[15%] px-2 py-3 text-left text-xs font-serif font-bold text-foreground/60 dark:text-dark-text/60 uppercase tracking-widest cursor-pointer hover:text-primary dark:hover:text-primary-light transition-colors select-none shadow-sm" 
                @click="store.toggleSort('size')"
              >
                <div class="flex items-center gap-1">
                  Size
                  <component :is="store.sortOrder === 'asc' ? ArrowUp : ArrowDown" v-if="store.sortBy === 'size'" class="w-3 h-3 text-primary dark:text-primary-light" />
                </div>
              </th>
  
              <th 
                scope="col" 
                class="sticky top-0 z-50 bg-[#FDFCF8] dark:bg-[#1A1A18] border-b border-[#DED8CF] dark:border-white/20 w-[20%] px-4 py-3 text-left text-xs font-serif font-bold text-foreground/60 dark:text-dark-text/60 uppercase tracking-widest cursor-pointer hover:text-primary dark:hover:text-primary-light transition-colors select-none shadow-sm" 
                @click="store.toggleSort('modifiedTime')"
              >
                <div class="flex items-center gap-1">
                  Modified
                  <component :is="store.sortOrder === 'asc' ? ArrowUp : ArrowDown" v-if="store.sortBy === 'modifiedTime'" class="w-3 h-3 text-primary dark:text-primary-light" />
                </div>
              </th>
  
              <th 
                scope="col" 
                class="sticky top-0 z-50 bg-[#FDFCF8] dark:bg-[#1A1A18] border-b border-[#DED8CF] dark:border-white/20 w-[10%] px-4 py-3 text-right text-xs font-serif font-bold text-foreground/60 dark:text-dark-text/60 uppercase tracking-widest shadow-sm"
              >
                Actions
              </th>
            </tr>
          </thead>
  
          <tbody class="divide-y divide-[#DED8CF]/30 dark:divide-white/10 relative z-0">
            <tr v-if="loading" class="animate-pulse bg-white/40 dark:bg-white/5">
              <td colspan="5" class="px-8 py-8 text-center text-foreground/60 dark:text-dark-text/60">Loading files...</td>
            </tr>
            <tr v-else-if="files.length === 0" class="bg-white/40 dark:bg-white/5">
              <td colspan="5" class="px-8 py-16 text-center text-foreground/60 dark:text-dark-text/60">
                No files found. Sync your drive to get started.
              </td>
            </tr>
            
            <tr v-else v-for="file in files" :key="file.id" class="group relative z-0 hover:bg-primary/5 dark:hover:bg-primary-light/10 transition-colors duration-200">
              <td class="px-4 py-3 max-w-0">
                <div class="flex items-center">
                  <div class="flex-shrink-0 p-2 rounded-lg bg-white dark:bg-white/10 shadow-sm border border-gray-100 dark:border-white/10 group-hover:border-primary/20 dark:group-hover:border-primary-light/20 transition-colors mr-3">
                    <FileIcon class="h-4 w-4 text-foreground/40 dark:text-dark-text/40 group-hover:text-primary dark:group-hover:text-primary-light transition-colors" />
                  </div>
                  <div class="text-sm font-semibold text-foreground dark:text-dark-text truncate font-sans cursor-help" :title="file.name">
                    {{ file.name }}
                  </div>
                </div>
              </td>
  
              <td class="px-4 py-3 whitespace-nowrap overflow-hidden">
                <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-secondary/10 text-secondary border border-secondary/20 truncate max-w-full cursor-help" :title="file.mimeType">
                  {{ file.mimeType.split('/').pop() }}
                </span>
              </td>
  
              <td class="px-2 py-3 whitespace-nowrap text-sm text-foreground/60 dark:text-dark-text/60 font-medium overflow-hidden cursor-help" :title="formatBytes(file.size)">
                {{ formatBytes(file.size) }}
              </td>
  
              <td class="px-4 py-3 whitespace-nowrap text-sm text-foreground/60 dark:text-dark-text/60 overflow-hidden cursor-help" :title="formatDate(file.modifiedTime)">
                {{ formatDate(file.modifiedTime) }}
              </td>
  
              <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end items-center gap-1.5">
                  <a :href="file.webViewLink" target="_blank" class="p-1.5 rounded-full text-foreground/40 dark:text-dark-text/40 hover:text-primary dark:hover:text-primary-light hover:bg-primary/10 dark:hover:bg-primary-light/10 transition-colors" title="Open in Drive">
                    <ExternalLink class="h-4 w-4" />
                  </a>
                  <button @click="openRenameModal(file)" class="p-1.5 rounded-full text-foreground/40 dark:text-dark-text/40 hover:text-secondary hover:bg-secondary/10 transition-colors" title="Rename">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button @click="handleDelete(file)" class="p-1.5 rounded-full text-foreground/40 dark:text-dark-text/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
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