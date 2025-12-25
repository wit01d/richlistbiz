import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 80,
      host: 'richlist.biz',
      allowedHosts: ['richlist.biz', 'www.richlist.biz'],
      // port: 5173,
      // host: 'localhost',
    },

    plugins: [react()],
    define: {
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-three': ['three'],
            'vendor-r3f': ['@react-three/fiber', '@react-three/drei'],
            'vendor-icons': ['lucide-react'],
          }
        }
      }
    }
  };
});
