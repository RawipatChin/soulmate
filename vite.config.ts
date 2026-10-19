import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { cpSync } from 'node:fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'copy-screen-templates',
        closeBundle() {
          const root = import.meta.dirname || '.';
          cpSync(
            path.resolve(root, 'stitch_soulmate_e_commerce'),
            path.resolve(root, 'dist/stitch_soulmate_e_commerce'),
            { recursive: true },
          );
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
