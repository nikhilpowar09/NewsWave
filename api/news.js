export default async function handler(req, res) {
  const apiKey = process.env.VITE_ENGLISH_API_KEY;

  const {
    country = "us",
    category = "",
    page = 1,
    pageSize = 10,
  } = req.query;

  let url =
    `https://newsapi.org/v2/top-headlines?country=${country}` +
    `&page=${page}` +
    `&pageSize=${pageSize}`;

  if (category) {
    url += `&category=${category}`;
  }

  try {
    const response = await fetch(
      `${url}&apiKey=${apiKey}`
    );

    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch news",
    });
  }
}