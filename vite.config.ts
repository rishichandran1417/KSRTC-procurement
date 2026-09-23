import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { processChatRequest } from './api/_chatHandler.js';

// Vite dev configuration with local API endpoints
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, val] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }

  return {
    server: {
      host: true,
      port: 5173,
      hmr: {
        host: 'localhost',
        clientPort: 5173,
      },
    },
    plugins: [
      react(),
      {
        name: 'local-api-chat-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/chat' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', (chunk) => {
                bodyStr += chunk;
              });
              req.on('end', async () => {
                try {
                  const { message, context } = JSON.parse(bodyStr || '{}');
                  if (!message || typeof message !== 'string') {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Missing or invalid "message" in request body.' }));
                    return;
                  }

                  const result = await processChatRequest(message, context);
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify(
                      result.error
                        ? { text: `[SCION Service Note]: ${result.error}`, error: result.error }
                        : { text: result.text }
                    )
                  );
                } catch (err: any) {
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify({
                      text: `[SCION Server Error]: ${err?.message || 'Could not reach server endpoint'}`,
                    })
                  );
                }
              });
              return;
            }
            next();
          });
        },
      },
    ],
  };
});
