/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#FDFCF8', // Rice Paper
        foreground: '#2C2C24', // Deep Loam
        primary: '#5D7052',    // Moss Green
        secondary: '#C18C5D',  // Terracotta
        muted: '#F0EBE5',      // Stone
        'border-color': '#DED8CF', // Raw Timber
        
        // Dark Mode Colors
        'dark-bg': '#1A1A18',      // Dark Earth/Charcoal
        'dark-surface': '#242422', // Slightly lighter
        'dark-text': '#E6DCCD',    // Sand/Beige
        'primary-light': '#6E8560', // Lighter Moss for contrast
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(93, 112, 82, 0.15)', // Moss tint
        float: '0 10px 40px -10px rgba(193, 140, 93, 0.2)', // Clay tint
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      }
    },
  },
  plugins: [],
}
