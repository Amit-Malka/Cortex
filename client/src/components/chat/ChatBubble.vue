<script setup lang="ts">
import type { Message } from '../../stores/chat';

defineProps<{
  message: Message;
}>();
</script>

<template>
  <div
    class="flex w-full mb-4"
    :class="[
      message.role === 'user' ? 'justify-end' : 'justify-start'
    ]"
  >
    <div
      class="max-w-[80%] px-4 py-3 text-sm leading-relaxed transition-all duration-300"
      :class="[
        message.role === 'user'
          ? 'bg-primary text-white rounded-2xl rounded-tr-sm'
          : 'bg-white text-foreground rounded-2xl rounded-tl-sm shadow-sm border border-muted'
      ]"
    >
      {{ message.content }}
    </div>
  </div>
</template>
