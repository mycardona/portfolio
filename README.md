# Zero-Dollar Portfolio Stack (Eleventy + Decap CMS)

This repo is set up so a non-technical editor can add/update projects from `/admin`.

Public routes:
- `/` portfolio landing page
- `/category/<slug>/` one page per category
- `/projects/` all-projects fallback index

On GitHub Pages project sites, these become `/<repo>/...` automatically via `SITE_PATH_PREFIX`.

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

## Configure Decap CMS (GitHub backend + Netlify OAuth)

Edit `src/admin/config.yml`:

- `backend.name`: `github`
- `backend.repo`: your GitHub repo in `owner/repo` format
- `backend.branch`: `main`
- `backend.site_domain`: your Netlify site domain (example: `mylo-auth.netlify.app`)
- `site_url`: your public GitHub Pages URL

### Set up OAuth (one-time)

1. Create a Netlify site to host OAuth provider configuration.
2. In GitHub, create an OAuth App:
   - Homepage URL: your public site URL
   - Authorization callback URL: `https://api.netlify.com/auth/done`
3. In Netlify site settings, go to `Access & security` > `OAuth` > `Authentication providers`.
4. Add `GitHub` and paste the OAuth App client ID and client secret.
5. Commit/push your `config.yml` values.
6. Open `/admin/` on your GitHub Pages site and sign in with GitHub.

`src/admin/index.html` only needs the Decap CMS script for this flow.

## Content model (for your editor)

In `/admin` they fill in:

- `Title`
- `Date`
- `Categories` (supports defaults + custom additions)
- `Summary` (optional)
- `Cover Image` (optional)
- `Gallery Images` (optional, supports multi-select upload in one action)
- `Video or Audio URL` (optional)
- `Body`

Each save creates/updates a Markdown file in `src/content/projects/`.
Default category options are `original work`, `performance work`, `facilitation work`, and `directorship work`, and editors can add new ones.

## Media strategy

- Images upload to `src/uploads/` and are optimized in build output.
- In a project entry, use `Gallery Images` to bulk upload/select multiple files at once from the media picker.
- Video/audio files should stay on YouTube/Vimeo/SoundCloud. Paste the URL into `Video or Audio URL`.

## Deploy to GitHub Pages

1. Push to `main`.
2. In GitHub repo settings, enable Pages and choose **GitHub Actions** as source.
3. The workflow at `.github/workflows/deploy.yml` builds and publishes `_site`.

## Netlify usage in this setup

- Netlify is used for OAuth provider tokens only.
- Your public site can remain fully on GitHub Pages.
- The Netlify site can be a lightweight "auth helper" project.

### Path prefix behavior

This only applies to the GitHub Pages deployment path.

The deploy workflow auto-sets `SITE_PATH_PREFIX`:
- User/org site repo (`<user>.github.io`): `/`
- Project site repo (example: `portfolio`): `/portfolio/`

## Project structure

- `src/admin/` Decap CMS UI + config
- `src/content/projects/` Markdown project entries
- `src/portfolio/` generated category pages
- `src/uploads/` uploaded images
- `src/_includes/layouts/` site layouts
- `.eleventy.js` collections, image optimization, media URL embeds
