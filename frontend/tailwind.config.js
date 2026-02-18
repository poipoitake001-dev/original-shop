/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary, #6366f1)',
        'primary-hover': 'var(--primary-dark, #4f46e5)',
        success: '#22c55e',
        warning: '#f59e0b',
        dark: {
          bg: '#0f172a',
          card: '#1e293b',
          input: '#334155',
          border: '#475569'
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { 
          '0%': { opacity: '0' }, 
          '100%': { opacity: '1' } 
        },
        slideUp: { 
          '0%': { opacity: '0', transform: 'translateY(20px)' }, 
          '100%': { opacity: '1', transform: 'translateY(0)' } 
        },
        scaleIn: { 
          '0%': { opacity: '0', transform: 'scale(0.95)' }, 
          '100%': { opacity: '1', transform: 'scale(1)' } 
        },
      }
    }
  },
  plugins: [],
}
