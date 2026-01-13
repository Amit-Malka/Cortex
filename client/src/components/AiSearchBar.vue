<script setup lang="ts">
import { ref } from 'vue';
import { Sparkles, Search, Loader2, X } from 'lucide-vue-next';
import { useFileStore } from '../stores/files';

const fileStore = useFileStore();
const query = ref('');
const showResponse = ref(false);

const handleQuery = async () => {
  if (!query.value.trim() || fileStore.aiLoading) return;
  
  showResponse.value = true;
  await fileStore.queryAI(query.value);
};

const clearQuery = () => {
  query.value = '';
  showResponse.value = false;
  fileStore.aiResponse = null;
};
</script>

<template>
  <div class="w-full max-w-4xl mx-auto mb-12 space-y-4">
    <div class="relative group">
      <!-- Search Bar -->
      <div 
        class="relative flex items-center bg-white/70 backdrop-blur-md border border-border-color/40 rounded-[2rem] shadow-soft transition-all duration-500 group-hover:shadow-float group-focus-within:shadow-float group-focus-within:border-primary/40 overflow-hidden"
      >
        <div class="pl-6 text-primary/60">
          <Sparkles v-if="!fileStore.aiLoading" class="h-6 w-6" stroke-width="1.5" />
          <Loader2 v-else class="h-6 w-6 animate-spin" stroke-width="1.5" />
        </div>
        
        <input
          v-model="query"
          type="text"
          placeholder="Ask anything about your files..."
          class="w-full py-5 px-4 bg-transparent border-none focus:ring-0 text-foreground text-lg font-sans placeholder:text-foreground/30"
          @keyup.enter="handleQuery"
        />

        <div class="flex items-center pr-4 space-x-2">
          <button 
            v-if="query"
            @click="clearQuery"
            class="p-2 text-foreground/30 hover:text-secondary transition-colors"
          >
            <X class="h-5 w-5" />
          </button>
          
          <button
            @click="handleQuery"
            :disabled="!query.trim() || fileStore.aiLoading"
            class="bg-primary text-background px-6 py-2.5 rounded-full font-bold text-sm shadow-soft hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-300"
          >
            Ask AI
          </button>
        </div>
      </div>

      <!-- AI Response Area -->
      <transition
        enter-active-class="transition duration-500 ease-out"
        enter-from-class="transform -translate-y-4 opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-300 ease-in"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform -translate-y-4 opacity-0"
      >
        <div 
          v-if="showResponse && (fileStore.aiLoading || fileStore.aiResponse)"
          class="mt-4 p-8 bg-primary/5 backdrop-blur-sm border border-primary/10 rounded-[2rem] rounded-tl-[0.5rem] shadow-inner-soft relative overflow-hidden"
        >
          <!-- Decorative leaf-like shape -->
          <div class="absolute -right-10 -bottom-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>
          
          <div v-if="fileStore.aiLoading" class="flex flex-col items-center justify-center py-8 space-y-4">
            <div class="flex space-x-2">
              <div class="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
              <div class="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div class="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            </div>
            <p class="text-primary/60 font-sans italic animate-pulse">Cortex is thinking...</p>
          </div>
          
          <div v-else class="relative z-10">
            <div class="flex items-start space-x-4">
              <div class="mt-1 p-2 bg-primary/20 rounded-xl">
                <Sparkles class="h-5 w-5 text-primary" />
              </div>
              <div class="flex-1 space-y-4">
                <p class="text-foreground leading-relaxed font-sans whitespace-pre-wrap">
                  {{ fileStore.aiResponse }}
                </p>
                <div class="pt-4 border-t border-primary/10 flex justify-end">
                  <span class="text-[10px] uppercase tracking-widest font-bold text-primary/40">Powered by Cortex LLM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.shadow-inner-soft {
  box-shadow: inset 0 2px 10px rgba(93, 112, 82, 0.05);
}
</style>
