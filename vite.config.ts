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
          src: 'asset/*',
          dest: ''
        },
        {
          src: '_locales/*',
          dest: '_locales'
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
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/popup.tsx'),
        background: path.resolve(__dirname, 'src/background.ts')
      },
      output: {
        entryFileNames: '[name].js',
        dir: 'dist',
        assetFileNames: '[name].[ext]'
      }
    }
  }
});