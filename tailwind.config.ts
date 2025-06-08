import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        earth: {
          50: '#f7f9f3',
          100: '#eff3e6',
          200: '#dfe7ce',
          300: '#c9d5a8',
          400: '#afc081',
          500: '#94a45c',
          600: '#7a8646',
          700: '#606939',
          800: '#4d5430',
          900: '#404629',
        },
        market: {
          50: '#f0f9f4',
          100: '#dcf2e4',
          200: '#bbe4cb',
          300: '#8dd0a8',
          400: '#58b47f',
          500: '#369961',
          600: '#277b4c',
          700: '#1f623e',
          800: '#1b4f33',
          900: '#17412b',
        },
        sage: {
          50: '#f4f7f4',
          100: '#e8f1e8',
          200: '#d1e2d1',
          300: '#b3ccb3',
          400: '#8fb08f',
          500: '#6d946d',
          600: '#567856',
          700: '#456145',
          800: '#3a4f3a',
          900: '#324232',
        },
        brown: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0cec7',
          400: '#d2bab0',
          500: '#bfa094',
          600: '#a18072',
          700: '#977669',
          800: '#846358',
          900: '#43302b',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config 