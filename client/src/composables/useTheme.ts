import { ref, watch, onMounted } from 'vue';

const isDark = ref(false);

export function useTheme() {
  const updateTheme = () => {
    const html = document.documentElement;
    if (isDark.value) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const toggleTheme = () => {
    isDark.value = !isDark.value;
    updateTheme();
  };

  // Initialize theme
  const initTheme = () => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      isDark.value = storedTheme === 'dark';
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    updateTheme();
  };

  return {
    isDark,
    toggleTheme,
    initTheme
  };
}
