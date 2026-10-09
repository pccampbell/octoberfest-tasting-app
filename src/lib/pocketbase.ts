import PocketBase, { ClientResponseError } from 'pocketbase';
import type { Guest, Rating } from './types';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || window.location.origin);
pb.autoCancellation(false);
export const identityKey = 'oktoberfest.identity.v1';
type Identity = {
  email: string;
  secret: string;
  name: string;
  registered: boolean;
};

export function storedIdentity(): Identity | null {
  const raw = localStorage.getItem(identityKey);
  if (!raw) return null;
  let value: Identity;
  try {
    value = JSON.parse(raw) as Identity;
  } catch {
    throw new Error('Your saved tasting identity is damaged. Please ask the host for help.');
  }
  if (
    !value ||
    !/^g-[a-f0-9]{32}@tasting\.invalid$/.test(value.email) ||
    !/^[a-f0-9]{64}$/.test(value.secret) ||
    !value.name ||
    typeof value.registered !== 'boolean'
  )
    throw new Error('Your saved tasting identity is damaged. Please ask the host for help.');
  return value;
}

const random = (length: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(length)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
let sessionRequest: Promise<Guest | null> | null = null;

async function authenticate(identity: Identity): Promise<Guest> {
  const result = await pb
    .collection('guests')
    .authWithPassword<Guest>(identity.email, identity.secret);
  // A successful authentication also resolves a previously interrupted creation.
  localStorage.setItem(
    identityKey,
    JSON.stringify({
      ...identity,
      name: result.record.display_name,
      registered: true,
    }),
  );
  return result.record;
}

async function restore(): Promise<Guest | null> {
  const identity = storedIdentity();
  if (!identity) {
    pb.authStore.clear();
    return null;
  }
  if (pb.authStore.isValid) {
    try {
      return (await pb.collection('guests').authRefresh<Guest>()).record;
    } catch (error) {
      if (!(error instanceof ClientResponseError) || ![400, 401, 403].includes(error.status))
        throw error;
    }
  }
  try {
    return await authenticate(identity);
  } catch (error) {
    if (identity.registered || !(error instanceof ClientResponseError) || error.status !== 400)
      throw error;
  }
  try {
    await pb.collection('guests').create({
      email: identity.email,
      password: identity.secret,
      passwordConfirm: identity.secret,
      display_name: identity.name,
    });
  } catch (error) {
    // A lost response or another tab may have already created this exact identity.
    if (!(error instanceof ClientResponseError) || error.status !== 400) throw error;
  }
  return authenticate(identity);
}

export function restoreGuest() {
  if (!sessionRequest)
    sessionRequest = restore().finally(() => {
      sessionRequest = null;
    });
  return sessionRequest;
}

export function joinGuest(name: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 40)
    throw new Error('Please enter a name between 1 and 40 characters.');
  // Store before any network call. Retrying never generates another identity.
  if (!storedIdentity())
    localStorage.setItem(
      identityKey,
      JSON.stringify({
        email: `g-${random(16)}@tasting.invalid`,
        secret: random(32),
        name: trimmed,
        registered: false,
      } satisfies Identity),
    );
  return restoreGuest();
}

export async function withGuest<T>(action: () => Promise<T>): Promise<T> {
  if (!pb.authStore.isValid && !(await restoreGuest()))
    throw new Error('Please join the tasting first.');
  try {
    return await action();
  } catch (error) {
    if (!(error instanceof ClientResponseError) || error.status !== 401) throw error;
    await restoreGuest();
    return action();
  }
}

export async function saveRating(beer: string, score: number, notes: string): Promise<Rating> {
  if (!Number.isInteger(score) || score < 1 || score > 10 || notes.length > 300)
    throw new Error('Choose a whole score from 1 to 10 and keep notes under 300 characters.');
  return withGuest(async () => {
    const guest = pb.authStore.record!.id;
    const filter = pb.filter('guest = {:guest} && beer = {:beer}', {
      guest,
      beer,
    });
    const find = async () =>
      (await pb.collection('ratings').getList<Rating>(1, 1, { filter })).items[0];
    const existing = await find();
    if (existing) return pb.collection('ratings').update<Rating>(existing.id, { score, notes });
    try {
      return await pb.collection('ratings').create<Rating>({ guest, beer, score, notes });
    } catch (error) {
      if (!(error instanceof ClientResponseError) || error.status !== 400) throw error;
      const concurrent = await find();
      if (!concurrent) throw error;
      return pb.collection('ratings').update<Rating>(concurrent.id, { score, notes });
    }
  });
}

export function friendlyError(error: unknown) {
  if (error instanceof DOMException && ['SecurityError', 'QuotaExceededError'].includes(error.name))
    return 'Your browser couldn’t save your tasting identity. Enable site storage or ask the host for help.';
  if (error instanceof ClientResponseError) {
    if (error.status === 0)
      return 'We couldn’t reach the tasting table. Check your connection and try again.';
    if (error.status === 429)
      return 'A few too many requests at once. Wait a moment, then try again.';
    if ([401, 403].includes(error.status))
      return 'Your session needs attention. Try again or ask the host for help.';
    if (error.status === 400)
      return 'We couldn’t complete that request. Try again or ask the host for help.';
    return 'The tasting server is having a moment. Please try again.';
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
