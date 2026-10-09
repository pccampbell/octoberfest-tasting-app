import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  stdio: 'inherit',
});
if (build.status !== 0) process.exit(build.status ?? 1);
const binary = resolve('.tools', process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
const dir = resolve('.test-data', `run-${Date.now()}`);
await mkdir(dir, { recursive: true });
const credentials = {
  email: 'isolated-host@example.invalid',
  password: randomBytes(32).toString('hex'),
  dir,
};
const admin = spawnSync(
  binary,
  [
    'superuser',
    'create',
    credentials.email,
    credentials.password,
    `--dir=${dir}`,
    '--migrationsDir=pb_migrations',
    '--hooksDir=pb_hooks',
  ],
  { encoding: 'utf8' },
);
if (admin.status !== 0)
  throw new Error(admin.stderr || 'Could not initialize isolated test administrator.');
await writeFile('.test-data/test-admin.json', JSON.stringify(credentials));
const child = spawn(
  binary,
  [
    'serve',
    '--http=127.0.0.1:8091',
    `--dir=${dir}`,
    '--publicDir=dist',
    '--migrationsDir=pb_migrations',
    '--hooksDir=pb_hooks',
    '--automigrate=0',
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, PUBLIC_APP_URL: 'http://192.0.2.20:8091' },
  },
);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => {
  process.exitCode = code ?? 0;
});
