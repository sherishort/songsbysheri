// Owner-only: returns every song's play and heart counts when given the
// secret key. Only a hash of the key lives here, so the public repository
// never reveals it.
import { createHash, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const KEY_HASH = Buffer.from('769596d932f1a0979c90261549a0bd780fb900933265d555f497de6a7604766c', 'hex');

const allowed = (key) => {
  if (typeof key !== 'string' || !key) return false;
  return timingSafeEqual(createHash('sha256').update(key).digest(), KEY_HASH);
};

export default async (req) => {
  if (!allowed(req.headers.get('x-stats-key'))) return new Response('Not found', { status: 404 });

  const store = getStore({ name: 'song-stats', consistency: 'strong' });
  const { blobs } = await store.list();
  const songs = {};
  await Promise.all(blobs.map(async ({ key }) => {
    songs[key] = await store.get(key, { type: 'json' });
  }));
  return Response.json(songs, { headers: { 'cache-control': 'no-store' } });
};

export const config = { path: '/api/stats' };
