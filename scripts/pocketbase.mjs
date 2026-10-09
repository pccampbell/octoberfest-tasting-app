import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

try {
  loadEnvFile('.env');
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
const binary = resolve('.tools', process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
const child = spawn(
  binary,
  [
    'serve',
    '--http=0.0.0.0:8090',
    '--dir=pb_data',
    '--publicDir=dist',
    '--migrationsDir=pb_migrations',
    '--hooksDir=pb_hooks',
    '--automigrate=0',
  ],
  { stdio: 'inherit' },
);
child.on('error', () => {
  console.error('Run npm run setup:pb first.');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 0;
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
