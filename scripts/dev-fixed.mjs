import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const runner = isWindows ? 'npm.cmd' : 'npm';
const apiPort = process.env.PORT || '3000';
const clientPort = process.env.CLIENT_PORT || '5173';

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

const children = [
  spawnCommand(['run', 'dev:server'], {
    env: { ...process.env, PORT: apiPort, PORT_STRICT: '1' },
    stdio: 'inherit',
  }),
  spawnCommand(['--prefix', 'client', 'run', 'dev', '--', '--port', clientPort],
    {
      env: { ...process.env, API_PORT: apiPort },
      stdio: 'inherit',
    }),
];

console.log(`[Dev Fixed] API: http://localhost:${apiPort}`);
console.log(`[Dev Fixed] Client: http://localhost:${clientPort}`);

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;

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
