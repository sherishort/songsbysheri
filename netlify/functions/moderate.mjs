// Owner-only: list comments and approve, remove or delete them.
import { getStore } from '@netlify/blobs';
import { isOwner } from '../lib/owner.mjs';

const ID = /^[0-9a-f-]{36}$/;

const all = async (store, prefix) => {
  const { blobs } = await store.list({ prefix });
  const list = await Promise.all(blobs.map(({ key }) => store.get(key, { type: 'json' })));
  return list.filter(Boolean).sort((a, b) => b.created.localeCompare(a.created));
};

export default async (req) => {
  if (!isOwner(req)) return new Response('Not found', { status: 404 });
  const store = getStore({ name: 'song-comments', consistency: 'strong' });

  if (req.method === 'GET') {
    const [pending, approved] = await Promise.all([all(store, 'pending/'), all(store, 'approved/')]);
    return Response.json({ pending, approved }, { headers: { 'cache-control': 'no-store' } });
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch { return new Response('Bad request', { status: 400 }); }
  const { action, id } = body || {};
  if (typeof id !== 'string' || !ID.test(id)) return new Response('Bad request', { status: 400 });

  if (action === 'approve') {
    const c = await store.get('pending/' + id, { type: 'json' });
    if (!c) return new Response('Not found', { status: 404 });
    await store.setJSON('approved/' + id, c);
    await store.delete('pending/' + id);
  } else if (action === 'delete') {
    await store.delete('pending/' + id);
    await store.delete('approved/' + id);
  } else {
    return new Response('Bad request', { status: 400 });
  }
  return new Response(null, { status: 204 });
};

export const config = { path: '/api/moderate' };
