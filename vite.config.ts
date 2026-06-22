import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base 用相對路徑，確保部署到 GitHub Pages 子路徑（/budget-app-test/）時資源仍能正確載入
export default defineConfig({
  base: './',
  plugins: [react()],
});
