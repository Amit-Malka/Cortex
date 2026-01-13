<script setup lang="ts">
import { Brain } from 'lucide-vue-next';
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
    <!-- Decorative organic blobs -->
    <div class="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
    <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary/5 rounded-full blur-3xl"></div>

    <div class="max-w-md w-full space-y-10 bg-white/60 backdrop-blur-xl p-10 rounded-[3rem] rounded-tr-[1rem] rounded-bl-[1.5rem] shadow-soft border border-border-color/30 relative z-10 transition-all duration-500 hover:shadow-float">
      <div class="text-center">
        <div class="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-primary/10 mb-6 rotate-3">
          <Brain class="h-10 w-10 text-primary" stroke-width="1.5" />
        </div>
        <h2 class="text-5xl font-serif font-bold text-foreground tracking-tight leading-tight">
          Cortex
        </h2>
        <p class="mt-3 text-lg font-medium text-foreground/60 font-sans italic">
          Your Second Brain for Drive Files
        </p>
      </div>
      
      <div class="space-y-6">
        <p class="text-center text-sm text-foreground/50 font-sans max-w-[240px] mx-auto">
          Connect your Google Drive to start querying your documents with AI.
        </p>
        
        <a
          href="/auth/google"
          class="group relative w-full flex justify-center items-center py-4 px-6 border border-transparent text-base font-bold rounded-full text-background bg-primary hover:scale-[1.02] hover:shadow-float active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 ease-out"
        >
          <span class="absolute left-6 flex items-center">
            <svg class="h-5 w-5 fill-current text-white/90" viewBox="0 0 24 24">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.908 3.152-2.108 4.352-1.348 1.348-3.14 2.412-6.212 2.412-5.412 0-9.84-4.388-9.84-9.8s4.428-9.8 9.84-9.8c3.084 0 5.34 1.216 7.02 2.796l2.304-2.304C19.164 1.956 16.14 0 12.48 0 5.508 0 0 5.508 0 12.5s5.508 12.5 12.48 12.5c4.02 0 7.02-1.32 9.36-3.764 2.424-2.424 3.168-5.784 3.168-8.496 0-.816-.072-1.584-.192-2.32H12.48z"/>
            </svg>
          </span>
          Sign in with Google
        </a>

        <div class="pt-4 flex justify-center space-x-2 opacity-30">
          <div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
          <div class="h-1.5 w-1.5 rounded-full bg-secondary"></div>
          <div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
        </div>
      </div>
    </div>
  </div>
</template>