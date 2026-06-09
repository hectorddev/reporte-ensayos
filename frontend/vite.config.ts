import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import http from 'http';

const API_PORTS = [3001, 8080];

function apiProxyFallback(): Plugin {
  return {
    name: 'api-proxy-fallback',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        const reenviar = (indice: number) => {
          if (indice >= API_PORTS.length) {
            res.statusCode = 502;
            res.end('Backend no disponible en puertos 3001 ni 8080');
            return;
          }

          const puerto = API_PORTS[indice];
          const proxyReq = http.request(
            {
              hostname: 'localhost',
              port: puerto,
              path: `/api${req.url}`,
              method: req.method,
              headers: req.headers,
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode ?? 500, proxyRes.headers);
              proxyRes.pipe(res);
            }
          );

          proxyReq.on('error', () => reenviar(indice + 1));
          req.pipe(proxyReq);
        };

        reenviar(0);
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  // En producción (build) se sirve bajo /reporte-ensayos/ en GitHub Pages.
  // En dev se mantiene en la raíz para no romper el proxy local.
  base: command === 'build' ? '/reporte-ensayos/' : '/',
  plugins: [react(), apiProxyFallback()],
  server: {
    port: 5173,
  },
}));
