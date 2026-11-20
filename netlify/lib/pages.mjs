// Builds the extra pages (one page per song, and About Sheri) from the home
// page itself, so every song is still added in just one place: its
// <article class="entry" id="..."> block in index.html.
//
// Optional extras inside a song's <article> block:
//   <template class="story"> ...paragraphs... </template>
//       "The Story Behind the Song". Leave it out and that section is hidden.
//
// A book in the Books section (<article class="book" data-songs="id1 id2">)
// is introduced on the page of each song listed in data-songs.

export const SITE = 'Songs by Sheri';
export const AUTHOR = 'Sheryl Denise Long';

export const esc = (s) => String(s)
  .replace(/&(?![a-zA-Z]+;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;')
  .replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const plain = (html) => String(html)
  .replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const attr = (tag, name) => {
  const m = tag && tag.match(new RegExp('\\s' + name + '="([^"]*)"'));
  return m ? m[1] : null;
};

const between = (s, open, close) => {
  const a = s.indexOf(open);
  if (a < 0) return null;
  const b = s.indexOf(close, a + open.length);
  return b < 0 ? null : s.slice(a + open.length, b);
};

// The home page's own styles, so the new pages look like the rest of the site.
export const homeStyle = (html) => {
  const css = between(html, '<style>', '</style>');
  return css ? '<style>' + css + '</style>' : '';
};

// One song's details, read from the home page. Returns null if not found.
export function findSong(html, id) {
  const start = html.indexOf('<article class="entry" id="' + id + '"');
  if (start < 0) return null;
  const end = html.indexOf('</article>', start);
  const block = html.slice(start, end < 0 ? undefined : end);
  const open = block.slice(0, block.indexOf('>') + 1);

  // Which section it sits in (Faith, Family, ...).
  const before = html.slice(0, start);
  const secAt = before.lastIndexOf('<section class="part"');
  const sec = secAt < 0 ? '' : before.slice(secAt);
  const secId = attr(sec.slice(0, sec.indexOf('>') + 1), 'id');
  const secName = between(sec, '<h2>', '</h2>');

  const artTag = (block.match(/<img class="art"[^>]*>/) || [])[0] || null;
  const thumbTag = (block.match(/<span class="thumb"><img[^>]*>/) || [])[0] || null;
  const lyricsAt = block.indexOf('<div class="lyrics">');
  const creditAt = block.indexOf('<p class="credit">');

  return {
    id,
    title: attr(open, 'data-title') || id,
    kind: attr(open, 'data-kind'),
    src: attr(open, 'data-src'),
    section: secName ? { id: secId, name: secName.trim() } : null,
    meta: between(block, '<p class="meta">', '</p>'),
    art: artTag,
    image: attr(artTag, 'src') || attr(thumbTag, 'src'),
    width: artTag ? attr(artTag, 'width') : attr(thumbTag, 'width'),
    height: artTag ? attr(artTag, 'height') : attr(thumbTag, 'height'),
    dedication: between(block, '<p class="dedication">', '</p>'),
    story: (between(block, '<template class="story">', '</template>') || '').trim() || null,
    photos: (between(block, '<template class="photos">', '</template>') || '').trim() || null,
    lyrics: lyricsAt >= 0 ? block.slice(lyricsAt, creditAt > lyricsAt ? creditAt : undefined).trim() : null,
    credit: between(block, '<p class="credit">', '</p>'),
  };
}

// Every listing song (data-kind="listing" on its <article>), in page order.
export function listingIds(html) {
  const out = [];
  const re = /<article class="entry" id="([^"]+)"[^>]*data-kind="listing"/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

// Books from the home page's Books section that belong with this song.
export function booksFor(html, id) {
  const out = [];
  const re = /<article class="book"[^>]*data-songs="([^"]*)"[^>]*>([\s\S]*?)<\/article>/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[1].split(/\s+/).includes(id)) out.push(m[0].replace(/\ssrc="(?!\/|https?:)/g, ' src="/'));
  }
  return out;
}

