// ═══════════════════════════════════════════════════
//  NEWSWAVE — Main Application
// ═══════════════════════════════════════════════════
import { getTopHeadlines, getIndiaNews, searchNews, getCategory, getTrending } from './api/newsApi.js';
import { timeAgo, formatDate, getDomain, truncate, escHtml, isBookmarked, toggleBookmark, isLiked, toggleLike, shareArticle, getBookmarks, CATEGORIES } from './utils/helpers.js';

// ── State ─────────────────────────────────────────
const state = {
  currentPage: 'home',
  currentCategory: 'home',
  searchQuery: '',
  categoryPage: 1,
  searchPage: 1,
  isLoading: false,
  carouselIndex: 0,
  carouselItems: [],
  carouselTimer: null,
  prevScrollY: 0,     // for Back button restore
  prevPage: null,     // what page we came from
  sortBy: 'publishedAt',
  currentArticle: null,
};

const $ = id => document.getElementById(id);

// ── Article store ─────────────────────────────────
// We store every rendered article so clicking any element can look it up
window._articles = {};
let _articleIdx  = 0;
function storeArticle(article) {
  const key = `a${_articleIdx++}`;
  window._articles[key] = article;
  return key;
}

// ═══════════════════════════════════════════════════
//  IN-PAGE ARTICLE READER
// ═══════════════════════════════════════════════════
function openArticleReader(article) {
  if (!article) return;
  state.prevScrollY = window.scrollY;
  state.prevPage    = state.currentPage;
  state.currentArticle = article;

  const reader  = $('article-reader');
  const content = $('reader-content');
  if (!reader || !content) return;

  const { title, description, content: body, urlToImage, url, source, publishedAt, author } = article;
  const domain   = getDomain(url);
  // News API content field truncates at 200 chars — strip the notice
  const cleanBody = (body || '').replace(/\[\+\d+ chars\]/g, '').trim();

  // Update toolbar buttons
  const likeBtn = $('reader-like-btn');
  const bmBtn   = $('reader-bm-btn');
  if (likeBtn) { likeBtn.className = `reader-toolbar-btn${isLiked(url)?' liked':''}`; likeBtn.innerHTML = isLiked(url)   ? '❤️ Liked'  : '🤍 Like'; }
  if (bmBtn)   { bmBtn.className   = `reader-toolbar-btn${isBookmarked(url)?' bookmarked':''}`; bmBtn.innerHTML   = isBookmarked(url) ? '🔖 Saved' : '📌 Save'; }

  content.innerHTML = `
    ${urlToImage ? `
      <div class="reader-hero">
        <img src="${escHtml(urlToImage)}" alt="${escHtml(title)}" onerror="this.parentElement.style.display='none'" />
        <div class="reader-hero-overlay"></div>
      </div>` : ''}
    <div class="reader-body">
      <div class="reader-meta-top">
        <span class="reader-cat-badge">${article._src === 'india' ? '🇮🇳 India' : '🌍 World'}</span>
        <span class="reader-date">📅 ${formatDate(publishedAt)} · ${timeAgo(publishedAt)}</span>
      </div>
      <h1 class="reader-title">${escHtml(title || '')}</h1>
      <div class="reader-byline">
        ${author   ? `<span>✍️ ${escHtml(truncate(author, 60))}</span>` : ''}
        ${source?.name ? `<span>🗞 ${escHtml(source.name)}</span>`     : ''}
        ${domain   ? `<span>🔗 ${escHtml(domain)}</span>`              : ''}
      </div>
      <hr class="reader-divider" />
      ${description ? `<p class="reader-description">${escHtml(description)}</p>` : ''}
      ${cleanBody   ? `<p class="reader-body-text">${escHtml(cleanBody)}</p>`     : ''}
      <div class="reader-cta">
        <p class="reader-cta-label">📰 This is a preview. Read the complete story on the original source.</p>
        <a href="${escHtml(url)}" target="_blank" rel="noopener noreferrer" class="reader-external-btn">
          Read Full Article on ${escHtml(source?.name || domain || 'Source')} ↗
        </a>
      </div>
    </div>`;

  reader.classList.add('open');
  $('reader-backdrop')?.classList.add('open');
  document.body.classList.add('reader-open');
  reader.querySelector('.reader-scroll-area').scrollTop = 0;
}

