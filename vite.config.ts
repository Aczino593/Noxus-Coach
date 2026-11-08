import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';
import https from 'node:https';
import fs from 'node:fs';

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
              'User-Agent': 'NoxusCoach/1.0',
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

function lolLiveClientPlugin(): Plugin {
  return {
    name: 'lol-live-client-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/lol-live')) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const liveReq = https.request(
          'https://127.0.0.1:2999/liveclientdata/allgamedata',
          {
            method: 'GET',
            rejectUnauthorized: false,
            timeout: 750,
          },
          (liveRes) => {
            if (liveRes.statusCode !== 200) {
              res.statusCode = 200;
              res.end(JSON.stringify({ connected: false, status: liveRes.statusCode }));
              return;
            }
            const chunks: Buffer[] = [];
            liveRes.on('data', (chunk: Buffer) => chunks.push(chunk));
            liveRes.on('end', () => {
              try {
                const raw = Buffer.concat(chunks).toString('utf-8');
                const parsed = JSON.parse(raw);
                res.statusCode = 200;
                res.end(JSON.stringify({ connected: true, data: parsed }));
              } catch {
                res.statusCode = 200;
                res.end(JSON.stringify({ connected: false }));
              }
            });
          },
        );

        liveReq.on('timeout', () => {
          liveReq.destroy();
          if (!res.writableEnded) {
            res.statusCode = 200;
            res.end(JSON.stringify({ connected: false, reason: 'timeout' }));
          }
        });

        liveReq.on('error', () => {
          if (!res.writableEnded) {
            res.statusCode = 200;
            res.end(JSON.stringify({ connected: false, reason: 'not_running' }));
          }
        });

        liveReq.end();
      });

      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/lol-lcu')) {
          return next();
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const candidatePaths = [
          'C:\\Riot Games\\League of Legends\\lockfile',
          'D:\\Riot Games\\League of Legends\\lockfile',
          'E:\\Riot Games\\League of Legends\\lockfile',
        ];
        const lockfilePath = candidatePaths.find((p) => fs.existsSync(p));
        if (!lockfilePath) {
          res.statusCode = 200;
          res.end(JSON.stringify({ connected: false, reason: 'no_lockfile' }));
          return;
        }

        try {
          const content = fs.readFileSync(lockfilePath, 'utf-8').trim();
          const parts = content.split(':');
          const port = parts[2];
          const password = parts[3];
          if (!port || !password) {
            res.statusCode = 200;
            res.end(JSON.stringify({ connected: false, reason: 'invalid_lockfile' }));
            return;
          }
          const auth = Buffer.from(`riot:${password}`).toString('base64');
          const lcuReq = https.request(
            `https://127.0.0.1:${port}/lol-champ-select/v1/session`,
            {
              method: 'GET',
              rejectUnauthorized: false,
              timeout: 650,
              headers: {
                Authorization: `Basic ${auth}`,
                Accept: 'application/json',
              },
            },
            (lcuRes) => {
              const chunks: Buffer[] = [];
              lcuRes.on('data', (c: Buffer) => chunks.push(c));
              lcuRes.on('end', () => {
                if (lcuRes.statusCode !== 200) {
                  res.statusCode = 200;
                  res.end(JSON.stringify({ connected: true, inChampSelect: false }));
                  return;
                }
                try {
                  const session = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
                  res.statusCode = 200;
                  res.end(JSON.stringify({ connected: true, inChampSelect: true, session }));
                } catch {
                  res.statusCode = 200;
                  res.end(JSON.stringify({ connected: true, inChampSelect: false }));
                }
              });
            },
          );
          lcuReq.on('error', () => {
            if (!res.writableEnded) {
              res.statusCode = 200;
              res.end(JSON.stringify({ connected: false }));
            }
          });
          lcuReq.on('timeout', () => {
            lcuReq.destroy();
            if (!res.writableEnded) {
              res.statusCode = 200;
              res.end(JSON.stringify({ connected: false }));
            }
          });
          lcuReq.end();
        } catch {
          res.statusCode = 200;
          res.end(JSON.stringify({ connected: false }));
        }
      });
    },
  };
}

// Puerto fijo: Tauri lo referencia en src-tauri/tauri.conf.json (devUrl).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const riotApiKey = env.VITE_RIOT_API_KEY || '';

  return {
    plugins: [tailwindcss(), riotApiProxyPlugin(riotApiKey), lolLiveClientPlugin()],
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
