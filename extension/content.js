// Impulse content script: find ads and feed items (YouTube, TikTok, Instagram), classify via background,
// blur anything in a blocked group that sells (ads, promos) or triggers cravings (mukbangs, hauls).
(() => {
  const SHOP_DOMAINS = ['doordash.com', 'ubereats.com', 'grubhub.com', 'postmates.com', 'seamless.com', 'mcdonalds.com',
    'dominos.com', 'amazon.com', 'shein.com', 'temu.com', 'etsy.com', 'walmart.com', 'target.com', 'bestbuy.com',
    'starbucks.com', 'store.steampowered.com', 'playstation.com', 'xbox.com', 'lyft.com', 'uber.com', 'netflix.com'];
  const SELECTORS = [
    '[data-impulse-candidate]',
    '[aria-label*="Sponsored" i]', '[aria-label*="Advertisement" i]',
    'iframe[id*="ad" i]', 'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
    '[id^="ad-"]', '[id*="-ad-"]', '[class^="ad-"]', '[class*=" ad-"]', '[class~="ad"]', '[class~="ads"]',
    '[id^="promo" i]', '[class~="promo"]',
    // YouTube: home/search/sidebar/Shorts cards and in-feed ads
    'ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-compact-video-renderer', 'ytd-grid-video-renderer',
    'ytd-reel-item-renderer', 'ytd-reel-video-renderer', 'ytm-shorts-lockup-view-model', 'yt-lockup-view-model',
    'ytd-ad-slot-renderer', 'ytd-in-feed-ad-layout-renderer', 'ytd-promoted-sparkles-web-renderer', 'ytd-display-ad-renderer',
    // TikTok web: For You, search, profile, explore
    '[data-e2e="recommend-list-item-container"]', '[data-e2e="search_top-item"]', '[data-e2e="search_video-item"]',
    '[data-e2e="user-post-item"]', '[data-e2e="explore-item"]', '[data-e2e="challenge-item"]',
    '[data-e2e="dm-new-shared-video"]', // video shared in a TikTok DM (caption + creator inside the card)
    // Instagram: feed posts (reels are found via their <video>, below)
    'article', // Instagram feed posts (home, profile); the list guard stops a feed-wide article from counting as one post
    ...SHOP_DOMAINS.map((d) => `a[href*="${d}"]`),
  ].join(',');
  const MARKERS = new Set(['sponsored', 'ad', 'ads', 'promoted', 'advertisement']);
  const CARD = 'article,[role="article"],li,ytd-rich-item-renderer,ytd-ad-slot-renderer,[data-impulse-candidate]';
  const MAX_BATCH = 40; // backend caps /classify at 40

  const cache = new Map(); // text|href -> {category, selling}
  const shownKeys = new Set(); // content the user chose to see; stays visible even if the site re-renders it
  const counted = new Set(); // content keys already counted as blocked on this page (re-blurs after toggling don't recount)
  let nextId = 0;
  let enabled = true;
  let data = null; // /categories payload

  // After the extension is reloaded/updated, scripts in already-open tabs are orphaned: chrome.runtime goes away and
  // every call throws synchronously. Detect that once and shut this copy down; the refreshed tab gets a fresh script.
  let observer = null;
  const alive = () => Boolean(globalThis.chrome?.runtime?.id);
  function shutdown() { observer?.disconnect(); clearTimeout(timer); timer = null; }
  async function send(msg) {
    if (!alive()) return shutdown(), null;
    try {
      return await chrome.runtime.sendMessage(msg); // can throw synchronously ("Extension context invalidated") or reject
    } catch (e) {
      if (/context invalidated/i.test(e?.message)) shutdown();
      return null;
    }
  }

  const isLateNight = () => { const h = new Date().getHours(); return h >= 22 || h < 4; };
  const money = (n) => `$${Math.round(n).toLocaleString()}`;

  function markerCards() {
    const out = [];
    for (const el of document.querySelectorAll('span,div,a,p,label,small')) {
      if (el.children.length || !MARKERS.has(el.textContent.trim().toLowerCase())) continue;
      let card = el.closest(CARD);
      if (!card) { card = el; for (let i = 0; i < 3 && card.parentElement && card.parentElement !== document.body; i++) card = card.parentElement; }
      out.push(card);
    }
    return out;
  }

  // TikTok / Instagram Reels have few stable selectors: take each <video> up to the largest ancestor that still holds
  // only that one video (= the post/reel container, caption included). Not on YouTube: its watch page is one big video.
  const VIDEO_SITES = /(^|\.)(tiktok|instagram)\.com$/;
  // Media posts: every video on TikTok/Instagram, plus large photos on Instagram (its feed and post pages have no
  // <article> anymore). Count only real media (>= 250px), so avatars and icons don't stop the climb.
  function isIGHost() { return /(^|\.)instagram\.com$/.test(location.hostname); }
  const isMedia = (m) => m.offsetWidth >= 250 && !m.closest('a[href*="/p/"], a[href*="/reel/"]'); // grid tiles are handled as tiles
  const mediaIn = (el) => [...el.querySelectorAll(isIGHost() ? 'video, img' : 'video')].filter(isMedia).length;
  function videoCards() {
    if (!VIDEO_SITES.test(location.hostname)) return [];
    const out = [];
    for (const v of [...document.querySelectorAll(isIGHost() ? 'video, img' : 'video')].filter(isMedia)) {
      // Climb while the parent holds only this media and isn't much bigger than it (a viewer modal holds one video
      // but spans the whole page; blurring that would hide the site's own UI).
      const fits = (el) => el.offsetWidth <= v.offsetWidth * 1.8 && el.offsetHeight <= v.offsetHeight * 2;
      let card = v;
      while (card.parentElement && card.parentElement !== document.body
        && mediaIn(card.parentElement) === 1 && fits(card.parentElement)) card = card.parentElement;
      if (card !== v) out.push(card);
    }
    return out;
  }

  // TikTok search: the thumbnail ([data-e2e="search_top-item"]) and its caption ([data-e2e="search-card-desc"]) are
  // siblings, so the thumbnail alone has no text. Use the nearest ancestor holding both as the card.
  function searchCards() {
    const out = [];
    for (const d of document.querySelectorAll('[data-e2e="search-card-desc"]')) {
      let e = d.parentElement;
      for (let i = 0; i < 4 && e && !e.querySelector('[data-e2e="search_top-item"],[data-e2e="search_video-item"]'); i++) e = e.parentElement;
      if (e && e !== document.body) out.push(e);
    }
    return out;
  }

  // Instagram explore / profile grids: each tile is a link to a post or reel with only a thumbnail. Its text is the
  // image alt, which Instagram fills with a caption excerpt or "May be an image of pizza and fries".
  const IG_TILE = 'a[href*="/p/"], a[href*="/reel/"]';
  const isIG = /(^|\.)instagram\.com$/.test(location.hostname);
  const igTiles = () => (isIG ? [...document.querySelectorAll(IG_TILE)].filter((a) => a.querySelector('img,video')) : []);

  // A post is never bigger than the window: past that the overlay's "Show anyway" can sit off screen.
  function tooBig(el) {
    return el.getBoundingClientRect().height > innerHeight * 1.5; // lists are caught separately; width alone is fine (narrow windows)
  }

  function candidates() {
    const set = new Set();
    const markerSet = new Set(markerCards());
    const tiles = new Set(igTiles());
    for (let el of [...document.querySelectorAll(SELECTORS), ...markerSet, ...videoCards(), ...searchCards(), ...tiles]) {
      if (el.tagName === 'A' && !el.matches('[data-impulse-candidate]') && !tiles.has(el)) el = el.closest(CARD) || el;
      if (isIG && el.querySelectorAll(IG_TILE).length > 1) continue; // a whole grid, not one post
      if (el === document.body || el === document.documentElement) continue;
      if (el.closest('[data-ss-id],.ss-overlay')) continue; // itself or inside an already checked card
      if (el.querySelector('.ss-blurred,[data-ss-shown]')) continue; // wraps an already handled post: a second layer on top
      if (el.textContent.length > 4000) continue; // loose class match on a page-sized container, not an ad
      set.add(el);
    }
    // A container holding 2+ candidates is a list (search results, a feed), not a post: blurring it would bury
    // every post plus any viewer TikTok/Instagram opens inside it, with the overlay off screen. Its posts go instead.
    const all = [...set];
    const posts = all.filter((el) => all.filter((o) => o !== el && el.contains(o)).length < 2 && !tooBig(el));
    // Keep outermost only among posts, so we don't stack overlays.
    return posts.filter((el) => !posts.some((o) => o !== el && o.contains(el))).map((el) => ({ el, marker: markerSet.has(el) }));
  }

  // A video opened in TikTok's / Instagram's viewer has its caption in a side panel, not in the card. Borrow the
  // caption element (TikTok) or the page title, which both sites set to the caption on a video URL.
  const CAPTION = '[data-e2e="browse-video-desc"],[data-e2e="video-desc"]';
  function captionFor(el) {
    const m = el.querySelector('video, img') || el;
    let e = el.parentElement;
    for (let i = 0; i < 12 && e && e !== document.body; i++, e = e.parentElement) {
      // Stop once the container is much bigger than the post's media: that's a feed or the page, not this post.
      if (e.offsetHeight > m.offsetHeight * 2 || e.offsetWidth > m.offsetWidth * 3) break;
      const t = (e.innerText || '').replace(/\s+/g, ' ').trim();
      if (t.length >= 30) return t.slice(0, 400);
    }
    return `${document.querySelector(CAPTION)?.innerText || ''} ${document.title}`;
  }

  function extract(el, marker) {
    let text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length < 40 && VIDEO_SITES.test(location.hostname) && mediaIn(el) === 1) text = `${text} ${captionFor(el)}`.replace(/\s+/g, ' ').trim();
    text = text.slice(0, 500);
    const img = el.tagName === 'IMG' ? el
      : [...el.querySelectorAll('img[alt]:not([alt=""])')].slice(0, 6).sort((a, b) => b.alt.length - a.alt.length)[0];
    const a = el.tagName === 'A' ? el : el.querySelector('a[href]');
    const adMarker = marker || el.matches('[aria-label*="Sponsored" i],ytd-ad-slot-renderer,iframe') || /\b(sponsored|promoted)\b/i.test(text.slice(0, 80));
    const labels = [...el.querySelectorAll('[aria-label]')].slice(0, 5).map((x) => x.getAttribute('aria-label')).join(' ');
    return { id: el.dataset.ssId, text, alt: `${img ? img.alt : ''} ${labels}`.trim().slice(0, 300), href: a ? a.href : el.src || '', adMarker };
  }

  // Blocked groups are broad (e.g. "Food"). Blur ways to buy (ads, promos) and craving content (mukbangs, hauls).
  // Recipes, reviews and normal posts come back with selling=false, trigger=false and stay visible.
  const groupOf = (r) => r.group || data.categories.find((c) => c.id === r.category)?.parent || r.category;
  // Groups the user chose in the side panel; until they choose, the top spending group.
  let blockedGroups = null;
  const MAX_GROUPS = 3; // more groups = more of every feed blurred and more classify work; the panel enforces it too
  // Saved choices only count for groups this person's spending has (switching personas/accounts); else the top group.
  const blockedSet = () => {
    const have = new Set((data.groups || data.categories).map((g) => g.id));
    const picked = (blockedGroups ?? []).filter((g) => have.has(g));
    return new Set((blockedGroups && (picked.length || !blockedGroups.length) ? picked : [data.top]).slice(0, MAX_GROUPS));
  };
  const shouldBlur = (r) => Boolean(data) && blockedSet().has(groupOf(r)) && (r.selling || r.trigger);
  const groupInfo = (g) => data.groups?.find((x) => x.id === g)
    || data.categories.find((c) => c.id === g) || { label: g, total: 0 };

  function blur(el, key, r) {
    if (shownKeys.has(key) || el.closest('.ss-blurred') || el.querySelector('.ss-blurred')) return;
    const cat = groupInfo(groupOf(r)); // the overlay names this post's own group and its spend
    // Void-ish elements can't hold an overlay; use the parent instead of moving page nodes (breaks React, reloads iframes).
    const host = /^(IMG|IFRAME|VIDEO|INPUT|CANVAS|SVG)$/i.test(el.tagName) ? el.parentElement : el;
    if (!host || host.closest('.ss-blurred')) return;
    host.classList.add('ss-blurred');
    host.dataset.ssGroup = groupOf(r); // lets a selection change keep this blur without re-running it
    if (getComputedStyle(host).display.startsWith('inline')) host.classList.add('ss-ib'); // min-height needs a box
    if (getComputedStyle(host).position === 'static') host.classList.add('ss-relative');
    for (const c of host.children) c.inert = true;
    host.querySelectorAll('video').forEach((v) => v.pause());
    host.addEventListener('play', keepPaused, true); // feeds autoplay on scroll; a blurred mukbang shouldn't play

    const label = cat.label.toLowerCase();
    const overlay = document.createElement('div');
    overlay.className = 'ss-overlay';
    overlay.setAttribute('role', 'group');
    overlay.setAttribute('aria-label', `Impulse hid ${label} content`);
    // One fact at display size, one dry line, one quiet way out.
    const num = document.createElement('p');
    num.className = 'ss-num';
    num.textContent = money(cat.total);
    const p = document.createElement('p');
    p.className = 'ss-text';
    const amt = document.createElement('span');
    amt.textContent = `spent on ${label} in the last 30 days`;
    const ask = document.createElement('span');
    ask.className = 'ss-ask';
    ask.textContent = isLateNight() ? "It's late. Still want to see this?" : 'Still want to see this?';
    p.append(amt, ask);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ss-btn';
    btn.textContent = 'Show anyway';
    btn.setAttribute('aria-label', `Show hidden ${label} content anyway`);
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      host.tabIndex = -1;
      unblur(host);
      host.focus(); // the focused button is gone; keep keyboard users in place
      host.dataset.ssShown = '1';
      shownKeys.add(key);
      send({ type: 'shown', group: groupOf(r) });
    });
    overlay.append(num, p, btn);
    host.appendChild(overlay);
    if (!counted.has(key)) { counted.add(key); send({ type: 'blocked', group: groupOf(r) }); }
  }

  function keepPaused(e) { if (e.target instanceof HTMLMediaElement) e.target.pause(); }

  function unblur(host) {
    host.querySelector(':scope > .ss-overlay')?.remove();
    host.classList.remove('ss-blurred', 'ss-relative', 'ss-ib');
    for (const c of host.children) c.inert = false;
    host.removeEventListener('play', keepPaused, true);
  }

  async function scan() {
    if (!enabled || !data || !alive()) return;
    const found = candidates().slice(0, MAX_BATCH);
    if (!found.length) return;
    const pending = [];
    for (const { el, marker } of found) {
      el.dataset.ssId = `ss-${nextId++}`;
      const item = extract(el, marker);
      if (!item.text && !item.alt && !item.href) continue;
      const key = `${item.text}|${item.href}`; // ponytail: raw string as cache key, hash it if memory ever matters
      const hit = cache.get(key);
      if (hit) { if (shouldBlur(hit, item)) blur(el, key, hit); } else pending.push({ el, item, key });
    }
    if (!pending.length) return;
    const res = await send({ type: 'classify', items: pending.map((p) => p.item) });
    if (!res) return; // orphaned or worker unavailable; next mutation retries new elements
    const byId = new Map((res?.results || []).map((r) => [r.id, r]));
    for (const { el, item, key } of pending) {
      const r = byId.get(item.id);
      if (!r) continue;
      cache.set(key, r);
      el.dataset.ssResult = `${groupOf(r)}${r.selling ? ' sell' : ''}${r.trigger ? ' trigger' : ''}`; // visible in DevTools for debugging
      if (enabled && shouldBlur(r, item)) blur(el, key, r);
    }
    debounced(); // leftovers past MAX_BATCH / nested candidates; stops once nothing new is found
  }

  let timer;
  // Throttle, not debounce: a playing video mutates the DOM constantly and would starve a debounce.
  const debounced = () => { if (!timer) timer = setTimeout(() => { timer = null; scan(); }, 800); };

  // Only touch what changed: unblur posts whose group is no longer blocked, re-check unblurred posts (from cache)
  // for newly blocked groups; posts that stay blocked are left alone, so nothing flickers.
  function reapply() {
    if (!data) return;
    const set = blockedSet();
    document.querySelectorAll('.ss-blurred').forEach((h) => { if (!set.has(h.dataset.ssGroup)) unblur(h); });
    document.querySelectorAll('[data-ss-id]:not([data-ss-shown])').forEach((el) => {
      if (!el.closest('.ss-blurred')) delete el.dataset.ssId;
    });
  }

  chrome.storage.onChanged.addListener((ch) => {
    if (ch.categories) { data = ch.categories.newValue; reapply(); } // new spending data (refresh or persona switch)
    if (ch.enabled) {
      enabled = ch.enabled.newValue !== false;
      if (!enabled) document.querySelectorAll('.ss-blurred').forEach(unblur);
      else { document.querySelectorAll('[data-ss-id]:not([data-ss-shown])').forEach((el) => delete el.dataset.ssId); }
    }
    if (ch.blockedGroups) { blockedGroups = ch.blockedGroups.newValue ?? null; reapply(); }
    debounced();
  });

  // YouTube reuses card elements across in-app navigation; start fresh after each one.
  document.addEventListener('yt-navigate-finish', () => {
    document.querySelectorAll('.ss-blurred').forEach(unblur);
    document.querySelectorAll('[data-ss-id]').forEach((el) => { delete el.dataset.ssId; delete el.dataset.ssShown; });
    debounced();
  });

  // TikTok / Instagram swap the next video into the same element and only change the URL: re-check video cards.
  let lastHref = location.href;
  function onUrlChange() {
    if (location.href === lastHref) return;
    lastHref = location.href;
    for (const el of document.querySelectorAll('[data-ss-id]')) {
      if (!el.querySelector('video')) continue;
      if (el.classList.contains('ss-blurred')) unblur(el);
      delete el.dataset.ssId; delete el.dataset.ssShown;
    }
    debounced();
  }

  chrome.storage.local.get(['enabled', 'categories', 'blockedGroups']).then(async (s) => {
    enabled = s.enabled !== false;
    blockedGroups = s.blockedGroups ?? null;
    data = s.categories || (await send({ type: 'refresh' }));
    if (data && Date.now() - (data.fetchedAt || 0) > 60_000) send({ type: 'refresh' }); // stale: storage.onChanged re-applies
    scan(); // no-op until data arrives; storage.onChanged re-triggers it
    observer = new MutationObserver((muts) => {
      onUrlChange();
      if (muts.some((m) => !(m.target instanceof Element && m.target.closest('.ss-overlay')))) debounced();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
