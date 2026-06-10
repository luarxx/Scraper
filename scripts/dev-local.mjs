import { spawn } from 'node:child_process';
import net from 'node:net';

const isWindows = process.platform === 'win32';
const runner = isWindows ? 'npm.cmd' : 'npm';

function shellEscape(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function spawnCommand(args, options) {
  if (!isWindows) {
    return spawn(runner, args, { ...options, shell: false });
  }

  const command = [runner, ...args.map(shellEscape)].join(' ');
  return spawn(command, [], { ...options, shell: true });
}

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        findAvailablePort(startPort + 1).then(resolve, reject);
        return;
      }

      reject(err);
    });

    server.once('listening', () => {
      server.close(() => resolve(startPort));
    });

    server.listen(startPort);
  });
}

function waitForPort(port, host = '127.0.0.1', timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function poll() {
      const sock = new net.Socket();
      sock.once('connect', () => {
        sock.destroy();
        resolve();
      });
      sock.once('error', () => {
        sock.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error(`Timeout waiting for ${host}:${port}`));
        } else {
          setTimeout(poll, 200);
        }
      });
      sock.connect(port, host);
    }
    poll();
  });
}

const apiPort = await findAvailablePort(Number(process.env.PORT || 3000));
const clientPort = await findAvailablePort(Number(process.env.CLIENT_PORT || 5173));
const serverArgs = ['run', 'dev:server'];
const clientArgs = ['--prefix', 'client', 'run', 'dev', '--', '--port', String(clientPort)];

const children = [
  spawnCommand(serverArgs, {
    env: { ...process.env, PORT: String(apiPort) },
    stdio: 'inherit',
  }),
];

console.log(`[Dev Local] API: http://localhost:${apiPort}`);
console.log('[Dev Local] Aguardando servidor ficar pronto...');
await waitForPort(apiPort);

children.push(spawnCommand(clientArgs, {
  env: { ...process.env, API_PORT: String(apiPort) },
  stdio: 'inherit',
}));

console.log(`[Dev Local] Client: http://localhost:${clientPort}`);

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    child.kill();
  }
  process.exit(code);
}

for (const child of children) {
  child.on('exit', (code) => {
    shutdown(code ?? 0);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
