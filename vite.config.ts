import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json',
          dest: ''
        },
        {
          src: 'src/popup.html',
          dest: ''
        },
        {
          src: 'src/assets/*',
          dest: 'assets'
        },
        {
          src: 'src/_locales/*',
          dest: '_locales'
        },
        {
          src: 'src/styles/*',
          dest: 'styles'
        }
      ]
    }),
  ],
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  },
  build: {
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/popup.tsx'),
        background: path.resolve(__dirname, 'src/background.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo: { name?: string }) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'styles/[name][extname]';
          }
          return '[name][extname]';
        },
        dir: 'dist'
      }
    }
  }
});