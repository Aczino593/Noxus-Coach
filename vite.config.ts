import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

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

function findLoLDir(): string | null {
  const candidates = [
    'C:\\Riot Games\\League of Legends',
    'D:\\Riot Games\\League of Legends',
    'E:\\Riot Games\\League of Legends',
  ];
  return candidates.find((dir) => fs.existsSync(dir)) || null;
}

function getLcuAuth(lolDir: string | null) {
  if (!lolDir) return null;
  const lockfilePath = path.join(lolDir, 'lockfile');
  if (!fs.existsSync(lockfilePath)) return null;
  try {
    const content = fs.readFileSync(lockfilePath, 'utf-8').trim();
    const parts = content.split(':');
    const port = parts[2];
    const password = parts[3];
    if (!port || !password) return null;
    const auth = Buffer.from(`riot:${password}`).toString('base64');
    return { port, password, auth };
  } catch {
    return null;
  }
}

function getLocalHudSettings(lolDir: string | null) {
  if (!lolDir) {
    return { connected: false, globalScale: 1.0, minimapScale: 1.0, flipMiniMap: false, chatScale: 100, source: 'default' };
  }

  let globalScale = 1.0;
  let minimapScale = 1.0;
  let flipMiniMap = false;
  let chatScale = 100;
  let found = false;

  const persistedPath = path.join(lolDir, 'Config', 'PersistedSettings.json');
  if (fs.existsSync(persistedPath)) {
    try {
      const raw = fs.readFileSync(persistedPath, 'utf-8');
      const data = JSON.parse(raw);
      for (const f of data.files || []) {
        for (const sec of f.sections || []) {
          if (sec.name === 'HUD') {
            for (const s of sec.settings || []) {
              if (s.name === 'GlobalScale' || s.name === 'HUDScale') globalScale = parseFloat(s.value);
              if (s.name === 'MinimapScale') minimapScale = parseFloat(s.value);
              if (s.name === 'FlipMiniMap') flipMiniMap = s.value === '1' || s.value === 1 || s.value === true;
              if (s.name === 'ChatScale') chatScale = parseFloat(s.value);
              found = true;
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (!found) {
    const gameCfgPath = path.join(lolDir, 'Config', 'game.cfg');
    if (fs.existsSync(gameCfgPath)) {
      try {
        const raw = fs.readFileSync(gameCfgPath, 'utf-8');
        const matchGlobal = raw.match(/GlobalScale\s*=\s*([0-9.]+)/i) || raw.match(/HUDScale\s*=\s*([0-9.]+)/i);
        if (matchGlobal) { globalScale = parseFloat(matchGlobal[1]); found = true; }
        const matchMap = raw.match(/MinimapScale\s*=\s*([0-9.]+)/i);
        if (matchMap) { minimapScale = parseFloat(matchMap[1]); found = true; }
        const matchFlip = raw.match(/FlipMiniMap\s*=\s*([0-1])/i);
        if (matchFlip) { flipMiniMap = matchFlip[1] === '1'; found = true; }
      } catch {
        // ignore
      }
    }
  }

  return {
    connected: found,
    globalScale: isNaN(globalScale) ? 1.0 : globalScale,
    minimapScale: isNaN(minimapScale) ? 1.0 : minimapScale,
    flipMiniMap,
    chatScale: isNaN(chatScale) ? 100 : chatScale,
    source: found ? 'config_file' : 'default',
  };
}

function lolLiveClientPlugin(): Plugin {
  return {
    name: 'lol-live-client-proxy',
    configureServer(server) {
      // 1. Live Client Data API (Partida en Vivo en 127.0.0.1:2999)
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

      // 2. LCU Client API (Lobby, Selección de Campeones, Runas, Builds y HUD)
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/lol-lcu')) {
          return next();
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const lolDir = findLoLDir();

        // 2A. Consulta de Escala de HUD y Minimapa (/lol-lcu/hud-settings)
        if (req.url === '/lol-lcu/hud-settings') {
          const hud = getLocalHudSettings(lolDir);
          res.statusCode = 200;
          res.end(JSON.stringify(hud));
          return;
        }

        // 2B. Importar Build a la Tienda de LoL (/lol-lcu/import-build)
        if (req.url === '/lol-lcu/import-build' && req.method === 'POST') {
          const bodyChunks: Buffer[] = [];
          req.on('data', (c: Buffer) => bodyChunks.push(c));
          req.on('end', () => {
            try {
              const body = JSON.parse(Buffer.concat(bodyChunks).toString('utf-8'));
              if (!lolDir) {
                res.statusCode = 200;
                res.end(JSON.stringify({ success: false, message: 'No se encontró la carpeta de instalación de League of Legends.' }));
                return;
              }

              const recDir = path.join(lolDir, 'Config', 'Global', 'Recommended');
              if (!fs.existsSync(recDir)) {
                fs.mkdirSync(recDir, { recursive: true });
              }

              const safeName = (body.champName || 'Champion').replace(/[^a-zA-Z0-9]/g, '');
              const itemSetFilePath = path.join(recDir, `NoxusCoach_${safeName}.json`);

              const itemSetJson = {
                title: body.title || `Noxus Coach: ${body.champName}`,
                associatedMaps: [11, 12],
                associatedChampions: [],
                map: 'any',
                mode: 'any',
                preferredItemSlots: [],
                priority: true,
                sortrank: 1,
                startedFrom: 'blank',
                type: 'global',
                uid: `noxus-${Date.now()}`,
                blocks: (body.blocks || []).map((b: any) => ({
                  type: b.type,
                  showIfSummonerSpell: '',
                  hideIfSummonerSpell: '',
                  items: b.items || [],
                })),
              };

              fs.writeFileSync(itemSetFilePath, JSON.stringify(itemSetJson, null, 2), 'utf-8');

              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  success: true,
                  message: `¡Build guardada con éxito en la tienda de LoL (Pestaña Recomendados)!`,
                  filePath: itemSetFilePath,
                }),
              );
            } catch (err: any) {
              res.statusCode = 200;
              res.end(JSON.stringify({ success: false, message: `Error guardando la build: ${err?.message}` }));
            }
          });
          return;
        }

        // 2C. Importar Runas vía LCU API (/lol-lcu/import-runes)
        if (req.url === '/lol-lcu/import-runes' && req.method === 'POST') {
          const auth = getLcuAuth(lolDir);
          if (!auth) {
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                success: false,
                message: 'El cliente de LoL no está abierto. Ábrelo para equipar las runas automáticamente.',
              }),
            );
            return;
          }

          const bodyChunks: Buffer[] = [];
          req.on('data', (c: Buffer) => bodyChunks.push(c));
          req.on('end', () => {
            try {
              const body = JSON.parse(Buffer.concat(bodyChunks).toString('utf-8'));

              // Consultar páginas de runas existentes para reemplazar la activa o de Noxus Coach
              const getPagesReq = https.request(
                `https://127.0.0.1:${auth.port}/lol-perks/v1/pages`,
                {
                  method: 'GET',
                  rejectUnauthorized: false,
                  timeout: 1000,
                  headers: { Authorization: `Basic ${auth.auth}`, Accept: 'application/json' },
                },
                (pagesRes) => {
                  const pChunks: Buffer[] = [];
                  pagesRes.on('data', (c: Buffer) => pChunks.push(c));
                  pagesRes.on('end', () => {
                    let targetPageId: number | null = null;
                    try {
                      const pages = JSON.parse(Buffer.concat(pChunks).toString('utf-8'));
                      if (Array.isArray(pages)) {
                        const noxusPage = pages.find((p) => p.name && (p.name.includes('Noxus') || p.name.includes('iTero')));
                        const deletablePage = pages.find((p) => p.isDeletable && p.name !== 'Rune Page 1');
                        targetPageId = noxusPage ? noxusPage.id : deletablePage ? deletablePage.id : pages[0]?.id ?? null;
                      }
                    } catch {
                      // ignore
                    }

                    const pagePayload = JSON.stringify({
                      name: body.name || 'Noxus Coach',
                      primaryStyleId: body.primaryStyleId,
                      subStyleId: body.subStyleId,
                      selectedPerkIds: body.selectedPerkIds,
                      current: true,
                    });

                    // Si existe página previa, intentar actualizarla con PUT o eliminarla antes de crearla
                    const postOrPutUrl = targetPageId
                      ? `https://127.0.0.1:${auth.port}/lol-perks/v1/pages/${targetPageId}`
                      : `https://127.0.0.1:${auth.port}/lol-perks/v1/pages`;
                    const method = targetPageId ? 'PUT' : 'POST';

                    const saveReq = https.request(
                      postOrPutUrl,
                      {
                        method,
                        rejectUnauthorized: false,
                        timeout: 1200,
                        headers: {
                          Authorization: `Basic ${auth.auth}`,
                          'Content-Type': 'application/json',
                          Accept: 'application/json',
                        },
                      },
                      (saveRes) => {
                        if (saveRes.statusCode && saveRes.statusCode >= 200 && saveRes.statusCode < 300) {
                          res.statusCode = 200;
                          res.end(JSON.stringify({ success: true, message: '¡Página de runas equipada con éxito en el cliente de LoL!' }));
                        } else {
                          // Si PUT falló, intentamos POST como página nueva
                          const fallbackPost = https.request(
                            `https://127.0.0.1:${auth.port}/lol-perks/v1/pages`,
                            {
                              method: 'POST',
                              rejectUnauthorized: false,
                              timeout: 1000,
                              headers: {
                                Authorization: `Basic ${auth.auth}`,
                                'Content-Type': 'application/json',
                              },
                            },
                            (fbRes) => {
                              res.statusCode = 200;
                              res.end(
                                JSON.stringify({
                                  success: fbRes.statusCode === 200 || fbRes.statusCode === 201,
                                  message:
                                    fbRes.statusCode === 200 || fbRes.statusCode === 201
                                      ? '¡Página de runas creada con éxito en LoL!'
                                      : 'No se pudo crear la página de runas (posiblemente páginas llenas).',
                                }),
                              );
                            },
                          );
                          fallbackPost.write(pagePayload);
                          fallbackPost.end();
                        }
                      },
                    );
                    saveReq.on('error', () => {
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: false, message: 'Error comunicando con el cliente de LoL.' }));
                    });
                    saveReq.write(pagePayload);
                    saveReq.end();
                  });
                },
              );
              getPagesReq.on('error', () => {
                res.statusCode = 200;
                res.end(JSON.stringify({ success: false, message: 'No se pudo leer las runas del cliente de LoL.' }));
              });
              getPagesReq.end();
            } catch (err: any) {
              res.statusCode = 200;
              res.end(JSON.stringify({ success: false, message: `Error: ${err?.message}` }));
            }
          });
          return;
        }

        // 2D. Sesión de Selección de Campeones (/lol-lcu o /lol-lcu/champ-select)
        const auth = getLcuAuth(lolDir);
        if (!auth) {
          res.statusCode = 200;
          res.end(JSON.stringify({ connected: false, inChampSelect: false, reason: 'no_lockfile' }));
          return;
        }

        const lcuReq = https.request(
          `https://127.0.0.1:${auth.port}/lol-champ-select/v1/session`,
          {
            method: 'GET',
            rejectUnauthorized: false,
            timeout: 650,
            headers: {
              Authorization: `Basic ${auth.auth}`,
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
      watch: {
        ignored: ['**/src-tauri/**'],
      },
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
