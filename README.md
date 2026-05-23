# 📡 NewsWave — Modern News Web Application

A production-ready, fully responsive news platform powered by News API. Covers India and the world with live articles, dark mode, bookmarks, weather, voice search, and more.

## ✨ Features

- 🇮🇳 Dedicated India News (top headlines + search)
- 🌍 Global news across 8 categories
- 🎠 Auto-sliding hero carousel
- 📺 Live breaking news ticker
- 🔍 Search with voice support & suggestions
- 🔖 Bookmarks (localStorage)
- ❤️ Like articles
- 📤 Share articles
- 🌙 Dark / Light / Sepia themes
- 🎨 6 accent color options
- 🌤 Real-time weather widget (Open-Meteo, free)
- ♾️ Pagination
- 💀 Skeleton loading animations
- 📱 Fully responsive (mobile → desktop)

## 🚀 Quick Start (VS Code)

```bash
# 1. Extract the zip and open folder in VS Code

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
# → Opens at http://localhost:3000
```

## 🔑 API Keys

Your keys are already configured in `.env`. To use your own:
1. Copy `.env.example` to `.env`
2. Fill in your keys from https://newsapi.org

```
VITE_ENGLISH_API_KEY=your_english_key
VITE_INDIAN_API_KEY=your_india_key
VITE_NEWS_API_BASE=https://newsapi.org/v2
```

⚠️ Never commit `.env` to Git (already in `.gitignore`).

## 📦 Build for Production

```bash
npm run build
# Output → /dist folder
```

## 🌍 Deploy to Vercel

### Option A — Vercel CLI
```bash
npm i -g vercel
vercel
# Add env vars when prompted, or in the Vercel dashboard
vercel --prod
```

### Option B — GitHub + Vercel Dashboard
1. `git init && git add . && git commit -m "init"`
2. Push to GitHub
3. Go to vercel.com → New Project → Import repo
4. Add Environment Variables:
   - `VITE_ENGLISH_API_KEY` = your key
   - `VITE_INDIAN_API_KEY` = your key
5. Deploy ✅

## 📁 Project Structure

```
newswave/
├── index.html              ← Main HTML (single page app)
├── vite.config.js
├── package.json
├── .env                    ← Your API keys (git-ignored)
├── .env.example
└── src/
    ├── main.js             ← App logic, routing, rendering
    ├── api/
    │   └── newsApi.js      ← Both API integrations
    ├── utils/
    │   └── helpers.js      ← Time, bookmarks, likes, share
    └── styles/
        └── main.css        ← Full responsive stylesheet
```

## License
MIT © 2026 NewsWave
