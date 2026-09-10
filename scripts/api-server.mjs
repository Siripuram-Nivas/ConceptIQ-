/**
 * Local development server for api/ handlers.
 * Run with: node --loader ts-node/esm scripts/api-server.mjs
 * Or simply: npx tsx scripts/api-server.mjs
 *
 * This file is NOT deployed to Vercel — only used for local dev.
 */
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const f of envFiles) {
    try {
      const content = readFileSync(resolve(root, f), 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = val;
      }
    } catch { /* file not found */ }
  }
}
loadEnv();

const PORT = process.env.API_PORT || 5174;

function extendResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };
  return res;
}

async function main() {
  const aiHandlerPath = pathToFileURL(resolve(root, 'api/ai.ts')).href;
  const healthHandlerPath = pathToFileURL(resolve(root, 'api/health.ts')).href;
  
  const { default: aiHandler } = await import(aiHandlerPath);
  const { default: healthHandler } = await import(healthHandlerPath);

  const server = http.createServer(async (req, res) => {
    // Inject a request ID
    req.headers['x-request-id'] = req.headers['x-request-id'] || crypto.randomUUID();
    const extendedRes = extendResponse(res);

    if (req.url === '/api/health' || req.url === '/api/health/') {
      return healthHandler(req, extendedRes);
    }

    if (req.url === '/api/ai' || req.url === '/api/ai/') {
      // Read body for ai handler
      let bodyStr = '';
      req.on('data', chunk => { bodyStr += chunk; });
      req.on('end', async () => {
        try {
          req.body = bodyStr ? JSON.parse(bodyStr) : {};
        } catch {
          req.body = bodyStr;
        }
        await aiHandler(req, extendedRes);
      });
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`[api-server] Error: Port ${PORT} is already in use.`);
      process.exit(1);
    } else {
      console.error(`[api-server] Error:`, e);
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`[api-server] Local API listening on http://localhost:${PORT}`);
    console.log(`[api-server] GEMINI_API_KEY_PRESENT=${!!process.env.GEMINI_API_KEY}`);
    console.log(`[api-server] GEMINI_MODEL=${process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'}`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
