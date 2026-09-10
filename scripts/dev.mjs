import { spawn, execSync } from 'node:child_process';
import http from 'node:http';

const API_PORT = process.env.API_PORT || 5174;
const CLIENT_PORT = process.env.CLIENT_PORT || 5173;

let apiProcess = null;
let viteProcess = null;
let isShuttingDown = false;

function killProcess(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch (e) {
    // Process might already be dead
  }
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n[dev] SHUTTING_DOWN: Terminating child processes...');
  killProcess(viteProcess?.pid);
  killProcess(apiProcess?.pid);
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

function checkApiHealth() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${API_PORT}/api/health`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            if (json.ready) resolve(true);
            else resolve(false);
          } catch {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  console.log('[dev] STARTING_API on port', API_PORT);
  
  const npmCmd = process.platform === 'win32' ? 'npm' : 'npm';
  const isWin = process.platform === 'win32';
  
  apiProcess = spawn(npmCmd, ['run', 'dev:api'], {
    stdio: 'inherit',
    env: { ...process.env, API_PORT },
    detached: !isWin, // For negative PID killing on POSIX
    shell: isWin
  });

  apiProcess.on('exit', (code) => {
    if (isShuttingDown) return;
    console.error(`[dev] API_FAILED: API server exited with code ${code}`);
    shutdown(1);
  });

  console.log('[dev] WAITING_FOR_API...');
  const timeoutMs = 10000;
  const startTime = Date.now();
  let apiReady = false;

  while (Date.now() - startTime < timeoutMs) {
    if (await checkApiHealth()) {
      apiReady = true;
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  if (!apiReady) {
    console.error(`[dev] API_FAILED: API server failed to become ready within ${timeoutMs}ms.`);
    shutdown(1);
    return;
  }

  console.log('[dev] API_READY');
  console.log('[dev] STARTING_CLIENT on port', CLIENT_PORT);

  viteProcess = spawn(npmCmd, ['run', 'dev:client'], {
    stdio: 'inherit',
    env: { ...process.env, API_PORT, CLIENT_PORT },
    detached: !isWin,
    shell: isWin
  });

  viteProcess.on('exit', (code) => {
    if (isShuttingDown) return;
    console.error(`[dev] CLIENT_FAILED: Vite exited with code ${code}`);
    shutdown(1);
  });

  console.log('[dev] READY');
}

main().catch((err) => {
  console.error('[dev] Orchestrator error:', err);
  shutdown(1);
});
