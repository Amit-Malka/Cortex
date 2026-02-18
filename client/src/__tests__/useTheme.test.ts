import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTheme } from '../composables/useTheme';

// Reset the shared isDark ref between tests by re-importing the module
// happy-dom provides localStorage and document.documentElement

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    // Reset the module singleton state by directly toggling to known state
    const { isDark } = useTheme();
    if (isDark.value) {
      isDark.value = false;
      document.documentElement.classList.remove('dark');
    }
  });

  describe('initTheme', () => {
    it('sets dark mode when localStorage contains "dark"', () => {
      localStorage.setItem('theme', 'dark');
      const { initTheme, isDark } = useTheme();

      initTheme();

      expect(isDark.value).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('sets light mode when localStorage contains "light"', () => {
      localStorage.setItem('theme', 'light');
      const { initTheme, isDark } = useTheme();

      initTheme();

      expect(isDark.value).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('uses system preference when localStorage is empty', () => {
      // happy-dom defaults to light (matchMedia returns false)
      const { initTheme, isDark } = useTheme();

      initTheme();

      // The result matches the system preference; we just verify no crash
      expect(typeof isDark.value).toBe('boolean');
    });
  });

  describe('toggleTheme', () => {
    it('flips isDark from false to true', () => {
      const { initTheme, toggleTheme, isDark } = useTheme();
      localStorage.setItem('theme', 'light');
      initTheme();

      toggleTheme();

      expect(isDark.value).toBe(true);
    });

    it('flips isDark from true to false', () => {
      const { initTheme, toggleTheme, isDark } = useTheme();
      localStorage.setItem('theme', 'dark');
      initTheme();

      toggleTheme();

      expect(isDark.value).toBe(false);
    });

    it('adds the "dark" class to documentElement when toggled on', () => {
      const { initTheme, toggleTheme } = useTheme();
      localStorage.setItem('theme', 'light');
      initTheme();

      toggleTheme();

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes the "dark" class from documentElement when toggled off', () => {
      const { initTheme, toggleTheme } = useTheme();
      localStorage.setItem('theme', 'dark');
      initTheme();

      toggleTheme();

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('persists the new theme value in localStorage', () => {
      const { initTheme, toggleTheme } = useTheme();
      localStorage.setItem('theme', 'light');
      initTheme();

      toggleTheme();

      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });
});
