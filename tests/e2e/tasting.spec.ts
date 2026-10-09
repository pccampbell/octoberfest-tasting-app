import { test, expect, type Page } from '@playwright/test';
import PocketBase from 'pocketbase';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

const origin = 'http://127.0.0.1:8091';
const admin = new PocketBase(origin);
admin.autoCancellation(false);
let beers: { id: string; name: string }[];
const identityKey = 'oktoberfest.identity.v1';
async function guest(name = 'Alex') {
  const pb = new PocketBase(origin);
  pb.autoCancellation(false);
  const email = `g-${randomBytes(16).toString('hex')}@tasting.invalid`;
  const secret = randomBytes(32).toString('hex');
  await pb.collection('guests').create({
    email,
    password: secret,
    passwordConfirm: secret,
    display_name: name,
  });
  await pb.collection('guests').authWithPassword(email, secret);
  return pb;
}
async function join(page: Page, name: string) {
  await page.goto('/join');
  await page.getByLabel('What should we call you?').fill(name);
  await page.getByRole('button', { name: 'Join the Tasting' }).click();
  await expect(page.getByRole('heading', { name: 'The beer lineup' })).toBeVisible();
  await expect(page.locator('.beer-card')).toHaveCount(3);
}
async function rate(page: Page, name: string, score: number, notes: string) {
  await page.getByRole('button', { name: `Rate ${name}`, exact: true }).click();
  await page.getByRole('button', { name: `Score ${score} out of 10`, exact: true }).click();
  await page.getByLabel('A little tasting note').fill(notes);
  await page.getByRole('button', { name: 'Save my rating' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('status')).toContainText('Saved!');
}
test.beforeAll(async () => {
  const credentials = JSON.parse(await readFile('.test-data/test-admin.json', 'utf8'));
  await admin.collection('_superusers').authWithPassword(credentials.email, credentials.password);
});
test.beforeEach(async () => {
  for (const collection of ['ratings', 'guests', 'beers']) {
    for (const record of await admin.collection(collection).getFullList())
      await admin.collection(collection).delete(record.id);
  }
  beers = [];
  for (const [i, name] of ['Golden Festbier', 'Autumn Märzen', 'Harvest Helles'].entries()) {
    beers.push(
      await admin.collection('beers').create({
        name,
        brewery: 'Test brewery',
        style: 'Festbier',
        abv: 6.1,
        sort_order: i,
        is_active: true,
      }),
    );
  }
});

test('real API enforces scores, note limits, guest ownership, and unique ratings', async () => {
  const a = await guest();
  const b = await guest();
  expect(a.authStore.record!.id).not.toBe(b.authStore.record!.id);
  const payload = {
    guest: a.authStore.record!.id,
    beer: beers[0].id,
    score: 8,
    notes: 'Private caramel note',
  };
  for (const score of [0, 11, 1.5])
    await expect(a.collection('ratings').create({ ...payload, score })).rejects.toMatchObject({
      status: 400,
    });
  await expect(
    a.collection('ratings').create({ ...payload, notes: 'x'.repeat(301) }),
  ).rejects.toMatchObject({ status: 400 });
  const rating = await a.collection('ratings').create(payload);
  await expect(a.collection('ratings').create(payload)).rejects.toMatchObject({
    status: 400,
  });
  expect(await a.collection('ratings').getFullList()).toHaveLength(1);
  expect(await b.collection('ratings').getFullList()).toHaveLength(0);
  await expect(b.collection('ratings').getOne(rating.id)).rejects.toMatchObject({ status: 404 });
  await expect(b.collection('ratings').update(rating.id, { score: 2 })).rejects.toMatchObject({
    status: 404,
  });
  await expect(b.collection('ratings').delete(rating.id)).rejects.toMatchObject({ status: 404 });
  await expect(
    a.collection('ratings').update(rating.id, { guest: b.authStore.record!.id }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    a.collection('ratings').update(rating.id, { beer: beers[1].id }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(b.collection('ratings').create(payload)).rejects.toMatchObject({
    status: 400,
  });
  const anonymous = new PocketBase(origin);
  expect(await anonymous.collection('ratings').getFullList()).toEqual([]);
  await expect(anonymous.collection('ratings').create(payload)).rejects.toMatchObject({
    status: 400,
  });
  await expect(
    a.collection('beers').create({ name: 'Intruder', is_active: true }),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    a.collection('beers').update(beers[0].id, { name: 'Intruder' }),
  ).rejects.toMatchObject({ status: 403 });
  await expect(a.collection('guests').getFullList()).rejects.toMatchObject({
    status: 403,
  });
  await expect(a.collection('guests').getOne(b.authStore.record!.id)).rejects.toMatchObject({
    status: 404,
  });
  await expect(
    a.collection('guests').update(b.authStore.record!.id, { display_name: 'Intruder' }),
  ).rejects.toMatchObject({ status: 403 });
  expect((await a.collection('guests').getOne(a.authStore.record!.id)).display_name).toBe('Alex');
  const aggregates = await anonymous.collection('beer_results').getFullList();
  const json = JSON.stringify(aggregates);
  for (const secret of [
    'Private caramel note',
    a.authStore.record!.id,
    'tasting.invalid',
    'notes',
    'guest',
    'email',
  ])
    expect(json).not.toContain(secret);
  expect(aggregates.find((r) => r.id === beers[0].id)).toMatchObject({
    average_score: 8,
    rating_count: 1,
  });
  expect(aggregates.find((r) => r.id === beers[1].id)?.rating_count).toBe(0);
  await expect(admin.collection('beers').delete(beers[0].id)).rejects.toMatchObject({
    status: 400,
  });
  await a.collection('ratings').update(rating.id, { score: 10, notes: 'Updated' });
  expect((await anonymous.collection('beer_results').getOne(beers[0].id)).average_score).toBe(10);
  await a.collection('ratings').delete(rating.id);
  expect((await anonymous.collection('beer_results').getOne(beers[0].id)).rating_count).toBe(0);
});

test('three independent browsers persist and edit ratings; dashboard calculates exact aggregates', async ({
  browser,
  page,
}) => {
  const contexts = await Promise.all([0, 1, 2].map(() => browser.newContext()));
  try {
    for (const [i, context] of contexts.entries()) {
      const p = await context.newPage();
      await join(p, i === 2 ? 'Sam' : 'Alex');
      await rate(p, 'Golden Festbier', [7, 5, 9][i], `Guest ${i}: toasted malt`);
      await rate(p, 'Autumn Märzen', [6, 8, 7][i], `Guest ${i}: amber`);
      await p.getByRole('button', { name: 'Edit rating for Golden Festbier' }).click();
      await expect(p.getByLabel('A little tasting note')).toHaveValue(`Guest ${i}: toasted malt`);
      await p
        .getByRole('button', {
          name: `Score ${[8, 6, 10][i]} out of 10`,
          exact: true,
        })
        .click();
      await p.getByRole('button', { name: 'Update rating' }).click();
      await expect(p.getByRole('dialog')).not.toBeVisible();
      await p.reload();
      await expect(p.locator('.progress-right')).toContainText('2 of 3 beers tasted');
      await p.getByRole('button', { name: /My Rankings/ }).click();
      await expect(p.locator('.beer-card')).toHaveCount(2);
      await expect(p.locator('.beer-card').filter({ hasText: 'Golden Festbier' })).toContainText(
        `${[8, 6, 10][i]}/10`,
      );
    }
    expect(await admin.collection('guests').getFullList()).toHaveLength(3);
    expect(await admin.collection('ratings').getFullList()).toHaveLength(6);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/results');
    await expect(page.getByTestId('result-Golden Festbier')).toContainText('8.0');
    await expect(page.getByTestId('result-Autumn Märzen')).toContainText('7.0');
    await expect(page.getByTestId('result-Harvest Helles')).toContainText('Not yet rated');
    await expect(page.locator('.stat').nth(0)).toContainText('3');
    await expect(page.locator('.stat').nth(1)).toContainText('6');
    expect(await page.locator('.leaderboard-row h3').allTextContents()).toEqual([
      'Golden Festbier',
      'Autumn Märzen',
      'Harvest Helles',
    ]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: 'test-results/results-desktop.png',
      fullPage: true,
    });
  } finally {
    for (const context of contexts) await context.close();
  }
});

test('clearing a rating restores untasted state; mobile layout fits 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await join(page, 'Mobile taster');
  await rate(page, 'Golden Festbier', 10, 'My favorite');
  await page.getByRole('button', { name: /Already rated/ }).click();
  await expect(page.locator('.beer-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Edit rating for Golden Festbier' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Clear this rating' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: /Not yet tasted/ }).click();
  await expect(page.locator('.beer-card')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: 'test-results/taste-mobile.png',
    fullPage: true,
  });
});

test('double submission and lost registration response recover the same identity', async ({
  page,
}) => {
  await page.goto('/join');
  await page.getByLabel('What should we call you?').fill('Retry taster');
  let interrupted = false;
  await page.route('**/api/collections/guests/records', async (route) => {
    if (route.request().method() === 'POST' && !interrupted) {
      interrupted = true;
      await route.fetch(); // Persist the identity, then lose the response.
      await route.abort('failed');
    } else await route.continue();
  });
  await page
    .getByRole('button', { name: 'Join the Tasting' })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(page.getByRole('alert')).toBeVisible();
  await page.unroute('**/api/collections/guests/records');
  await page.reload();
  await expect(page.getByRole('link', { name: 'Continue as Retry taster' })).toBeVisible();
  expect(await admin.collection('guests').getFullList()).toHaveLength(1);
  await page.getByRole('link', { name: 'Continue as Retry taster' }).click();
  await rate(page, 'Golden Festbier', 8, 'Still me');
});

test('lost save response preserves the draft; retry creates no duplicate rating', async ({
  page,
}) => {
  await join(page, 'Careful taster');
  await page.getByRole('button', { name: 'Rate Golden Festbier', exact: true }).click();
  await page.getByRole('button', { name: 'Score 9 out of 10', exact: true }).click();
  await page.getByLabel('A little tasting note').fill('Never lose this note');
  let lost = false;
  await page.route('**/api/collections/ratings/records', async (route) => {
    if (route.request().method() === 'POST' && !lost) {
      lost = true;
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await page
    .getByRole('button', { name: 'Save my rating' })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('A little tasting note')).toHaveValue('Never lose this note');
  await page.unroute('**/api/collections/ratings/records');
  await page.getByRole('button', { name: 'Save my rating' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await admin.collection('ratings').getFullList()).toHaveLength(1);
  await expect(page.locator('.beer-card').filter({ hasText: 'Golden Festbier' })).toContainText(
    'Never lose this note',
  );
});

test('browser closure and expired tokens restore the same guest from saved credentials', async ({
  browser,
}) => {
  const first = await browser.newContext();
  const p = await first.newPage();
  await join(p, 'Returning taster');
  await rate(p, 'Golden Festbier', 7, 'Remember this');
  const original = (await admin.collection('guests').getFullList())[0].id;
  const state = await first.storageState();
  await first.close();
  for (const item of state.origins[0].localStorage)
    if (item.name === 'pocketbase_auth')
      item.value = JSON.stringify({ token: 'expired.token', record: null });
  const second = await browser.newContext({ storageState: state });
  try {
    const returned = await second.newPage();
    await returned.goto('/join');
    await expect(
      returned.getByRole('link', { name: 'Continue as Returning taster' }),
    ).toBeVisible();
    await returned.getByRole('link', { name: 'Continue as Returning taster' }).click();
    await expect(
      returned.locator('.beer-card').filter({ hasText: 'Golden Festbier' }),
    ).toContainText('Remember this');
    expect((await admin.collection('guests').getFullList())[0].id).toBe(original);
    expect(await admin.collection('guests').getFullList()).toHaveLength(1);
  } finally {
    await second.close();
  }
});

test('polling retains last results during an outage and recovers automatically', async ({
  page,
}) => {
  const a = await guest('Polling taster');
  const record = await a
    .collection('ratings')
    .create({ guest: a.authStore.record!.id, beer: beers[0].id, score: 6 });
  await page.goto('/results');
  await expect(page.getByTestId('result-Golden Festbier')).toContainText('6.0');
  await page.route('**/api/collections/beer_results/**', (route) => route.abort('failed'));
  await expect(page.getByRole('status')).toContainText('Connection paused');
  await expect(page.getByTestId('result-Golden Festbier')).toContainText('6.0');
  await a.collection('ratings').update(record.id, { score: 9 });
  await page.unroute('**/api/collections/beer_results/**');
  await expect(page.getByTestId('result-Golden Festbier')).toContainText('9.0');
  await expect(page.getByRole('status')).toContainText('LIVE FROM THE BEER HALL');
  await page.getByRole('button', { name: 'Hide rankings' }).click();
  await expect(page.getByText('The suspense is brewing.')).toBeVisible();
  await page.getByRole('button', { name: 'Reveal results' }).first().click();
  await expect(page.getByTestId('result-Golden Festbier')).toBeVisible();
});

test('production SPA routes, API/admin routing, QR, empty state, and inactive beers work', async ({
  page,
  request,
}) => {
  for (const path of ['/join', '/taste', '/results', '/qr']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('id="root"');
  }
  const health = await request.get('/api/health');
  expect(health.status()).toBe(200);
  expect(health.headers()['content-type']).toContain('application/json');
  expect((await request.get('/_/')).status()).toBe(200);
  expect((await request.get('/api/does-not-exist')).status()).toBe(404);
  await page.goto('/qr');
  await expect(
    page.getByRole('link', {
      name: 'http://192.0.2.20:8091/join',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('.qr-code svg')).toBeVisible();
  await page.screenshot({
    path: 'test-results/qr-desktop.png',
    fullPage: true,
  });
  await page.goto('/join');
  await page.screenshot({
    path: 'test-results/join-desktop.png',
    fullPage: true,
  });
  await admin.collection('beers').update(beers[2].id, { is_active: false });
  expect(await new PocketBase(origin).collection('beers').getFullList()).toHaveLength(2);
  await page.goto('/results');
  await expect(page.getByText('Your next pour could be the one.')).toBeVisible();
  for (const beer of beers) await admin.collection('beers').delete(beer.id);
  await page.goto('/join');
  await page.getByLabel('What should we call you?').fill('First arrival');
  await page.getByRole('button', { name: 'Join the Tasting' }).click();
  await expect(page.getByRole('heading', { name: 'The taps are almost ready.' })).toBeVisible();
});

test('interrupted registration before creation resumes from its pending credentials', async ({
  page,
}) => {
  const pending = {
    email: `g-${randomBytes(16).toString('hex')}@tasting.invalid`,
    secret: randomBytes(32).toString('hex'),
    name: 'Pending guest',
    registered: false,
  };
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: identityKey, value: JSON.stringify(pending) },
  );
  await page.goto('/join');
  await expect(page.getByRole('link', { name: 'Continue as Pending guest' })).toBeVisible();
  expect(await admin.collection('guests').getFullList()).toHaveLength(1);
  expect((await admin.collection('guests').getFullList())[0].email).toBe(pending.email);
});

test('guest registration validates names and prohibits email and administrative workflows', async () => {
  const pb = new PocketBase(origin);
  const email = `g-${randomBytes(16).toString('hex')}@tasting.invalid`;
  const password = randomBytes(32).toString('hex');
  const payload = {
    email,
    password,
    passwordConfirm: password,
    display_name: 'Valid name',
  };
  for (const display_name of ['', '   ', 'x'.repeat(41)])
    await expect(
      pb.collection('guests').create({ ...payload, display_name }),
    ).rejects.toMatchObject({ status: 400 });
  await expect(
    pb.collection('guests').create({ ...payload, verified: true }),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    pb.collection('guests').create({ ...payload, emailVisibility: true }),
  ).rejects.toMatchObject({ status: 400 });
  const record = await pb
    .collection('guests')
    .create({ ...payload, display_name: '  Valid name  ' });
  expect(record.display_name).toBe('Valid name');
  await expect(pb.collection('guests').requestPasswordReset(email)).rejects.toMatchObject({
    status: 403,
  });
  await expect(pb.collection('guests').requestVerification(email)).rejects.toMatchObject({
    status: 403,
  });
});

test('a missing old identity shows an error and never registers a silent replacement', async ({
  page,
}) => {
  await join(page, 'Keep my identity');
  const old = (await admin.collection('guests').getFullList())[0];
  await admin.collection('guests').delete(old.id);
  await page.reload();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await admin.collection('guests').getFullList()).toHaveLength(0);
  await expect(page.getByRole('button', { name: 'Join the Tasting' })).not.toBeVisible();
});
