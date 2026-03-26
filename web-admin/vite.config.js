import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5174,
    proxy: {
      // Direct path for the Collector App
      '/collector': {
        target: 'http://localhost:5176',
        changeOrigin: true,
      },
      // Flutter Internal Assets/Engine (typically loaded from root fallback)
      '^/(flutter_bootstrap\\.js|main\\.dart\\.js|flutter\\.js|canvaskit/.*|manifest\\.json|version\\.json|favicon\\.png|ddc_module_loader\\.js|stack_trace_mapper\\.js|dart_sdk\\.js|require\\.js)': {
        target: 'http://localhost:5176',
        changeOrigin: true,
      },
      // DDC modules and dart files
      '^/.*\\.dart(\\.lib)?\\.js$': {
        target: 'http://localhost:5176',
        changeOrigin: true,
      },
      // Flutter App Assets
      '/assets': {
        target: 'http://localhost:5176',
        changeOrigin: true,
      },
    },
  },
});
