// ── NewsWave API Module ─────────────────────────────────────────────
const ENGLISH_KEY = import.meta.env.VITE_ENGLISH_API_KEY;
const INDIAN_KEY  = import.meta.env.VITE_INDIAN_API_KEY;
const BASE        = import.meta.env.VITE_NEWS_API_BASE || 'https://newsapi.org/';

async function fetchNews(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === 'error') {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

function buildUrl(endpoint, params, key) {
  const p = new URLSearchParams({ ...params, apiKey: key });
  return `${BASE}/${endpoint}?${p}`;
}

// ── Global top headlines ────────────────────────────────────────────
export async function getTopHeadlines({ category = '', country = 'us', page = 1, pageSize = 20 } = {}) {
  const params = { country, page, pageSize };
  if (category) params.category = category;
  return fetchNews(buildUrl('top-headlines', params, ENGLISH_KEY));
}

// ── India news: tries country=in first, falls back to /everything ──
export async function getIndiaNews({ page = 1, pageSize = 20, sortBy = 'publishedAt' } = {}) {
  // Strategy 1: top-headlines country=in with Indian key
  try {
    const data = await fetchNews(buildUrl('top-headlines', { country: 'in', page, pageSize }, INDIAN_KEY));
    if (data.articles && data.articles.length > 0) {
      return { ...data, articles: data.articles.map(a => ({ ...a, _src: 'india' })) };
    }
  } catch (_) {}

  // Strategy 2: /everything with Indian query on Indian key
  try {
    const data = await fetchNews(buildUrl('everything', {
      q: 'India OR Delhi OR Mumbai OR Modi',
      language: 'en', sortBy, page, pageSize
    }, INDIAN_KEY));
    if (data.articles && data.articles.length > 0) {
      return { ...data, articles: data.articles.map(a => ({ ...a, _src: 'india' })) };
    }
  } catch (_) {}

  // Strategy 3: /everything with Indian query on English key
  const data = await fetchNews(buildUrl('everything', {
    q: 'India OR Delhi OR Mumbai', language: 'en', sortBy, page, pageSize
  }, ENGLISH_KEY));
  return { ...data, articles: (data.articles || []).map(a => ({ ...a, _src: 'india' })) };
}

// ── India-specific topic search ─────────────────────────────────────
export async function searchIndia({ q = 'india', page = 1, pageSize = 20, sortBy = 'publishedAt' } = {}) {
  try {
    const data = await fetchNews(buildUrl('everything', {
      q, language: 'en', sortBy, page, pageSize
    }, INDIAN_KEY));
    return { ...data, articles: (data.articles || []).map(a => ({ ...a, _src: 'india' })) };
  } catch (_) {
    const data = await fetchNews(buildUrl('everything', {
      q, language: 'en', sortBy, page, pageSize
    }, ENGLISH_KEY));
    return { ...data, articles: (data.articles || []).map(a => ({ ...a, _src: 'india' })) };
  }
}

// ── General search ──────────────────────────────────────────────────
export async function searchNews({ q, page = 1, pageSize = 20, sortBy = 'relevancy' } = {}) {
  const isIndianQuery = /\b(india|indian|delhi|mumbai|bengaluru|chennai|kolkata|hyderabad|modi|bjp|congress|bollywood|cricket|ipl|rupee|bse|nse)\b/i.test(q || '');
  const key = isIndianQuery ? INDIAN_KEY : ENGLISH_KEY;
  const safeQ = q && q.trim() ? q.trim() : 'world news';
  const data = await fetchNews(buildUrl('everything', { q: safeQ, language: 'en', sortBy, page, pageSize }, key));
  return {
    ...data,
    articles: (data.articles || []).map(a => ({ ...a, _src: isIndianQuery ? 'india' : 'global' }))
  };
}

// ── Category fetch ──────────────────────────────────────────────────
export async function getCategory(category, page = 1, sortBy = 'publishedAt', pageSize = 12) {
  switch (category) {
    case 'india':
      return getIndiaNews({ page, pageSize, sortBy });
    case 'world':
      return getTopHeadlines({ country: 'us', page, pageSize });
    case 'technology':
    case 'sports':
    case 'entertainment':
    case 'business':
    case 'health':
    case 'science':
      return getTopHeadlines({ category, country: 'us', page, pageSize });
    default:
      return getTopHeadlines({ country: 'us', page, pageSize });
  }
}

// ── Trending mix ────────────────────────────────────────────────────
export async function getTrending() {
  const [g, i] = await Promise.allSettled([
    getTopHeadlines({ country: 'us', pageSize: 10 }),
    getIndiaNews({ pageSize: 10 })
  ]);
  const ga = g.status === 'fulfilled' ? (g.value.articles || []) : [];
  const ia = i.status === 'fulfilled' ? (i.value.articles || []) : [];
  const merged = [];
  const max = Math.max(ga.length, ia.length);
  for (let x = 0; x < max; x++) {
    if (ga[x]) merged.push({ ...ga[x], _src: 'global' });
    if (ia[x]) merged.push({ ...ia[x], _src: 'india' });
  }
  return merged.filter(a => a.title !== '[Removed]' && a.title);
}
