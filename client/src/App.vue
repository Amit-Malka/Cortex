<script setup lang="ts">
import ChatWidget from './components/chat/ChatWidget.vue';
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary/20">
    <router-view />
    <ChatWidget />
  </div>
</template>
