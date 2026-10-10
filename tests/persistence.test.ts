import { it, expect } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, readdir, cp } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve, join } from 'node:path';
import PocketBase from 'pocketbase';

it('ratings survive server restarts, repeated migrations, and built-in backup restoration', async () => {
  const binary = resolve('.tools', process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
  const root = resolve('.test-data', `persistence-${Date.now()}`);
  const dir = join(root, 'original');
  const restored = join(root, 'restored');
  const initialMigrations = join(root, 'initial-migrations');
  await mkdir(dir, { recursive: true });
  await mkdir(initialMigrations, { recursive: true });
  await cp('pb_migrations/1791500000_tasting.js', join(initialMigrations, '1791500000_tasting.js'));
  const email = 'backup-host@example.invalid';
  const password = randomBytes(32).toString('hex');
  const run = (args: string[], migrations = 'pb_migrations') => {
    const command = spawnSync(
      binary,
      [...args, `--dir=${dir}`, `--migrationsDir=${migrations}`, '--hooksDir=pb_hooks'],
      { encoding: 'utf8' },
    );
    expect(command.status, command.stderr).toBe(0);
  };
  run(['migrate', 'up'], initialMigrations);
  run(['superuser', 'create', email, password], initialMigrations);
  let server: ChildProcess | null = null;
  const pb = new PocketBase('http://127.0.0.1:8092');
  pb.autoCancellation(false);
  async function start(data: string, migrations = 'pb_migrations') {
    server = spawn(
      binary,
      [
        'serve',
        '--http=127.0.0.1:8092',
        `--dir=${data}`,
        `--migrationsDir=${migrations}`,
        '--hooksDir=pb_hooks',
        '--automigrate=0',
      ],
      { stdio: 'ignore' },
    );
    for (let i = 0; i < 100; i++) {
      try {
        await pb.health.check();
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw new Error('Isolated PocketBase did not start.');
  }
  async function stop() {
    if (server) {
      const exited = once(server, 'exit');
      server.kill();
      await exited;
      server = null;
    }
  }
  try {
    await start(dir, initialMigrations);
    await pb.collection('_superusers').authWithPassword(email, password);
    const beer = await pb.collection('beers').create({ name: 'Backup Festbier', is_active: true });
    const guestEmail = `g-${randomBytes(16).toString('hex')}@tasting.invalid`;
    const g = await pb.collection('guests').create({
      email: guestEmail,
      password,
      passwordConfirm: password,
      display_name: 'Persistent guest',
    });
    const rating = await pb.collection('ratings').create({
      guest: g.id,
      beer: beer.id,
      score: 9,
      notes: 'Survives a restart and restore',
    });
    await stop();
    run(['migrate', 'up']); // Ordinary deployment never resets data.
    run(['migrate', 'up']); // Reapplying does not duplicate fields or reset records.
    await start(dir);
    await pb.collection('_superusers').authWithPassword(email, password);
    expect(await pb.collection('ratings').getOne(rating.id)).toMatchObject({
      score: 9,
      notes: rating.notes,
      guest: g.id,
    });
    expect(await pb.collection('beers').getOne(beer.id)).toMatchObject({ country: '', state: '' });
    await pb.collection('beers').update(beer.id, { country: 'US', state: 'Wisconsin' });
    expect(await pb.collection('beer_results').getOne(beer.id)).toMatchObject({
      country: 'US',
      state: 'Wisconsin',
      average_score: 9,
      rating_count: 1,
    });
    const backupName = 'verified-tasting-backup.zip';
    await pb.backups.create(backupName);
    const backupPath = join(dir, 'backups', backupName);
    for (let i = 0; i < 100; i++) {
      if ((await readdir(join(dir, 'backups')).catch(() => [] as string[])).includes(backupName))
        break;
      await new Promise((r) => setTimeout(r, 100));
    }
    await stop();
    await mkdir(restored, { recursive: true });
    const extracted =
      process.platform === 'win32'
        ? spawnSync(
            'powershell.exe',
            [
              '-NoProfile',
              '-Command',
              `Expand-Archive -LiteralPath '${backupPath.replaceAll("'", "''")}' -DestinationPath '${restored.replaceAll("'", "''")}'`,
            ],
            { encoding: 'utf8' },
          )
        : spawnSync('unzip', ['-o', backupPath, '-d', restored], {
            encoding: 'utf8',
          });
    expect(extracted.status, extracted.stderr).toBe(0);
    await start(restored);
    await pb.collection('_superusers').authWithPassword(email, password);
    expect(await pb.collection('ratings').getOne(rating.id)).toMatchObject({
      score: 9,
      notes: rating.notes,
      guest: g.id,
    });
    expect(await pb.collection('party_stats').getOne('party_statistics')).toMatchObject({
      total_ratings: 1,
      participants: 1,
    });
    expect(await pb.collection('beer_results').getOne(beer.id)).toMatchObject({
      country: 'US',
      state: 'Wisconsin',
      average_score: 9,
      rating_count: 1,
    });
    await stop();
    // A stopped full-directory snapshot is also a safe, documented backup option.
    await cp(restored, join(root, 'stopped-snapshot'), { recursive: true });
    const assets = (await readdir('dist/assets')).filter((name) => name.endsWith('.js'));
    for (const asset of assets)
      expect(await readFile(join('dist/assets', asset), 'utf8')).not.toContain(password);
  } finally {
    await stop();
  }
});
