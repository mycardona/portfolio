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

## Configure Decap CMS (Netlify Git Gateway)

Edit `src/admin/config.yml`:

- `backend.name` should be `git-gateway`
- `site_url`: set your Netlify production URL

### Set up Netlify auth

1. Connect this repo to Netlify and deploy.
2. In Netlify site settings, go to `Identity` and click `Enable Identity`.
3. Set registration to `Invite only` (recommended).
4. In `Identity > Services`, enable `Git Gateway`.
5. Invite editors from `Identity > Invite users`.
6. Editors sign in at `/admin/` with Netlify Identity and can publish directly to the repo via Git Gateway.

`src/admin/index.html` already includes the Netlify Identity widget script needed for invite/login flows.

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
Default category options are `original work`, `performance work`, `facilitation work`, and `directorship work`, and editors can add new ones.

## Media strategy

- Images upload to `src/uploads/` and are optimized in build output.
- Video/audio files should stay on YouTube/Vimeo/SoundCloud. Paste the URL into `Video or Audio URL`.

## Deploy to GitHub Pages

1. Push to `main`.
2. In GitHub repo settings, enable Pages and choose **GitHub Actions** as source.
3. The workflow at `.github/workflows/deploy.yml` builds and publishes `_site`.

## Deploy to Netlify

1. In Netlify, import this GitHub repo as a new site.
2. Build command: `npm run build`
3. Publish directory: `_site`
4. Node version: `20.5+` (set in Netlify environment if needed)
5. After first deploy, complete the Identity/Git Gateway steps above.

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
