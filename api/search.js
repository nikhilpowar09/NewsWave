export default async function handler(req, res) {
  const apiKey = process.env.VITE_INDIAN_API_KEY;

  const {
    q = "India",
    page = 1,
    pageSize = 10,
  } = req.query;

  const url =
    `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}` +
    `&language=en` +
    `&sortBy=publishedAt` +
    `&page=${page}` +
    `&pageSize=${pageSize}` +
    `&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Search failed",
    });
  }
}