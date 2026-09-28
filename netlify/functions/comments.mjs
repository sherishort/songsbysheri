// Visitor comments. New comments wait in "pending/" until Sheri approves
// them on the stats page; only approved ones are ever sent to visitors.
import { randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const SLUG = /^[a-z0-9-]{1,80}$/;
const MAX_NAME = 40;
const MAX_MESSAGE = 500;

const clean = (s, max) => typeof s === 'string'
  ? s.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, max)
  : '';

export default async (req) => {
  const store = getStore({ name: 'song-comments', consistency: 'strong' });

  if (req.method === 'GET') {
    const { blobs } = await store.list({ prefix: 'approved/' });
    const list = await Promise.all(blobs.map(({ key }) => store.get(key, { type: 'json' })));
    const bySong = {};
    list.filter(Boolean)
      .sort((a, b) => a.created.localeCompare(b.created))
      .forEach(({ song, name, message, created }) => {
        (bySong[song] = bySong[song] || []).push({ name, message, created });
      });
    return Response.json(bySong, { headers: { 'cache-control': 'no-store' } });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch { return new Response('Bad request', { status: 400 }); }
  if (!body || typeof body !== 'object') return new Response('Bad request', { status: 400 });

  // The hidden "website" field is invisible to people; only robots fill it in.
  // Tell them it worked so they move on, but keep nothing.
  if (body.website) return new Response(null, { status: 204 });

  const song = body.song;
  const name = clean(body.name, MAX_NAME);
  const message = clean(body.message, MAX_MESSAGE);
  if (typeof song !== 'string' || !SLUG.test(song) || !name || !message) {
    return new Response('Bad request', { status: 400 });
  }

  const id = randomUUID();
  await store.setJSON('pending/' + id, { id, song, name, message, created: new Date().toISOString() });
  return new Response(null, { status: 204 });
};

export const config = { path: '/api/comments' };
