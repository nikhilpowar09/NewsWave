async function fetchNews(url) {
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch");
  }

  return data;
}

// ── Top Headlines ─────────────────────────────────────────────
export async function getTopHeadlines({
  category = "",
  country = "us",
  page = 1,
  pageSize = 20,
} = {}) {
  let url =
    `/api/news?country=${country}` +
    `&page=${page}` +
    `&pageSize=${pageSize}`;

  if (category) {
    url += `&category=${category}`;
  }

  return fetchNews(url);
}

// ── India News ────────────────────────────────────────────────
export async function getIndiaNews({
  page = 1,
  pageSize = 20,
} = {}) {
  return fetchNews(
    `/api/search?q=India&page=${page}&pageSize=${pageSize}`
  );
}

// ── Search ────────────────────────────────────────────────────
export async function searchNews({
  q,
  page = 1,
  pageSize = 20,
} = {}) {
  const safeQ = q?.trim() || "world news";

  return fetchNews(
    `/api/search?q=${encodeURIComponent(
      safeQ
    )}&page=${page}&pageSize=${pageSize}`
  );
}

// ── India Search ──────────────────────────────────────────────
export async function searchIndia({
  q = "india",
  page = 1,
  pageSize = 20,
} = {}) {
  return fetchNews(
    `/api/search?q=${encodeURIComponent(
      q
    )}&page=${page}&pageSize=${pageSize}`
  );
}

// ── Category Fetch ────────────────────────────────────────────
export async function getCategory(
  category,
  page = 1,
  sortBy = "publishedAt",
  pageSize = 12
) {
  switch (category) {
    case "india":
      return getIndiaNews({
        page,
        pageSize,
        sortBy,
      });

    case "world":
      return getTopHeadlines({
        country: "us",
        page,
        pageSize,
      });

    case "technology":
    case "sports":
    case "entertainment":
    case "business":
    case "health":
    case "science":
      return getTopHeadlines({
        category,
        country: "us",
        page,
        pageSize,
      });

    default:
      return getTopHeadlines({
        country: "us",
        page,
        pageSize,
      });
  }
}

// ── Trending ──────────────────────────────────────────────────
export async function getTrending() {
  const [world, india] = await Promise.allSettled([
    getTopHeadlines({
      country: "us",
      pageSize: 10,
    }),

    getIndiaNews({
      pageSize: 10,
    }),
  ]);

  const worldArticles =
    world.status === "fulfilled"
      ? world.value.articles || []
      : [];

  const indiaArticles =
    india.status === "fulfilled"
      ? india.value.articles || []
      : [];

  return [...worldArticles, ...indiaArticles];
}