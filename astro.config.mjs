// @ts-check
import { defineConfig } from 'astro/config';

import vue from '@astrojs/vue';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [vue({ 
    devtools: true,
    appEntrypoint: '/src/utils/vue-app.js',
    template: {
      compilerOptions: {
        // Tratar todas las etiquetas con un guion como elementos personalizados
        isCustomElement: (tag) => tag.includes('-')
      }
    }
  })],

  vite: {
    plugins: [tailwindcss()]
  },
  site: 'https://nglmercer.github.io/point_sales',
  base: '/',
});