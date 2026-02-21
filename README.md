# Zero-Dollar Portfolio Stack (Eleventy + Decap CMS)

This repo is set up so a non-technical editor can add/update projects from `/admin`.

Public routes:
- `/portfolio/` portfolio landing page
- `/portfolio/category/<slug>/` one page per category
- `/projects/` all-projects fallback index

## What this includes

- Eleventy static site generator (free)
- Decap CMS admin panel (free, open source)
- GitHub Pages deployment workflow (free)
- Project content model with:
  - text/Markdown body
  - cover image
  - gallery images
  - optional `Video or Audio URL` (YouTube, Vimeo, SoundCloud)

## Quick start

Prerequisite: Node.js `20.5+`.

1. Install dependencies:

```bash
npm install
```

2. Run the site:

```bash
npm run dev
```

3. (Optional for local CMS testing) Run Decap local backend in a second terminal:

```bash
npm run dev:cms
```

4. Open:
- Site: `http://localhost:8080`
- CMS: `http://localhost:8080/admin/`

## Configure Decap CMS

Edit `src/admin/config.yml`:

- `backend.repo`: set your real `owner/repo`
- `site_url`: set your production URL

### Important auth note

`backend: github` requires OAuth for production logins. Local editing works with `local_backend: true`, but for your friend to edit on the live site you must configure a GitHub OAuth flow (Decap auth endpoint) and then add those settings in `src/admin/config.yml`.

## Content model (for your editor)

In `/admin` they fill in:

- `Title`
- `Date`
- `Categories` (supports defaults + custom additions)
- `Summary` (optional)
- `Cover Image` (optional)
- `Gallery Images` (optional)
- `Video or Audio URL` (optional)
- `Body`

Each save creates/updates a Markdown file in `src/content/projects/`.
Default category options are `original`, `performance`, `facilitation`, and `directing`, and editors can add new ones.

## Media strategy

- Images upload to `src/uploads/` and are optimized in build output.
- Video/audio files should stay on YouTube/Vimeo/SoundCloud. Paste the URL into `Video or Audio URL`.

## Deploy to GitHub Pages

1. Push to `main`.
2. In GitHub repo settings, enable Pages and choose **GitHub Actions** as source.
3. The workflow at `.github/workflows/deploy.yml` builds and publishes `_site`.

## Project structure

- `src/admin/` Decap CMS UI + config
- `src/content/projects/` Markdown project entries
- `src/portfolio/` portfolio landing + generated category pages
- `src/uploads/` uploaded images
- `src/_includes/layouts/` site layouts
- `.eleventy.js` collections, image optimization, media URL embeds
