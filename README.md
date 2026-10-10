# MYLO Instructions

### Edit content in CMS

1. Open `https://mycardona.github.io/portfolio/admin/`.
2. If auth callback gets blocked in your browser, use `https://scintillating-pegasus-27bdcb.netlify.app/admin/` directly.
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
