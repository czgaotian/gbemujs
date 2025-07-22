import { defineConfig } from 'vite';
import path from 'path';
console.log(__dirname);
export default defineConfig({
  resolve: {
    alias: {
      '@gbjs/core': path.resolve(__dirname, '..', 'core/src'),
    },
  },
});
