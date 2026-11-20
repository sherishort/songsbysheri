// One page for each song: songsbysheri.com/songs/<song-id>
//
// Built from the song's block on the home page (see netlify/lib/pages.mjs),
// so there is nothing extra to do when a song is added. Link previews on
// Facebook, texts and email show the song's cover art and title.

import { findSong, songPage } from '../lib/pages.mjs';

const ID = /^[a-z0-9-]{1,80}$/;

export default async (req, context) => {
  const origin = new URL(req.url).origin;
  const id = String((context.params && context.params.id) || '').toLowerCase().replace(/\/+$/, '');
  if (!ID.test(id)) return Response.redirect(origin + '/', 302);

  const home = await fetch(origin + '/');
  if (!home.ok) return Response.redirect(origin + '/#' + id, 302);
  const html = await home.text();

  const song = findSong(html, id);
  if (!song) return Response.redirect(origin + '/', 302);

  return new Response(songPage(html, song, origin), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
      'netlify-cdn-cache-control': 'public, durable, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};

export const config = { path: ['/songs/:id', '/songs/:id/'] };
