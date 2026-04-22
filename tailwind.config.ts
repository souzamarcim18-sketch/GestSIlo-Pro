import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      colors: {
        gs: {
          bg: '#0B1410',
          panel: '#121E18',
          'panel-2': '#17241D',
          mint: '#5FE3A1',
          'mint-2': '#3ECB8A',
          'mint-soft': 'rgba(95, 227, 161, 0.12)',
          'mint-glow': 'rgba(95, 227, 161, 0.45)',
          'text-1': '#EAF2EB',
          'text-2': '#9AAB9E',
          'text-3': '#627067',
          warn: '#E5B969',
          'warn-soft': 'rgba(229, 185, 105, 0.12)',
          danger: '#E07B6A',
          'danger-soft': 'rgba(224, 123, 106, 0.12)',
          info: '#7AB3DB',
          'info-soft': 'rgba(122, 179, 219, 0.12)',
          line: 'rgba(143, 201, 138, 0.08)',
          'line-2': 'rgba(143, 201, 138, 0.14)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xs: '5px',
        sm: '9px',
        md: '10px',
        lg: '14px',
        xl: '16px',
        '2xl': '22px',
      },
      boxShadow: {
        'glow-mint': '0 0 12px rgba(95, 227, 161, 0.45)',
        'glow-mint-sm': '0 6px 18px rgba(95, 227, 161, 0.25)',
        'glow-mint-lg': '0 6px 18px rgba(95, 227, 161, 0.3)',
        'inset-mint': 'inset 0 0 0 1px rgba(143, 201, 138, 0.18)',
      },
    },
  },
};

export default config;
