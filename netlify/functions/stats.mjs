// Owner-only: returns every song's play and heart counts.
import { getStore } from '@netlify/blobs';
import { isOwner } from '../lib/owner.mjs';

export default async (req) => {
  if (!isOwner(req)) return new Response('Not found', { status: 404 });

  const store = getStore({ name: 'song-stats-2', consistency: 'strong' });
  const { blobs } = await store.list();
  const songs = {};
  await Promise.all(blobs.map(async ({ key }) => {
    songs[key] = await store.get(key, { type: 'json' });
  }));
  return Response.json(songs, { headers: { 'cache-control': 'no-store' } });
};

export const config = { path: '/api/stats' };
