/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Orbitron', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Funnel Display"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // CODE_EXP / BrainHack palette
        bh: {
          bg:        '#000000',
          surface:   '#151717',
          panel:     '#212222',
          line:      '#2a2c2c',
          ink:       '#ffffff',
          dim:       '#9ca3af',
          lime:      '#A6FB00', // CODE_EXP signature
          'lime-2':  '#5F9E23',
          magenta:   '#FF00C9',
          blue:      '#261FFF',
          orange:    '#EF4D23',
          yellow:    '#FFD400',
          cyan:      '#00FFFF',
          teal:      '#177D81',
        },
        // Bingo categories — re-tuned for dark surfaces
        bingo: {
          orange: '#FF4A00',
          'orange-soft': 'rgba(255, 74, 0, 0.16)',
          blue: '#261FFF',
          'blue-soft': 'rgba(38, 31, 255, 0.18)',
          grey: '#3a3c3c',
          'grey-soft': 'rgba(180, 180, 180, 0.14)',
          wild: '#FFD400',
          'wild-soft': 'rgba(255, 212, 0, 0.18)',
        },
        // Team colour groups — aligned to BrainHack neon accents
        team: {
          red: '#FF00C9',     // magenta-pink
          blue: '#00FFFF',    // cyan
          green: '#A6FB00',   // CODE_EXP lime
          yellow: '#FFD400',  // bright yellow
          purple: '#B44AFF',  // electric purple
        },
      },
      boxShadow: {
        'neon-lime': '0 0 0 1px rgba(166,251,0,0.6), 0 0 24px rgba(166,251,0,0.35)',
        'neon-magenta': '0 0 0 1px rgba(255,0,201,0.6), 0 0 24px rgba(255,0,201,0.35)',
        'neon-cyan': '0 0 0 1px rgba(0,255,255,0.55), 0 0 22px rgba(0,255,255,0.3)',
        'neon-purple': '0 0 0 1px rgba(180,74,255,0.6), 0 0 24px rgba(180,74,255,0.35)',
      },
      backgroundImage: {
        'bh-grid': "linear-gradient(rgba(166,251,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(166,251,0,0.06) 1px, transparent 1px)",
        'bh-glow': "radial-gradient(ellipse at top, rgba(23,125,129,0.35), transparent 60%), radial-gradient(ellipse at bottom, rgba(166,251,0,0.12), transparent 55%)",
      },
      backgroundSize: {
        'bh-grid': '32px 32px',
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0,0)' },
          '20%': { transform: 'translate(-1px, 1px)' },
          '40%': { transform: 'translate(1px, -1px)' },
          '60%': { transform: 'translate(-1px, -1px)' },
          '80%': { transform: 'translate(1px, 1px)' },
        },
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 0 1px rgba(166,251,0,0.6), 0 0 18px rgba(166,251,0,0.25)' },
          '50%':      { boxShadow: '0 0 0 1px rgba(166,251,0,0.9), 0 0 32px rgba(166,251,0,0.55)' },
        },
      },
      animation: {
        glitch: 'glitch 1.6s infinite steps(2, end)',
        'pulse-neon': 'pulse-neon 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
