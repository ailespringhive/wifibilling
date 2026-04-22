import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  envDir: '../backend',
  server: {
    port: 5174,
    host: true,
  },
  // MPA mode — we handle routing ourselves
  appType: 'mpa',
  plugins: [
    {
      name: 'admin-collector-routing',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';

          // ── Root "/" → redirect to "/admin/" ──
          if (url === '/' || url === '') {
            res.writeHead(302, { Location: '/admin/' });
            res.end();
            return;
          }

          // ── /admin without trailing slash → redirect ──
          if (url === '/admin') {
            res.writeHead(302, { Location: '/admin/' });
            res.end();
            return;
          }

          // ── /collector without trailing slash → redirect ──
          if (url === '/collector') {
            res.writeHead(302, { Location: '/collector/' });
            res.end();
            return;
          }

          // ── /admin/* → serve admin index.html (SPA catch-all) ──
          if (url.startsWith('/admin/') || url === '/admin/index.html') {
            const adminIndex = path.join(process.cwd(), 'index.html');
            if (fs.existsSync(adminIndex)) {
              server.transformIndexHtml(url, fs.readFileSync(adminIndex, 'utf-8')).then(html => {
                res.setHeader('Content-Type', 'text/html');
                res.end(html);
              }).catch(next);
              return;
            }
          }

          // ── /collector/ → serve collector index.html ──
          if (url === '/collector/' || url === '/collector/index.html') {
            const collectorIndex = path.join(process.cwd(), 'public', 'collector', 'index.html');
            if (fs.existsSync(collectorIndex)) {
              res.setHeader('Content-Type', 'text/html');
              res.end(fs.readFileSync(collectorIndex, 'utf-8'));
              return;
            }
          }

          next();
        });
      },
    },
  ],
});