window.closeReader = function () {
  const reader = $('article-reader');
  if (!reader) return;
  reader.classList.remove('open');
  $('reader-backdrop')?.classList.remove('open');
  document.body.classList.remove('reader-open');
  // Restore scroll position
  setTimeout(() => window.scrollTo({ top: state.prevScrollY, behavior: 'instant' }), 30);
};

window.readerLike = function () {
  if (!state.currentArticle) return;
  const liked = toggleLike(state.currentArticle.url);
  const btn = $('reader-like-btn');
  if (btn) { btn.className = `reader-toolbar-btn${liked ? ' liked' : ''}`; btn.innerHTML = liked ? '❤️ Liked' : '🤍 Like'; }
  showToast(liked ? '❤️ Liked!' : 'Like removed');
};

window.readerBookmark = function () {
  if (!state.currentArticle) return;
  const added = toggleBookmark(state.currentArticle);
  const btn = $('reader-bm-btn');
  if (btn) { btn.className = `reader-toolbar-btn${added ? ' bookmarked' : ''}`; btn.innerHTML = added ? '🔖 Saved' : '📌 Save'; }
  showToast(added ? '📌 Article saved!' : 'Bookmark removed');
  updateBookmarkBadge();
  loadSidebarBookmarks();
};

window.readerShare = async function () {
  if (!state.currentArticle) return;
  try {
    const result = await shareArticle(state.currentArticle);
    showToast(result === 'copied' ? '🔗 Link copied!' : '✅ Shared!');
  } catch { showToast('Could not share'); }
};

// Keyboard support: Escape closes reader
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('article-reader')?.classList.contains('open')) closeReader();
});

// ═══════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════
window.navigate = function (cat) {
  // Close reader if open
  if ($('article-reader')?.classList.contains('open')) closeReader();

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  closeMenu();

  const specials = ['home', 'bookmarks', 'about', 'contact', 'search', '404'];
  if (specials.includes(cat)) {
    const pg = $(`page-${cat}`);
    if (pg) { pg.classList.add('active'); state.currentPage = cat; }
    document.querySelector(`.nav-link[data-cat="${cat}"]`)?.classList.add('active');
    document.querySelector(`.nav-link[data-cat="home"]`)?.classList.toggle('active', cat === 'home');
    if (cat === 'bookmarks') renderBookmarksPage();
    if (cat === 'home') window.scrollTo({ top: 0 });
    updateBookmarkBadge();
    return;
  }

  // Category page
  $('page-category').classList.add('active');
  state.currentPage     = 'category';
  state.currentCategory = cat;
  state.categoryPage    = 1;
  state.sortBy          = 'publishedAt';
  const sel = $('sort-select');
  if (sel) sel.value = 'publishedAt';

  const catObj = CATEGORIES.find(c => c.id === cat) || { label: cat, icon: '📰' };
  $('category-title').textContent = `${catObj.icon} ${catObj.label}`;

  document.querySelector(`.nav-link[data-cat="${cat}"]`)?.classList.add('active');
  loadCategoryPage(cat, 1);
  window.scrollTo({ top: 0 });
};

