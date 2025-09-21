// @ts-check
import { defineConfig } from 'astro/config';

import vue from '@astrojs/vue';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [vue({ 
    devtools: true,
    appEntrypoint: '/src/utils/vue-app.js'
  })],

  vite: {
    plugins: [tailwindcss()]
  }
});