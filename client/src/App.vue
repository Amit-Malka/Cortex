<script setup lang="ts">
import { ref } from 'vue';

const message = ref('Cortex is ready');
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-lg">
      <h1 class="text-3xl font-bold text-gray-800 mb-4">
        {{ message }}
      </h1>
      <p class="text-gray-600">
        Your Vue 3 + TypeScript + Tailwind CSS application
      </p>
    </div>
  </div>
</template>
