<script setup lang="ts">
import { Brain } from 'lucide-vue-next';
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      <div class="text-center">
        <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 mb-4">
          <Brain class="h-8 w-8 text-blue-600" />
        </div>
        <h2 class="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">
          Welcome to Cortex
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Your Second Brain for Drive Files
        </p>
      </div>
      
      <div class="mt-8 space-y-6">
        <a
          href="/auth/google"
          class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 shadow-sm"
        >
          <span class="absolute left-0 inset-y-0 flex items-center pl-3">
            <!-- Simple SVG Google G logo placeholder or generic -->
            <svg class="h-5 w-5 text-blue-500 group-hover:text-blue-400 bg-white rounded-full p-0.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
            </svg>
          </span>
          Sign in with Google
        </a>
      </div>
    </div>
  </div>
</template>