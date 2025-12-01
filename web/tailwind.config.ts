// Tailwind CSS v4 uses CSS-first configuration via @theme in globals.css
// This file is optional but can be used for content paths
// Most configuration should be in CSS using @theme directive

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Theme configuration is now in globals.css using @theme directive
}
