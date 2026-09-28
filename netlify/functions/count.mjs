// Records a play or a heart for one song. Counts are private: nothing here
// returns them. See stats.mjs for the owner-only view.
import { getStore } from '@netlify/blobs';

const SLUG = /^[a-z0-9-]{1,80}$/;
const STEP = { play: ['plays', 1], heart: ['hearts', 1], unheart: ['hearts', -1] };

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch { return new Response('Bad request', { status: 400 }); }
  const song = body && body.song;
  const step = body && STEP[body.type];
  if (typeof song !== 'string' || !SLUG.test(song) || !step) {
    return new Response('Bad request', { status: 400 });
  }

  const [field, delta] = step;
  const store = getStore({ name: 'song-stats', consistency: 'strong' });

  // Read, bump, write only if nobody else wrote in between; retry if they did.
  for (let attempt = 0; attempt < 5; attempt++) {
    const found = await store.getWithMetadata(song, { type: 'json' });
    const counts = { plays: 0, hearts: 0, ...(found ? found.data : {}) };
    counts[field] = Math.max(0, (counts[field] || 0) + delta);
    const opts = found ? { onlyIfMatch: found.etag } : { onlyIfNew: true };
    const { modified } = await store.setJSON(song, counts, opts);
    if (modified) return new Response(null, { status: 204 });
  }
  return new Response('Busy, try again', { status: 503 });
};

export const config = { path: '/api/count' };
