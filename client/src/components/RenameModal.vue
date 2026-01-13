<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  fileName: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', newName: string): void;
}>();

const newName = ref('');

// Sync prop to local state when modal opens
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    newName.value = props.fileName;
  }
});

const handleSave = () => {
  if (newName.value.trim()) {
    emit('save', newName.value);
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
        <div class="w-full max-w-md bg-[#FDFCF8] rounded-3xl shadow-float border border-[#DED8CF] p-6 sm:p-8 transform transition-all">
          <h3 class="text-xl font-serif font-medium text-foreground mb-6">Rename File</h3>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-foreground/60 mb-2 ml-1">Name</label>
            <input
              v-model="newName"
              type="text"
              class="w-full px-4 py-3 bg-white border border-[#DED8CF] rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
              placeholder="Enter file name"
              @keyup.enter="handleSave"
              autofocus
            />
          </div>

          <div class="flex justify-end gap-3">
            <button
              @click="$emit('close')"
              class="px-6 py-2.5 rounded-full text-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              @click="handleSave"
              :disabled="!newName.trim() || newName === fileName"
              class="px-6 py-2.5 rounded-full bg-primary text-white shadow-soft hover:shadow-lg hover:scale-105 active:scale-95 transition-all font-medium text-sm disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-soft"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
