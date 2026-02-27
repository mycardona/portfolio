# Zero-Dollar Portfolio Stack (Eleventy + Decap CMS)

This project uses GitHub Pages for the public site and Decap CMS for editor updates.
Netlify is used for GitHub OAuth provider tokens.

## Updates

Use this section for normal day-to-day changes after initial setup.

### Edit content in CMS

1. Open `https://mycardona.github.io/portfolio/admin/`.
2. If auth callback gets blocked in your browser, use `https://scintillating-pegasus-27bdcb.netlify.app/admin/` directly.
3. Log in with GitHub.
4. Update collections:
- `Categories`: add/edit category title, slug, and description.
- `Projects`: edit title, date, categories, venue, summary, media URL, cover image, gallery, and body.
5. Save/publish changes in CMS. Decap commits directly to `main`.
6. GitHub Actions deploys updated Pages output.

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

### Decap package upgrades

When upgrading `decap-cms` or the bulk image widget package:

1. Update npm packages.
2. Refresh self-hosted admin vendor files:

```bash
npm run sync:admin-vendor
```

3. Build before deploy:

```bash
npm run build
```

4. For GitHub Pages path-prefix verification:

```bash
SITE_PATH_PREFIX=/portfolio npm run build
```

### Keep auth/config values aligned

Update these in `src/admin/config.yml` when domains/repos change:

- `backend.repo`: `owner/repo`
- `backend.branch`
- `backend.site_domain`: Netlify site domain only (no protocol)
- `site_url`: public GitHub Pages URL

`src/admin/index.html` reads `site_domain` and `site_url` from `config.yml` for the GitHub Pages admin redirect.

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
