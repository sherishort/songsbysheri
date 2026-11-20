// The About Sheri page: songsbysheri.com/about
// Its words are in content/about.html; the look comes from the home page.

import { aboutPage } from '../lib/pages.mjs';

export default async (req) => {
  const origin = new URL(req.url).origin;
  const [home, words] = await Promise.all([fetch(origin + '/'), fetch(origin + '/content/about.html')]);
  if (!home.ok || !words.ok) return Response.redirect(origin + '/#about', 302);

  return new Response(aboutPage(await home.text(), await words.text(), origin), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
      'netlify-cdn-cache-control': 'public, durable, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};

export const config = { path: ['/about', '/about/'] };