// The shared <head>: title, preview tags for Facebook/texts/email, styles.
export function head({ html, origin, path, title, desc, image, width, height, extra = '' }) {
  const url = origin + path;
  const img = image ? origin + '/' + String(image).replace(/^\/+/, '') : origin + '/sheri.webp';
  const w = image ? width : '1536', h = image ? height : '1024';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="author" content="${AUTHOR}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE}">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${esc(img)}">
${w && h ? `<meta property="og:image:width" content="${w}">\n<meta property="og:image:height" content="${h}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${esc(img)}">
<meta name="theme-color" content="#0b3538">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/sheri.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Karla:wght@400;500;600&display=swap" rel="stylesheet">
${homeStyle(html)}
<link rel="stylesheet" href="/pages.css">
${extra}
</head>`;
}

const topbar = (back, label) => `
<header class="page-top">
  <a class="page-home" href="/">${SITE}</a>
  <a class="page-back" href="${back}"><span aria-hidden="true">&larr;</span> ${label}</a>
</header>`;

const footer = (legal) => `
<footer>
  <div class="footer-inner">
    <p class="sig"><a href="/">${SITE}</a> · <a href="/about">About Sheri</a> · <a href="/#books">Books</a> · <a href="/listings">Listing Songs</a></p>
    <p class="legal">${legal || 'Lyrics &copy; 2026 Sheryl Denise Long. All rights reserved.<br>Music generated with Suno, used under license.'}</p>
  </div>
</footer>`;

const ICON = {
  play: '<svg class="ic-play" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.2v11.6a.6.6 0 0 0 .92.5l9-5.8a.6.6 0 0 0 0-1l-9-5.8a.6.6 0 0 0-.92.5z"/></svg><svg class="ic-pause" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="3.4" y="2.4" width="3.4" height="11.2" rx="0.7"/><rect x="9.2" y="2.4" width="3.4" height="11.2" rx="0.7"/></svg>',
  heart: '<svg viewBox="0 0 16 16" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M8 14s-5.6-3.4-5.6-7.3A3 3 0 0 1 8 4.6a3 3 0 0 1 5.6 2.1C13.6 10.6 8 14 8 14z"/></svg>',
  share: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 10V1.8M5 4.6 8 1.6l3 3"/><path d="M5.2 7H3.6v7.4h8.8V7h-1.6"/></svg>',
  link: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M6.6 9.4a2.6 2.6 0 0 0 3.7 0l2.4-2.4a2.6 2.6 0 0 0-3.7-3.7l-.9.9"/><path d="M9.4 6.6a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.9-.9"/></svg>',
  facebook: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M9.2 15V8.6h2.1l.3-2.5H9.2V4.5c0-.7.2-1.2 1.2-1.2h1.3V1.1A17 17 0 0 0 9.8 1C8 1 6.7 2.1 6.7 4.2v1.9H4.6v2.5h2.1V15z"/></svg>',
  text: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M2 3.5h12v7.5H6.5L3.5 13.5V11H2z"/></svg>',
  email: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><rect x="1.8" y="3.3" width="12.4" height="9.4" rx="1"/><path d="m2.2 4 5.8 4.6L13.8 4"/></svg>',
  print: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M4.2 6V1.8h7.6V6"/><rect x="1.8" y="6" width="12.4" height="5.6" rx="1"/><path d="M4.2 9.6h7.6v4.6H4.2z"/></svg>',
};

// A whole page for one song.
export function songPage(html, song, origin) {
  const path = '/songs/' + song.id;
  const url = origin + path;
  const title = esc(song.title) + ' — ' + SITE;
  const desc = esc(song.dedication
    ? plain(song.dedication)
    : 'Listen to “' + plain(song.title) + '” by ' + AUTHOR + ', with the lyrics.');
  const books = booksFor(html, song.id);
  const back = '/#' + song.id;
  const sectionLabel = song.section ? song.section.name : 'All songs';

  return head({ html, origin, path, title, desc, image: song.image, width: song.width, height: song.height }) + `
<body class="songpage">
${topbar(back, 'All songs')}
<main class="sp" id="song" data-song data-id="${song.id}" data-title="${esc(song.title)}" data-src="/${esc(String(song.src || '').replace(/^\/+/, ''))}" data-url="${url}">

  <div class="sp-cover">${song.art ? song.art.replace(/\ssrc="(?!\/|https?:)/, ' src="/').replace(' loading="lazy"', '') : ''}</div>

  <div class="sp-head">
    ${song.section ? `<a class="eyebrow sp-section" href="/#${song.section.id}">${song.section.name}</a>` : ''}
    <h1>${song.title}</h1>
    <p class="sp-by">Written by ${AUTHOR}</p>
    ${song.meta ? `<p class="meta sp-meta">${song.meta}</p>` : ''}
    ${song.dedication ? `<p class="dedication sp-dedication">${song.dedication}</p>` : ''}
  </div>

  <div class="sp-player entry">
    <button class="play" type="button" aria-label="Play ${esc(plain(song.title))}">${ICON.play}</button>
    <div class="sp-scrub scrub">
      <span class="time cur">0:00</span>
      <input class="seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek within ${esc(plain(song.title))}">
      <span class="time dur">—:—</span>
    </div>
    <button class="heart" type="button" aria-pressed="false" aria-label="Love ${esc(plain(song.title))}">${ICON.heart}</button>
  </div>

  ${song.story ? `
  <section class="sp-block sp-story" aria-labelledby="story-h">
    <h2 id="story-h">The Story Behind the Song</h2>
    <div class="sp-story-body">${song.story}</div>
  </section>` : ''}

  <section class="sp-block sp-share" aria-labelledby="share-h">
    <h2 id="share-h">Share This Song</h2>
    <div class="sp-share-row">
      <button class="sp-btn sp-native" type="button" hidden>${ICON.share}<span>Share</span></button>
      <button class="sp-btn sp-copy" type="button">${ICON.link}<span>Copy link</span></button>
      <a class="sp-btn" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">${ICON.facebook}<span>Facebook</span></a>
      <a class="sp-btn sp-sms" href="sms:?&amp;body=${encodeURIComponent('Listen to “' + plain(song.title) + '” by Sheri: ' + url)}">${ICON.text}<span>Text</span></a>
      <a class="sp-btn" href="mailto:?subject=${encodeURIComponent(plain(song.title) + ' — a song by Sheri')}&amp;body=${encodeURIComponent('I thought you would love this song by Sheryl Denise Long:\n\n' + plain(song.title) + '\n' + url)}">${ICON.email}<span>Email</span></a>
    </div>
    <p class="sp-hint">On a phone, <strong>Share</strong> opens your phone&rsquo;s own menu, where you can pick Instagram, WhatsApp and other apps.</p>
  </section>

  ${song.lyrics ? `
  <section class="sp-block sp-lyrics" aria-labelledby="lyrics-h">
    <div class="sp-block-head">
      <h2 id="lyrics-h">Lyrics</h2>
      <button class="sp-btn sp-print" type="button">${ICON.print}<span>Print lyrics</span></button>
    </div>
    <p class="sp-print-only sp-print-head">${song.title}<br><span>Written by ${AUTHOR}${song.meta ? ' · ' + song.meta : ''}</span></p>
    ${song.lyrics}
    ${song.credit ? `<p class="credit">${song.credit}</p>` : ''}
  </section>` : ''}

  ${books.length ? `
  <section class="sp-block sp-book" aria-labelledby="book-h">
    <h2 id="book-h">From My Book</h2>
    ${books.join('\n')}
  </section>` : ''}

  <section class="sp-block sp-kind kind" aria-labelledby="kind-h">
    <h2 id="kind-h">Kind Words</h2>
    <ul class="kind-list" hidden></ul>
    <p class="kind-note sp-kind-empty" hidden>No kind words yet. Be the first!</p>
    <form class="kind-form" novalidate>
      <label for="kn">Your first name</label>
      <input id="kn" name="name" maxlength="40" autocomplete="given-name" required>
      <label for="km">Your kind word</label>
      <textarea id="km" name="message" maxlength="500" required></textarea>
      <div class="trap" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></div>
      <div class="foot"><span class="left">Sheri reads each one before it appears.</span><button type="submit">Send</button></div>
    </form>
  </section>

  <p class="sp-more"><a href="${back}">&larr; Back to all the songs</a></p>
</main>
${footer()}
<script src="/song-page.js" defer></script>
</body>
</html>
`;
}


const fixSrc = (tag) => String(tag || '').replace(/\ssrc="(?!\/|https?:)/g, ' src="/');

// One page holding all of Sheri's real estate listing songs: /listings
// Each song has its own spot (and share link) at /listings#<song-id>.
export function listingsPage(html, songs, origin) {
  const path = '/listings';
  const title = 'Listing Songs — ' + SITE;
  const desc = esc('Songs ' + AUTHOR + ' wrote to introduce homes she has listed for sale.');
  const first = songs[0] || {};

  const card = (song) => {
    const url = origin + path + '#' + song.id;
    const t = esc(plain(song.title));
    return `
  <article class="ls-item" id="${song.id}" data-song data-id="${song.id}" data-title="${esc(song.title)}" data-src="/${esc(String(song.src || '').replace(/^\/+/, ''))}" data-url="${url}">
    <div class="ls-top">
      <div class="ls-art">${fixSrc(song.art)}</div>
      <div class="ls-head">
        <h2>${song.title}</h2>
        ${song.meta ? `<p class="meta">${song.meta}</p>` : ''}
      </div>
    </div>
    ${song.photos ? `<div class="ls-photos">${fixSrc(song.photos)}</div>` : ''}
    <div class="sp-player entry">
      <button class="play" type="button" aria-label="Play ${t}">${ICON.play}</button>
      <div class="sp-scrub scrub">
        <span class="time cur">0:00</span>
        <input class="seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek within ${t}">
        <span class="time dur">—:—</span>
      </div>
      <button class="heart" type="button" aria-pressed="false" aria-label="Love ${t}">${ICON.heart}</button>
    </div>
    ${song.story ? `<div class="sp-story-body ls-story">${song.story}</div>` : ''}
    <div class="sp-share-row">
      <button class="sp-btn sp-native" type="button" hidden>${ICON.share}<span>Share</span></button>
      <button class="sp-btn sp-copy" type="button">${ICON.link}<span>Copy link</span></button>
      <a class="sp-btn" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">${ICON.facebook}<span>Facebook</span></a>
      <a class="sp-btn sp-sms" href="sms:?&amp;body=${encodeURIComponent('Listen to “' + plain(song.title) + '” by Sheri: ' + url)}">${ICON.text}<span>Text</span></a>
      <a class="sp-btn" href="mailto:?subject=${encodeURIComponent(plain(song.title) + ' — a song by Sheri')}&amp;body=${encodeURIComponent('Have a listen to this song about the home at ' + plain(song.title) + ':\n\n' + url)}">${ICON.email}<span>Email</span></a>
    </div>
    ${song.lyrics ? `
    <details class="sheet">
      <summary>Read the lyrics</summary>
      <div class="sheet-body">
        ${song.lyrics}
        ${song.credit ? `<p class="credit">${song.credit}</p>` : ''}
      </div>
    </details>` : ''}
    <details class="sheet kind">
      <summary>Leave a kind word</summary>
      <div class="sheet-body">
        <ul class="kind-list" hidden></ul>
        <p class="kind-note sp-kind-empty" hidden>No kind words yet. Be the first!</p>
        <form class="kind-form" novalidate>
          <label for="kn-${song.id}">Your first name</label>
          <input id="kn-${song.id}" name="name" maxlength="40" autocomplete="given-name" required>
          <label for="km-${song.id}">Your kind word</label>
          <textarea id="km-${song.id}" name="message" maxlength="500" required></textarea>
          <div class="trap" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></div>
          <div class="foot"><span class="left">Sheri reads each one before it appears.</span><button type="submit">Send</button></div>
        </form>
      </div>
    </details>
  </article>`;
  };

  return head({ html, origin, path, title, desc, image: first.image, width: first.width, height: first.height }) + `
<body class="listingspage">
${topbar('/#ocala', 'All songs')}
<main class="sp ls">
  <div class="sp-head">
    <span class="eyebrow">Sold by Sheri</span>
    <h1>Listing Songs</h1>
    <p class="sp-by">Songs I&rsquo;ve written to introduce homes I&rsquo;ve listed</p>
  </div>
  ${songs.map(card).join('\n')}
  <p class="sp-more"><a href="/#ocala">&larr; Back to all the songs</a></p>
</main>
${footer()}
<script src="/song-page.js" defer></script>
</body>
</html>
`;
}

// The About Sheri page. Its words live in content/about.html.
export function aboutPage(html, body, origin) {
  const title = 'About Sheri — ' + SITE;
  const desc = esc('The story behind the songs of Sheryl Denise Long of Ocala, Florida.');
  return head({ html, origin, path: '/about', title, desc }) + `
<body class="aboutpage">
${topbar('/', 'All songs')}
<main class="sp about-sheri">
  <div class="sp-cover sp-cover-wide"><img src="/sheri.webp" width="1536" height="1024" alt="Sheryl Denise Long smiling beside a piano keyboard with her dog, surrounded by teal and gold watercolor music notes."></div>
  <div class="sp-head">
    <span class="eyebrow">About Sheri</span>
    <h1>The woman behind the songs</h1>
  </div>
  <div class="sp-block about-body">${body}</div>
  <p class="sp-more"><a href="/">Listen to the songs &rarr;</a></p>
</main>
${footer()}
</body>
</html>
`;
}
