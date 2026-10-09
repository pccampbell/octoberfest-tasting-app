import PocketBase from 'pocketbase';
import { readFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';

try {
  loadEnvFile('.env');
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
if (process.env.ALLOW_DEV_SEED !== 'yes')
  throw new Error('Development-only: set ALLOW_DEV_SEED=yes to explicitly allow sample beers.');
if (!process.env.PB_ADMIN_EMAIL || !process.env.PB_ADMIN_PASSWORD)
  throw new Error(
    'Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD locally. These are never frontend variables.',
  );
const pb = new PocketBase(process.env.SEED_POCKETBASE_URL || 'http://127.0.0.1:8090');
await pb
  .collection('_superusers')
  .authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASSWORD);
const samples = JSON.parse(
  await readFile(new URL('../sample-data/beers.json', import.meta.url), 'utf8'),
);
for (const beer of samples) {
  const { items } = await pb.collection('beers').getList(1, 1, {
    filter: pb.filter('name = {:name} && brewery = {:brewery}', beer),
  });
  if (!items.length) await pb.collection('beers').create(beer);
}
console.log('Development sample lineup added. Existing beers and ratings preserved.');
