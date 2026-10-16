import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';
import https from 'node:https';

function riotApiProxyPlugin(defaultApiKey: string): Plugin {
  return {
    name: 'riot-api-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/riot-api/')) {
          return next();
        }

        // Formato esperado: /riot-api/{routing}/{apiPath}
        // Ejemplo: /riot-api/americas/riot/account/v1/accounts/by-riot-id/Faker/KR1
        const match = req.url.match(/^\/riot-api\/([^/]+)\/(.*)$/);
        if (!match) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Ruta no válida para /riot-api/' }));
          return;
        }

        const [, routing, rawPath] = match;
        const targetUrl = `https://${routing}.api.riotgames.com/${rawPath}`;

        // Prioridad 1: Clave enviada por el cliente desde el header 'x-riot-token' (localStorage / UI)
        // Prioridad 2: Clave obtenida desde .env (loadEnv)
        const clientKey = (req.headers['x-riot-token'] || req.headers['X-Riot-Token']) as string | undefined;
        const effectiveKey = (clientKey && clientKey.trim()) ? clientKey.trim() : defaultApiKey;
        const keyOrigin = clientKey ? 'Header del cliente (localStorage/UI)' : '.env (VITE_RIOT_API_KEY)';

        console.log(`[Riot Proxy] Reenviando: ${req.method || 'GET'} https://${routing}.api.riotgames.com/${rawPath}`);
        console.log(`[Riot Proxy] X-Riot-Token: ${effectiveKey ? effectiveKey.slice(0, 10) + '...' + effectiveKey.slice(-4) : '(VACÍO)'} [Origen: ${keyOrigin}]`);

        const proxyReq = https.request(
          targetUrl,
          {
            method: req.method || 'GET',
            headers: {
              'X-Riot-Token': effectiveKey,
              Accept: 'application/json',
              'User-Agent': 'IteroNoxus/1.0',
            },
          },
          (proxyRes) => {
            res.statusCode = proxyRes.statusCode || 500;
            res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', '*');
            proxyRes.pipe(res);
          },
        );

        proxyReq.on('error', (err) => {
          console.error(`[Riot Proxy Error] ${err.message}`);
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.end(JSON.stringify({ error: 'Error conectando con Riot Games API', details: err.message }));
        });

        req.pipe(proxyReq);
      });
    },
  };
}

// Puerto fijo: Tauri lo referencia en src-tauri/tauri.conf.json (devUrl).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const riotApiKey = env.VITE_RIOT_API_KEY || 'RGAPI-e14cf219-ab3b-4d6c-9fbc-575fe48d39ff';

  return {
    plugins: [tailwindcss(), riotApiProxyPlugin(riotApiKey)],
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: '127.0.0.1',
    },
    envPrefix: ['VITE_', 'TAURI_ENV_*'],
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 700,
      minify: 'esbuild',
      sourcemap: false,
    },
  };
});
