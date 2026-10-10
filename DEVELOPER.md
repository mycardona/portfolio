# Zero-Dollar Portfolio Stack (Eleventy + Decap CMS)

This project uses GitHub Pages for the public site and Decap CMS for editor updates.
Netlify is used for GitHub OAuth provider tokens.

The Netlify site only publishes `src/admin` (see `netlify.toml`) and skips builds unless `src/admin` or `netlify.toml` changes. On Netlify, the admin reads `config.yml` from the GitHub Pages site, so CMS field changes go live with the normal Pages deploy (allow up to ~10 minutes for Pages caching).

## Updates

Use this section for normal day-to-day changes after initial setup.

### Edit content in CMS

1. Open `https://mycardona.github.io/portfolio/admin/`.
2. Login goes through Netlify's OAuth service (`api.netlify.com`), which keeps working even when the Netlify site's credits run out. If the login popup gets blocked in your browser, try `https://scintillating-pegasus-27bdcb.netlify.app/admin/` instead.
3. Log in with GitHub.
4. Update collections (defined in `src/admin/config.yml`):
- `Projects`: title, date (month/year), categories, summary, venue name + URL, cover image, gallery images (bulk upload), video/audio URL, and body.
- `Categories`: title, slug, description, and sort order. These drive the homepage Selected Work cards.
- `Videos`: homepage reel entries: title, reel tag (tab label, e.g. `Dramatic`), and video URL.
- `Press + Testimonials`: quote, source, source link, and sort order.
- `Homepage`: section copy for Hero, Selected Work, Reel, Press, and Current + Upcoming.
- `About`: Hero, Detail (sections of paragraphs), and Resume (stage/film credits, recognition, works, skills, training, contact button).
- `Footer`: connect links (Booking, Email, Instagram, LinkedIn, YouTube, X), each with an optional SVG icon override and sort order.
5. Save/publish changes in CMS. Decap commits directly to `main`.
6. GitHub Actions deploys updated Pages output.

Notes:

- `Homepage` fields are mostly section labels and fallback/empty-state text. The cards and items in those sections come from the `Categories`, `Videos`, `Press + Testimonials`, and `Projects` collections.
- Media URL fields accept a full `https://...` URL or a site-relative uploaded file path like `/uploads/reel.mp4`.
- Uploaded images and media land in `src/uploads` and are referenced as `/uploads/...`.
- Because the CMS commits to `main`, pull before making local code changes to avoid conflicts with content edits.

### Update code or styles locally

1. Pull latest changes.
2. Install dependencies:

```bash
npm install
```

3. Run local site:

```bash
npm run dev
```

4. Optional local CMS backend:

```bash
npm run dev:cms
```

### Upload compression

Images in `src/uploads/` are compressed automatically on every deploy: the workflow runs `npm run compress:uploads` before the build and, if anything changed, commits the result to `main` as `github-actions[bot]` (`[skip ci]`). Long edge is capped at 2400px, EXIF orientation is applied, metadata (including GPS) is stripped, and the filename and format stay the same, so existing references keep working. The script is idempotent.

- Run it locally with `npm run compress:uploads` (add `-- --dry-run` to preview).
- Originals remain in git history, and `.git` does not shrink without a history rewrite.

### Decap package upgrades

When upgrading `decap-cms` or the bulk image widget package:

1. Update npm packages.
2. Refresh self-hosted admin vendor files:

```bash
npm run sync:admin-vendor
```

3. Update the pinned CDN script tags in `src/admin/index.html` to the new versions and regenerate their SRI hashes. The admin loads Decap from jsDelivr so Netlify only serves the admin page, `config.yml`, and OAuth; the `vendor/` copies are a fallback if the CDN is unreachable.

```bash
openssl dgst -sha384 -binary src/admin/vendor/decap-cms.js | openssl base64 -A
openssl dgst -sha384 -binary src/admin/vendor/decap-cms-widget-bulk-github-images.js | openssl base64 -A
```

Prefix each hash with `sha384-` in the `integrity` attribute.

4. Build before deploy:

```bash
npm run build
```

5. For GitHub Pages path-prefix verification:

```bash
SITE_PATH_PREFIX=/portfolio npm run build
```

### Keep auth/config values aligned

Update these in `src/admin/config.yml` when domains/repos change:

- `backend.repo`: `owner/repo`
- `backend.branch`
- `backend.site_domain`: Netlify site domain only (no protocol)
- `backend.auth_scope`: use `public_repo` for public repositories
- `site_url`: public GitHub Pages URL

Use the GitHub Pages admin (`https://mycardona.github.io/portfolio/admin/`); it no longer redirects to Netlify. The Netlify copy of the admin loads its `config.yml` from the Pages site (see `src/admin/index.html`).

### GitHub collaborator allowlist (Option 1)

Allowlist enforcement is done via GitHub repository access, not Decap config.

- Allowed GitHub account(s): `mycardona`
- Remove all other direct collaborators and team grants from the repo
- Keep this list in sync with GitHub `Settings -> Collaborators and teams`

## Fresh Start

Use this section to set up from scratch.

### Prerequisites

- Node.js `20.5+`
- GitHub repo with this project
- Netlify account

### 1) Install and run locally

```bash
npm install
npm run dev
```

Optional local CMS backend:

```bash
npm run dev:cms
```

### 2) Configure Decap CMS backend

Set `src/admin/config.yml`:

- `backend.name: github`
- `backend.repo: <owner>/<repo>`
- `backend.branch: main`
- `backend.site_domain: <netlify-site>.netlify.app`
- `backend.auth_scope: public_repo`
- `site_url: https://<user>.github.io/<repo>/`

### 3) Set up GitHub OAuth app

In GitHub: `Settings -> Developer settings -> OAuth Apps -> New OAuth App`

- Homepage URL: your public site URL
- Authorization callback URL: `https://api.netlify.com/auth/done`

Copy client ID and client secret.

### 4) Configure Netlify OAuth provider

1. In Netlify, create/import a site (same repo is fine).
2. Open site settings: `Access & security -> OAuth -> Authentication providers`.
3. Install `GitHub` provider.
4. Paste OAuth app client ID + client secret.

### 5) Deploy public site on GitHub Pages

1. Push to `main`.
2. In GitHub repo settings, enable Pages with **GitHub Actions** source.
3. Workflow deploys `_site`.

### 6) Validate CMS login and publishing

1. Open `https://<user>.github.io/<repo>/admin/`.
2. Confirm login works and you can create or update an entry.
3. Confirm commit lands in GitHub and Pages redeploys.
