import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pluginOrden } from './servidor/plugin-orden';

// Solo en 127.0.0.1: el servidor local usa tu clave de Anthropic (POST /api/orden).
export default defineConfig({
  plugins: [react(), pluginOrden()],
  resolve: {
    alias: { '@jules/oficina': fileURLToPath(new URL('./src/oficina/index.ts', import.meta.url)) },
  },
  server: { port: 5180, host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
});
