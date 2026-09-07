/**
 * Local development server for api/ handlers.
 * Run with: node --loader ts-node/esm scripts/api-server.mjs
 * Or simply: npx tsx scripts/api-server.mjs
 *
 * This file is NOT deployed to Vercel — only used for local dev.
 * Vercel uses api/ serverless functions directly.
 */
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';

// Load .env.local if present
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
        const val = trimmed.slice(eq + 1).trim();
        if (!(key in process.env)) process.env[key] = val;
      }
    } catch { /* file not found */ }
  }
}

loadEnv();

const PORT = 5174;

async function main() {
  // Dynamically import the handler (compiled via tsx)
  const handlerPath = pathToFileURL(resolve(root, 'api/ai.ts')).href;
  
  // Use tsx to run the TypeScript handler
  const { default: handler } = await import(handlerPath);

  const server = http.createServer(async (req, res) => {
    if (req.url !== '/api/ai' && req.url !== '/api/ai/') {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405);
      res.end('Method not allowed');
      return;
    }

    // Read body
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      // Shim VercelRequest/VercelResponse
      const parsedBody = (() => { try { return JSON.parse(body); } catch { return {}; } })();
      const mockReq = { method: 'POST', body: parsedBody };
      const mockRes = {
        _status: 200,
        _headers: {},
        setHeader(k, v) { this._headers[k] = v; res.setHeader(k, v); },
        status(code) { this._status = code; return this; },
        json(data) { res.writeHead(this._status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); return this; },
        end() { res.end(); return this; },
      };
      await handler(mockReq, mockRes);
    });
  });

  server.listen(PORT, () => {
    console.log(`[api-server] Local AI API listening on http://localhost:${PORT}`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
