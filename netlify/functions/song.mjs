// A link for one song: songsbysheri.com/song/<song-id>
//
// It serves the normal home page, but with that song's own title, words and
// cover art in the page's "link preview" tags, so Facebook, Messenger, texts
// and email show the song (not the whole site) and tapping the preview opens
// it. The page's own script then scrolls straight to the song and highlights it.
//
// Nothing to update when a song is added: the song's details are read from the
// home page itself, using its <article class="entry" id="..."> block.

const SITE = 'Songs by Sheri';
const ID = /^[a-z0-9-]{1,80}$/;

const esc = (s) => String(s)
  .replace(/&(?![a-zA-Z]+;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;')
  .replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const plain = (html) => html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const attr = (tag, name) => {
  const m = tag.match(new RegExp('\\s' + name + '="([^"]*)"'));
  return m ? m[1] : null;
};

// Pull one song's details out of the home page HTML. Returns null if not found.
export function findSong(html, id) {
  const start = html.indexOf('<article class="entry" id="' + id + '"');
  if (start < 0) return null;
  const end = html.indexOf('</article>', start);
  const block = html.slice(start, end < 0 ? undefined : end);
  const open = block.slice(0, block.indexOf('>') + 1);

  const title = attr(open, 'data-title') || id;
  const art = block.match(/<img class="art"[^>]*>/);
  const thumb = block.match(/<span class="thumb"><img[^>]*>/);
  const img = art ? art[0] : thumb ? thumb[0] : null;
  const ded = block.match(/<p class="dedication">([\s\S]*?)<\/p>/);

  return {
    id,
    title,
    image: img ? attr(img, 'src') : null,
    width: img ? attr(img, 'width') : null,
    height: img ? attr(img, 'height') : null,
    about: ded ? plain(ded[1]) : null,
  };
}

const setMeta = (html, key, value) => {
  const re = new RegExp('(<meta (?:property|name)="' + key.replace(/:/g, '\\:') + '" content=")[^"]*(">)');
  return html.replace(re, (_, a, b) => a + value + b);
};

// Rewrite the home page so its preview tags describe this one song.
export function songPage(html, song, origin) {
  const url = origin + '/song/' + song.id;
  const title = esc(song.title) + ' — ' + SITE;
  const desc = esc(song.about
    ? song.about
    : 'Listen to "' + song.title + '" by Sheryl Denise Long, with the lyrics.');

  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/, '<title>' + title + '</title>');
  out = out.replace(/(<link rel="canonical" href=")[^"]*(">)/, '$1' + url + '$2');
  out = setMeta(out, 'description', desc);
  out = setMeta(out, 'og:url', url);
  out = setMeta(out, 'og:title', title);
  out = setMeta(out, 'og:description', desc);
  out = setMeta(out, 'twitter:title', title);
  out = setMeta(out, 'twitter:description', desc);
  if (song.image) {
    const img = origin + '/' + song.image.replace(/^\/+/, '');
    out = setMeta(out, 'og:image', esc(img));
    out = setMeta(out, 'twitter:image', esc(img));
    if (song.width && song.height) {
      out = setMeta(out, 'og:image:width', song.width);
      out = setMeta(out, 'og:image:height', song.height);
    }
  }
  // The page lives at /song/<id>, so point its pictures, music and links back
  // at the site root, and tell the page's script which song to open.
  out = out.replace('<meta charset="UTF-8">',
    '<meta charset="UTF-8">\n<base href="/">\n<meta name="sbs-song" content="' + song.id + '">');
  return out;
}

export default async (req, context) => {
  const origin = new URL(req.url).origin;
  const id = String((context.params && context.params.id) || '').toLowerCase();
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

export const config = { path: '/song/:id' };