// ═══════════════════════════════════════════════════
//  CARD RENDERING
// ═══════════════════════════════════════════════════
function renderCard(article, animIdx = 0) {
  const { title, description, urlToImage, url, source, publishedAt, author, _src } = article;
  const liked  = isLiked(url);
  const saved  = isBookmarked(url);
  const cat    = state.currentCategory;
  const catObj = CATEGORIES.find(c => c.id === (_src === 'india' ? 'india' : cat === 'home' ? 'world' : cat))
              || { label: 'News', icon: '📰' };
  const isIndia = _src === 'india';
  const key = storeArticle(article);

  return `
  <article class="news-card" style="animation-delay:${Math.min(animIdx, 9) * 45}ms" role="article">
    <div class="card-image" onclick="openArticle('${key}')" style="cursor:pointer" title="Click to read article">
      ${urlToImage
        ? `<img src="${escHtml(urlToImage)}" alt="${escHtml(title)}" loading="lazy"
              onerror="this.parentElement.innerHTML='<div class=\\'card-img-fallback\\'>📰</div>'">`
        : `<div class="card-img-fallback">📰</div>`}
      <div class="card-image-overlay">
        <span class="card-read-hint">▶ Read Article</span>
      </div>
      <span class="card-category">${escHtml(catObj.label)}</span>
      ${source?.name ? `<span class="card-source-badge">${escHtml(source.name)}</span>` : ''}
    </div>
    <div class="card-body" onclick="openArticle('${key}')" style="cursor:pointer">
      ${isIndia ? `<span class="india-badge">🇮🇳 India</span>` : ''}
      <h3 class="card-title">${escHtml(title || '')}</h3>
      ${description ? `<p class="card-desc">${escHtml(truncate(description, 120))}</p>` : ''}
      <div class="card-meta">
        ${author ? `<span>${escHtml(truncate(author, 28))}</span><span class="card-meta-dot">·</span>` : ''}
        <span>${timeAgo(publishedAt)}</span>
        ${getDomain(url) ? `<span class="card-meta-dot">·</span><span>${escHtml(getDomain(url))}</span>` : ''}
      </div>
    </div>
    <div class="card-actions" onclick="event.stopPropagation()">
      <button class="card-action-btn${liked ? ' liked' : ''}"
        onclick="handleLike(this,'${escHtml(url)}')" title="Like">
        ${liked ? '❤️' : '🤍'} Like
      </button>
      <button class="card-action-btn${saved ? ' bookmarked' : ''}"
        onclick="handleBookmark(this,'${key}')" title="Save">
        ${saved ? '🔖' : '📌'} Save
      </button>
      <button class="card-action-btn" onclick="handleShare('${key}')">📤 Share</button>
      <button class="card-read-btn" onclick="openArticle('${key}')">Read →</button>
    </div>
  </article>`;
}

// Open in-page reader
window.openArticle = function (key) {
  const article = window._articles[key];
  if (article) openArticleReader(article);
};

