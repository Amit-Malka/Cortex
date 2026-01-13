import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api/axios';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([]);
  const isOpen = ref(false);
  const isLoading = ref(false);

  function toggleOpen() {
    isOpen.value = !isOpen.value;
  }

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    messages.value.push(userMessage);
    isLoading.value = true;

    try {
      const response = await api.post('/chat', { message: text });
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.reply || response.data.message || 'I received your message.',
      };
      
      messages.value.push(assistantMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
      };
      messages.value.push(errorMessage);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    messages,
    isOpen,
    isLoading,
    toggleOpen,
    sendMessage,
  };
});
