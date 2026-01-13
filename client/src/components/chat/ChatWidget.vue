<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { useChatStore } from '../../stores/chat';
import ChatBubble from './ChatBubble.vue';
import { MessageCircle, X, Send, Bot, Sparkles } from 'lucide-vue-next';

const store = useChatStore();
const inputValue = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

watch(() => store.messages.length, scrollToBottom);
watch(() => store.isLoading, scrollToBottom);
watch(() => store.isOpen, (newVal) => {
  if (newVal) scrollToBottom();
});

const handleSubmit = async () => {
  if (!inputValue.value.trim() || store.isLoading) return;
  
  const text = inputValue.value;
  inputValue.value = '';
  await store.sendMessage(text);
};
</script>

<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
    <!-- Chat Window -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out origin-bottom-right"
      enter-from-class="opacity-0 scale-95 translate-y-4"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in origin-bottom-right"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-4"
    >
      <div
        v-if="store.isOpen"
        class="pointer-events-auto mb-4 w-80 md:w-96 h-[500px] bg-background border border-border-color rounded-4xl shadow-float flex flex-col overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-border-color/50 bg-white/50 backdrop-blur-sm">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
              <Sparkles class="w-4 h-4" />
            </div>
            <h2 class="font-serif text-lg text-foreground font-medium">Cortex AI</h2>
          </div>
          <button
            @click="store.toggleOpen"
            class="p-1 hover:bg-black/5 rounded-full transition-colors text-foreground/60 hover:text-foreground"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Messages Area -->
        <div
          ref="messagesContainer"
          class="flex-1 overflow-y-auto p-4 scroll-smooth"
        >
          <div v-if="store.messages.length === 0" class="h-full flex flex-col items-center justify-center text-center p-6 text-foreground/40">
            <Bot class="w-12 h-12 mb-4 opacity-50" />
            <p class="text-sm font-medium">How can I help you today?</p>
          </div>
          
          <ChatBubble
            v-for="msg in store.messages"
            :key="msg.id"
            :message="msg"
          />

          <!-- Typing Indicator -->
          <div v-if="store.isLoading" class="flex justify-start mb-4">
            <div class="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-muted flex items-center gap-1">
              <div class="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
              <div class="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
              <div class="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="p-4 bg-white/50 backdrop-blur-sm border-t border-border-color/50">
          <form @submit.prevent="handleSubmit" class="relative flex items-center">
            <input
              v-model="inputValue"
              type="text"
              placeholder="Ask anything..."
              class="w-full pl-5 pr-12 py-3 bg-white border border-border-color rounded-full focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all placeholder:text-foreground/30 text-sm"
            />
            <button
              type="submit"
              :disabled="!inputValue.trim() || store.isLoading"
              class="absolute right-2 p-2 bg-secondary text-white rounded-full shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-sm"
            >
              <Send class="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Trigger Button -->
    <button
      @click="store.toggleOpen"
      class="pointer-events-auto h-14 w-14 rounded-full bg-secondary text-white shadow-float hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
    >
      <Transition
        enter-active-class="transition-all duration-300 absolute"
        enter-from-class="opacity-0 rotate-90 scale-50"
        enter-to-class="opacity-100 rotate-0 scale-100"
        leave-active-class="transition-all duration-300 absolute"
        leave-from-class="opacity-100 rotate-0 scale-100"
        leave-to-class="opacity-0 -rotate-90 scale-50"
      >
        <MessageCircle v-if="!store.isOpen" class="w-6 h-6" />
        <X v-else class="w-6 h-6" />
      </Transition>
    </button>
  </div>
</template>

<style scoped>
/* Custom scrollbar for webkit */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(44, 44, 36, 0.1);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(44, 44, 36, 0.2);
}
</style>