function renderSkeletons(n = 6) {
  return Array(n).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skel-img"></div>
      <div class="skel-body">
        <div class="skel-line" style="width:40%;height:10px"></div>
        <div class="skel-line" style="width:90%"></div>
        <div class="skel-line" style="width:80%"></div>
        <div class="skel-line" style="width:55%;height:10px"></div>
      </div>
    </div>`).join('');
}

function renderError(msg, retryCall) {
  return `<div class="error-state">
    <div class="error-icon">⚠️</div>
    <h3>Couldn't load news</h3>
    <p>${escHtml(msg)}</p>
    ${retryCall ? `<button onclick="${escHtml(retryCall)}">Try Again</button>` : ''}
  </div>`;
}

// ═══════════════════════════════════════════════════
//  HERO CAROUSEL — fully clickable slides & images
// ═══════════════════════════════════════════════════
async function initCarousel() {
  try {
    const articles = await getTrending();
    const items = articles.filter(a => a.urlToImage && a.title).slice(0, 8);
    if (!items.length) { $('hero-carousel').style.display = 'none'; return; }
    state.carouselItems = items;

    const track  = $('carousel-track');
    const dotsEl = $('carousel-dots');
    if (!track) return;

    const keys = items.map(a => storeArticle(a));

    track.innerHTML = items.map((a, i) => `
      <div class="carousel-slide" onclick="openArticle('${keys[i]}')"
        title="Click to read: ${escHtml(a.title)}" style="cursor:pointer">
        <img src="${escHtml(a.urlToImage)}" alt="${escHtml(a.title)}"
          loading="${i === 0 ? 'eager' : 'lazy'}" onerror="this.style.display='none'" />
        <div class="carousel-overlay"></div>
        <div class="carousel-content">
          <span class="carousel-cat">${a._src === 'india' ? '🇮🇳 India' : '🌍 World'}</span>
          <h2 class="carousel-title">${escHtml(a.title)}</h2>
          <div class="carousel-meta">
            <span>${escHtml(a.source?.name || '')}</span>
            <span>·</span>
            <span>${timeAgo(a.publishedAt)}</span>
            <span class="carousel-read-hint">▶ Click to read</span>
          </div>
        </div>
      </div>`).join('');

    if (dotsEl) dotsEl.innerHTML = items.map((_, i) =>
      `<button class="carousel-dot${i === 0 ? ' active' : ''}"
        onclick="event.stopPropagation();goToSlide(${i})" aria-label="Slide ${i + 1}"></button>`
    ).join('');

    startCarousel();
  } catch (e) { console.error('Carousel error:', e); }
}

function goToSlide(idx) {
  const track = $('carousel-track');
  const dots  = document.querySelectorAll('.carousel-dot');
  if (!track || !state.carouselItems.length) return;
  state.carouselIndex = ((idx % state.carouselItems.length) + state.carouselItems.length) % state.carouselItems.length;
  track.style.transform = `translateX(-${state.carouselIndex * 100}%)`;
  dots.forEach((d, i) => d.classList.toggle('active', i === state.carouselIndex));
}
window.goToSlide = goToSlide;

function startCarousel() {
  clearInterval(state.carouselTimer);
  state.carouselTimer = setInterval(() => goToSlide(state.carouselIndex + 1), 5500);
}

$('carousel-prev')?.addEventListener('click', e => { e.stopPropagation(); goToSlide(state.carouselIndex - 1); startCarousel(); });
$('carousel-next')?.addEventListener('click', e => { e.stopPropagation(); goToSlide(state.carouselIndex + 1); startCarousel(); });

// ═══════════════════════════════════════════════════
//  HOME SECTIONS
// ═══════════════════════════════════════════════════
async function loadHomeSection(gridId, fetchFn) {
  const grid = $(gridId);
  if (!grid) return;
  grid.innerHTML = renderSkeletons(4);
  try {
    const data     = await fetchFn();
    const articles = (data.articles || []).filter(a => a.title && a.title !== '[Removed]').slice(0, 8);
    grid.innerHTML = articles.length
      ? articles.map((a, i) => renderCard(a, i)).join('')
      : `<p class="no-results">No articles right now. Check back soon.</p>`;
  } catch (e) {
    grid.innerHTML = renderError(e.message);
  }
}

async function initHome() {
  await Promise.allSettled([
    loadHomeSection('india-grid', () => getIndiaNews({ pageSize: 8 })),
    loadHomeSection('world-grid', () => getTopHeadlines({ country: 'us', pageSize: 8 })),
    loadHomeSection('tech-grid',  () => getTopHeadlines({ category: 'technology', country: 'us', pageSize: 8 })),
  ]);
  loadTrending();
  loadSidebarBookmarks();
}

// ═══════════════════════════════════════════════════
//  CATEGORY PAGE  — India fix: triple fallback
// ═══════════════════════════════════════════════════
async function loadCategoryPage(cat, page) {
  const grid       = $('category-grid');
  const pagination = $('category-pagination');
  if (!grid) return;
  state.isLoading = true;
  grid.innerHTML = renderSkeletons(9);
  if (pagination) pagination.innerHTML = '';

  try {
    const sortBy = $('sort-select')?.value || 'publishedAt';
    const data   = await getCategory(cat, page, sortBy, 12);
    const articles = (data.articles || []).filter(a => a.title && a.title !== '[Removed]');

    grid.innerHTML = articles.length
      ? articles.map((a, i) => renderCard(a, i)).join('')
      : `<div class="error-state">
           <div class="error-icon">📭</div>
           <h3>No articles found</h3>
           <p>Try changing the sort order, or check back in a few minutes.</p>
         </div>`;

    const total = Math.min(data.totalResults || 0, 100);
    if (total > 12 && pagination) {
      renderPagination(pagination, page, Math.ceil(total / 12), p => {
        state.categoryPage = p;
        loadCategoryPage(cat, p);
        window.scrollTo({ top: 160 });
      });
    }
  } catch (e) {
    grid.innerHTML = renderError(e.message, `loadCategoryPage('${cat}',${page})`);
  } finally {
    state.isLoading = false;
  }
}

$('sort-select')?.addEventListener('change', () => {
  loadCategoryPage(state.currentCategory, 1);
});

// ═══════════════════════════════════════════════════
//  PAGINATION
// ═══════════════════════════════════════════════════
function renderPagination(container, current, total, onClick) {
  if (!container || total <= 1) return;
  const pages = [1];
  if (current > 3) pages.push('…');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push('…');
  if (total > 1) pages.push(total);

  const fnKey = `_pgFn${Date.now()}`;
  window[fnKey] = onClick;

  container.innerHTML = `
    <button class="page-btn" ${current <= 1 ? 'disabled' : ''} onclick="window['${fnKey}'](${current - 1})">← Prev</button>
    ${pages.map(p => p === '…'
      ? `<span class="page-btn" style="cursor:default;pointer-events:none">…</span>`
      : `<button class="page-btn${p === current ? ' active' : ''}" onclick="window['${fnKey}'](${p})">${p}</button>`
    ).join('')}
    <button class="page-btn" ${current >= total ? 'disabled' : ''} onclick="window['${fnKey}'](${current + 1})">Next →</button>`;
}

// ═══════════════════════════════════════════════════
//  SEARCH — with India detection
// ═══════════════════════════════════════════════════
let searchDebounce;
const searchInput  = $('search-input');
const suggestions  = $('search-suggestions');

searchInput?.addEventListener('input', e => {
  const q = e.target.value.trim();
  clearTimeout(searchDebounce);
  if (q.length < 2) { suggestions?.classList.remove('open'); return; }
  searchDebounce = setTimeout(() => showSuggestions(q), 350);
});

searchInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const q = searchInput.value.trim();
    if (q) { doSearch(q); suggestions?.classList.remove('open'); }
  }
  if (e.key === 'Escape') suggestions?.classList.remove('open');
});

$('search-btn')?.addEventListener('click', () => {
  const q = searchInput?.value.trim();
  if (q) doSearch(q);
  else suggestions?.classList.remove('open');
});

document.addEventListener('click', e => {
  if (!e.target.closest('#search-box')) suggestions?.classList.remove('open');
});

const SUGGESTION_BASE = [
  'India News', 'Cricket', 'Bollywood', 'IPL', 'Modi', 'Delhi', 'Mumbai',
  'Technology', 'AI', 'Climate', 'Business', 'Stock Market',
  'Politics', 'Health', 'Science', 'Sports', 'Entertainment',
  'Economy', 'Elections', 'World News',
];

function showSuggestions(q) {
  if (!suggestions) return;
  const lq = q.toLowerCase();
  const filtered = SUGGESTION_BASE.filter(s => s.toLowerCase().includes(lq)).slice(0, 5);
  const dynamic  = [`${q} India`, `${q} 2025`].filter(s => !filtered.map(f=>f.toLowerCase()).includes(s.toLowerCase())).slice(0, 2);
  const all = [...filtered, ...dynamic].slice(0, 7);
  suggestions.innerHTML = all.map(s =>
    `<div class="suggestion-item" onclick="doSearch('${escHtml(s)}')" role="option">🔍 ${escHtml(s)}</div>`
  ).join('');
  suggestions.classList.add('open');
}

window.doSearch = async function (q) {
  if (!q?.trim()) return;
  q = q.trim();
  state.searchQuery = q;
  state.searchPage  = 1;
  if (searchInput) searchInput.value = q;
  suggestions?.classList.remove('open');
  navigate('search');
  await loadSearchResults(q, 1);
};

async function loadSearchResults(q, page) {
  const grid       = $('search-grid');
  const info       = $('search-result-info');
  const pagination = $('search-pagination');
  if (!grid) return;
  grid.innerHTML = renderSkeletons(9);
  if (info) info.textContent = `Searching for "${q}"…`;
  if (pagination) pagination.innerHTML = '';

  try {
    const data     = await searchNews({ q, page, pageSize: 12, sortBy: 'relevancy' });
    const articles = (data.articles || []).filter(a => a.title && a.title !== '[Removed]');

    if (info) info.textContent = articles.length
      ? `${(data.totalResults || articles.length).toLocaleString()} results for "${q}"`
      : `No results for "${q}"`;

    grid.innerHTML = articles.length
      ? articles.map((a, i) => renderCard(a, i)).join('')
      : `<div class="error-state">
           <div class="error-icon">🔍</div>
           <h3>No results found</h3>
           <p>Try different keywords — e.g. "India cricket" or "AI technology 2025".</p>
         </div>`;

    const total = Math.min(data.totalResults || 0, 100);
    if (total > 12 && pagination) {
      renderPagination(pagination, page, Math.ceil(total / 12), p => {
        state.searchPage = p;
        loadSearchResults(q, p);
        window.scrollTo({ top: 160 });
      });
    }
  } catch (e) {
    if (info) info.textContent = '';
    grid.innerHTML = renderError(e.message);
  }
}

// ═══════════════════════════════════════════════════
//  CARD ACTIONS
// ═══════════════════════════════════════════════════
window.handleLike = function (btn, url) {
  const liked = toggleLike(url);
  btn.className = `card-action-btn${liked ? ' liked' : ''}`;
  btn.innerHTML = `${liked ? '❤️' : '🤍'} Like`;
  showToast(liked ? '❤️ Liked!' : 'Like removed');
};

window.handleBookmark = function (btn, key) {
  const article = window._articles[key];
  if (!article) return;
  const added = toggleBookmark(article);
  btn.className = `card-action-btn${added ? ' bookmarked' : ''}`;
  btn.innerHTML = `${added ? '🔖' : '📌'} Save`;
  showToast(added ? '📌 Article saved!' : 'Bookmark removed');
  updateBookmarkBadge();
  loadSidebarBookmarks();
};

window.handleShare = async function (key) {
  const article = window._articles[key];
  if (!article) return;
  try {
    const result = await shareArticle(article);
    showToast(result === 'copied' ? '🔗 Link copied!' : '✅ Shared!');
  } catch { showToast('Could not share'); }
};

// ═══════════════════════════════════════════════════
//  BOOKMARKS
// ═══════════════════════════════════════════════════
function renderBookmarksPage() {
  const grid  = $('bookmarks-grid');
  const empty = $('bookmarks-empty');
  if (!grid) return;
  const bm = getBookmarks();
  if (!bm.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  // Store them so reader works on bookmarks page too
  grid.innerHTML = bm.map((a, i) => renderCard(a, i)).join('');
}

function loadSidebarBookmarks() {
  const el = $('sidebar-bookmarks');
  if (!el) return;
  const bm = getBookmarks().slice(0, 4);
  if (!bm.length) { el.innerHTML = `<p class="sb-empty">No saved articles yet.</p>`; return; }
  el.innerHTML = bm.map(a => `
    <div class="sb-bookmark" onclick="window.open('${escHtml(a.url)}','_blank')" style="cursor:pointer">
      ${a.urlToImage ? `<img class="sb-img" src="${escHtml(a.urlToImage)}" alt="" loading="lazy" onerror="this.style.display='none'">` : '<div class="sb-img" style="background:var(--bg3)"></div>'}
      <div>
        <div class="sb-title">${escHtml(truncate(a.title, 60))}</div>
        <div class="sb-time">${timeAgo(a.savedAt || a.publishedAt)}</div>
      </div>
    </div>`).join('');
}

function updateBookmarkBadge() {
  const badge = $('bookmark-badge');
  if (!badge) return;
  const count = getBookmarks().length;
  badge.textContent = count > 0 ? String(count) : '';
  badge.style.display = count > 0 ? 'flex' : 'none';
}

// ═══════════════════════════════════════════════════
//  TRENDING SIDEBAR
// ═══════════════════════════════════════════════════
async function loadTrending() {
  const el = $('trending-list');
  if (!el) return;
  el.innerHTML = `<div class="spinner-wrap" style="padding:1rem"><div class="spinner"></div></div>`;
  try {
    const articles = await getTrending();
    el.innerHTML = articles.slice(0, 7).map((a, i) => {
      const key = storeArticle(a);
      return `<div class="trending-item" onclick="openArticle('${key}')">
        <span class="trending-num">${String(i + 1).padStart(2, '0')}</span>
        <div>
          <div class="trending-title">${escHtml(truncate(a.title, 70))}</div>
          <div class="trending-meta">${escHtml(a.source?.name || '')} · ${timeAgo(a.publishedAt)}</div>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<p class="sb-empty">Couldn't load trending</p>`;
  }
}

