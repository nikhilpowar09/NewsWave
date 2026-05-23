export const timeAgo = d => {
  if (!d) return '';
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
export const formatDate = d => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
export const getDomain    = url => { try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; } };
export const truncate     = (s, n = 120) => s && s.length > n ? s.slice(0, n) + '…' : s || '';
export const escHtml      = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export const getBookmarks = () => JSON.parse(localStorage.getItem('nw_bookmarks') || '[]');
export const saveBookmarks= b => localStorage.setItem('nw_bookmarks', JSON.stringify(b));
export const isBookmarked = url => getBookmarks().some(b => b.url === url);
export const toggleBookmark = article => {
  const bm = getBookmarks();
  const idx = bm.findIndex(b => b.url === article.url);
  if (idx > -1) bm.splice(idx, 1);
  else bm.unshift({ ...article, savedAt: new Date().toISOString() });
  saveBookmarks(bm);
  return idx === -1;
};
export const getLikes  = () => JSON.parse(localStorage.getItem('nw_likes') || '[]');
export const isLiked   = url => getLikes().includes(url);
export const toggleLike= url => {
  const l = getLikes(); const idx = l.indexOf(url);
  if (idx > -1) l.splice(idx, 1); else l.unshift(url);
  localStorage.setItem('nw_likes', JSON.stringify(l)); return idx === -1;
};
export const shareArticle = async article => {
  if (navigator.share) { await navigator.share({ title: article.title, url: article.url }); return 'shared'; }
  await navigator.clipboard.writeText(article.url); return 'copied';
};
export const CATEGORIES = [
  { id: 'home',          label: 'Home',          icon: '🏠' },
  { id: 'india',         label: 'India',         icon: '🇮🇳' },
  { id: 'world',         label: 'World',         icon: '🌍' },
  { id: 'technology',    label: 'Technology',    icon: '💻' },
  { id: 'sports',        label: 'Sports',        icon: '🏆' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'business',      label: 'Business',      icon: '📈' },
  { id: 'health',        label: 'Health',        icon: '❤️' },
  { id: 'science',       label: 'Science',       icon: '🔬' },
];
