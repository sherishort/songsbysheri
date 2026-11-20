// Sheri's real estate listing songs, all on one page: songsbysheri.com/listings
// A song shows here when its <article> on the home page has data-kind="listing".

import { findSong, listingIds, listingsPage } from '../lib/pages.mjs';

export default async (req) => {
  const origin = new URL(req.url).origin;
  const home = await fetch(origin + '/');
  if (!home.ok) return Response.redirect(origin + '/#ocala', 302);
  const html = await home.text();
  const songs = listingIds(html).map((id) => findSong(html, id)).filter(Boolean);

  return new Response(listingsPage(html, songs, origin), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
      'netlify-cdn-cache-control': 'public, durable, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};

export const config = { path: ['/listings', '/listings/'] };
