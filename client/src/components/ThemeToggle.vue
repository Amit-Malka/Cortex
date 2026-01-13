<script setup lang="ts">
import { onMounted } from 'vue';
import { Sun, Moon } from 'lucide-vue-next';
import { useTheme } from '../composables/useTheme';

const { isDark, toggleTheme, initTheme } = useTheme();

onMounted(() => {
  initTheme();
});
</script>

<template>
  <button
    @click="toggleTheme"
    class="p-2.5 rounded-full bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-foreground dark:text-dark-text border border-border-color/50 dark:border-white/10 shadow-sm transition-all duration-300 group"
    title="Toggle Theme"
  >
    <div class="relative w-5 h-5">
      <Sun
        :class="[
          'absolute inset-0 w-5 h-5 transition-all duration-300 text-amber-500',
          isDark ? '-rotate-90 scale-0' : 'rotate-0 scale-100'
        ]"
      />
      <Moon
        :class="[
          'absolute inset-0 w-5 h-5 transition-all duration-300 text-primary-light',
          isDark ? 'rotate-0 scale-100' : 'rotate-90 scale-0'
        ]"
      />
    </div>
  </button>
</template>