// ═══════════════════════════════════════════════════
//  BREAKING NEWS TICKER
// ═══════════════════════════════════════════════════
async function initTicker() {
  try {
    const [g, i] = await Promise.allSettled([
      getTopHeadlines({ country: 'us', pageSize: 10 }),
      getIndiaNews({ pageSize: 10 }),
    ]);
    const ga = g.status === 'fulfilled' ? (g.value.articles || []) : [];
    const ia = i.status === 'fulfilled' ? (i.value.articles || []) : [];
    const all = [...ga, ...ia].filter(a => a.title && a.title !== '[Removed]').slice(0, 16);
    const el  = $('ticker-content');
    if (!el || !all.length) return;

    const keys = all.map(a => storeArticle(a));
    el.innerHTML = all.map((a, idx) =>
      `<span class="ticker-item" onclick="openArticle('${keys[idx]}')">${escHtml(a.title)}</span><span class="ticker-sep">◆</span>`
    ).join('');
  } catch (e) { /* ticker is optional */ }
}

// ═══════════════════════════════════════════════════
//  WEATHER WIDGET (Open-Meteo — free, no key needed)
// ═══════════════════════════════════════════════════
function initWeather() {
  const el = $('weather-content');
  if (!navigator.geolocation) {
    if (el) el.innerHTML = `<p class="weather-error">Geolocation not supported</p>`;
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async pos => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const [wRes, gRes] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&wind_speed_unit=kmh`),
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, { headers: { 'User-Agent': 'NewsWave/1.0' } })
        ]);
        const w    = await wRes.json();
        const geo  = await gRes.json();
        const c    = w.current;
        const city = geo.address?.city || geo.address?.town || geo.address?.state || 'Your Location';
        if (el) el.innerHTML = `
          <div class="weather-main">
            <div class="weather-icon">${weatherIcon(c.weather_code)}</div>
            <div>
              <div class="weather-temp">${Math.round(c.temperature_2m)}°C</div>
              <div class="weather-desc">${weatherDesc(c.weather_code)}</div>
              <div class="weather-city">📍 ${escHtml(city)}</div>
            </div>
          </div>
          <div class="weather-details">
            <div class="weather-detail">💧 ${c.relative_humidity_2m}%</div>
            <div class="weather-detail">🌬️ ${Math.round(c.wind_speed_10m)} km/h</div>
          </div>`;
      } catch { if (el) el.innerHTML = `<p class="weather-error">Weather unavailable</p>`; }
    },
    () => { if (el) el.innerHTML = `<p class="weather-error">Allow location for weather</p>`; }
  );
}

function weatherIcon(c) {
  if (c === 0) return '☀️'; if (c <= 2) return '⛅'; if (c <= 3) return '☁️';
  if (c <= 48) return '🌫️'; if (c <= 57) return '🌦️'; if (c <= 67) return '🌧️';
  if (c <= 77) return '❄️'; if (c <= 82) return '🌧️'; if (c <= 99) return '⛈️';
  return '🌤️';
}
function weatherDesc(c) {
  if (c === 0) return 'Clear sky'; if (c <= 2) return 'Partly cloudy'; if (c <= 3) return 'Overcast';
  if (c <= 48) return 'Foggy'; if (c <= 57) return 'Drizzle'; if (c <= 67) return 'Rainy';
  if (c <= 77) return 'Snowy'; if (c <= 82) return 'Showers'; return 'Thunderstorm';
}

// ═══════════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════════
window.setTheme = function (theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('nw_theme', theme);
  const btn = $('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
};

window.setAccent = function (color, dark) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-dark', dark);
  document.documentElement.style.setProperty('--accent-light', color + '22');
  localStorage.setItem('nw_accent', JSON.stringify({ color, dark }));
  document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.color === color));
};

window.closeThemePanel = function () { $('theme-panel')?.classList.remove('open'); };

$('theme-toggle')?.addEventListener('click', e => {
  e.stopPropagation();
  $('theme-panel')?.classList.toggle('open');
});
document.addEventListener('click', e => {
  if (!e.target.closest('#theme-panel') && !e.target.closest('#theme-toggle')) {
    $('theme-panel')?.classList.remove('open');
  }
});

function restoreTheme() {
  const theme  = localStorage.getItem('nw_theme') || 'light';
  setTheme(theme);
  const accent = JSON.parse(localStorage.getItem('nw_accent') || 'null');
  if (accent) setAccent(accent.color, accent.dark);
}

// ═══════════════════════════════════════════════════
//  NAVBAR — scroll, hamburger, nav-links
// ═══════════════════════════════════════════════════
window.addEventListener('scroll', () => {
  $('navbar')?.classList.toggle('scrolled', window.scrollY > 10);
  $('scroll-top')?.classList.toggle('visible', window.scrollY > 300);
  const prog = $('reading-progress');
  if (prog) {
    const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    prog.style.width = `${Math.min(100, pct || 0)}%`;
  }
});

$('hamburger')?.addEventListener('click', () => {
  $('nav-links')?.classList.toggle('open');
  $('hamburger')?.classList.toggle('open');
});

function closeMenu() {
  $('nav-links')?.classList.remove('open');
  $('hamburger')?.classList.remove('open');
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const cat = link.dataset.cat;
    if (cat) navigate(cat);
  });
});

// ═══════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════
let toastTimer;
window.showToast = function (msg) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
};

// ═══════════════════════════════════════════════════
//  MISC
// ═══════════════════════════════════════════════════
window.handleContactForm = function (e) {
  e.preventDefault();
  showToast("✅ Message sent! We'll be in touch.");
  e.target.reset();
};

// Voice search
function initVoiceSearch() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR || !searchInput) return;
  const recognition = new SR();
  recognition.lang = 'en-IN';
  recognition.onresult = e => {
    const q = e.results[0][0].transcript;
    searchInput.value = q;
    doSearch(q);
  };
  const micBtn = document.createElement('button');
  micBtn.type = 'button';
  micBtn.title = 'Voice search';
  micBtn.setAttribute('aria-label', 'Voice search');
  micBtn.innerHTML = '🎤';
  micBtn.style.cssText = 'position:absolute;right:2rem;top:50%;transform:translateY(-50%);font-size:.9rem;padding:.15rem .25rem;background:none;border:none;cursor:pointer;opacity:.6;transition:opacity .2s';
  micBtn.onmouseenter = () => micBtn.style.opacity = '1';
  micBtn.onmouseleave = () => micBtn.style.opacity = '.6';
  micBtn.onclick = () => { recognition.start(); showToast('🎤 Listening…'); };
  $('search-box')?.appendChild(micBtn);
}

// ═══════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════
async function init() {
  restoreTheme();
  updateBookmarkBadge();
  document.querySelector('.nav-link[data-cat="home"]')?.classList.add('active');

  // Run critical stuff in parallel
  await Promise.allSettled([
    initCarousel(),
    initHome(),
    initTicker(),
  ]);

  initWeather();
  initVoiceSearch();
}

init();
