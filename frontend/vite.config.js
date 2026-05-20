import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    watch: {
      // Bind-mounted source in Docker needs polling for HMR to fire.
      usePolling: true,
      interval: 200,
    },
  },

  // The CRA codebase keeps JSX in .js files. Tell esbuild to parse them as JSX
  // rather than renaming hundreds of files.
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
});
