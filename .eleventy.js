const path = require("node:path");
const Image = require("@11ty/eleventy-img");

function escapeHtml(value = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveImageInput(src) {
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src;
  return path.join("src", src.replace(/^\//, ""));
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function normalizeCategory(category) {
  return String(category || "").trim();
}

function categorySlug(category) {
  return normalizeCategory(category)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function categoryUrl(category) {
  const slug = typeof category === "object" && category?.slug
    ? category.slug
    : categorySlug(category);
  if (!slug) return "/portfolio/";
  return `/portfolio/category/${slug}/`;
}

function buildProjectCategoryPages(projects) {
  const categoriesBySlug = new Map();

  projects.forEach((item) => {
    toArray(item.data.categories)
      .map(normalizeCategory)
      .filter(Boolean)
      .forEach((category) => {
        const slug = categorySlug(category);
        if (!slug) return;
        if (!categoriesBySlug.has(slug)) {
          categoriesBySlug.set(slug, { name: category, slug, projects: [] });
        }
        categoriesBySlug.get(slug).projects.push(item);
      });
  });

  return Array.from(categoriesBySlug.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function toYouTubeEmbed(parsedUrl) {
  const host = parsedUrl.hostname.replace(/^www\./, "");
  let id = "";

  if (host === "youtu.be") {
    id = parsedUrl.pathname.split("/").filter(Boolean)[0] || "";
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsedUrl.pathname === "/watch") {
      id = parsedUrl.searchParams.get("v") || "";
    } else {
      const parts = parsedUrl.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0])) {
        id = parts[1] || "";
      }
    }
  }

  if (!id) return "";
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}`;
}

function toVimeoEmbed(parsedUrl) {
  const host = parsedUrl.hostname.replace(/^www\./, "");
  if (host !== "vimeo.com" && host !== "player.vimeo.com") return "";

  const segments = parsedUrl.pathname.split("/").filter(Boolean);
  const id = segments.find((segment) => /^\d+$/.test(segment));
  if (!id) return "";

  return `https://player.vimeo.com/video/${id}`;
}

function mediaEmbed(url, title = "Media") {
  if (!url) return "";

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    const safeText = escapeHtml(url);
    return `<p><a href="${safeText}" target="_blank" rel="noopener noreferrer">Open media link</a></p>`;
  }

  const youtubeUrl = toYouTubeEmbed(parsed);
  if (youtubeUrl) {
    return `<div class="embed embed-video"><iframe src="${youtubeUrl}" title="${escapeHtml(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  }

  const vimeoUrl = toVimeoEmbed(parsed);
  if (vimeoUrl) {
    return `<div class="embed embed-video"><iframe src="${vimeoUrl}" title="${escapeHtml(title)}" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
  }

  const host = parsed.hostname.replace(/^www\./, "");
  if (host.includes("soundcloud.com")) {
    const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`;
    return `<div class="embed embed-audio"><iframe src="${src}" title="${escapeHtml(title)}" loading="lazy" allow="autoplay"></iframe></div>`;
  }

  const safeUrl = escapeHtml(url);
  return `<p><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">Open media link</a></p>`;
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });
  eleventyConfig.addPassthroughCopy({ "src/uploads": "uploads" });

  eleventyConfig.addFilter("readableDate", (value) => {
    if (!value) return "";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(value);
  });

  eleventyConfig.addFilter("mediaEmbed", mediaEmbed);
  eleventyConfig.addFilter("asArray", (value) => {
    return toArray(value).map(normalizeCategory).filter(Boolean);
  });
  eleventyConfig.addFilter("categorySlug", categorySlug);
  eleventyConfig.addFilter("categoryUrl", categoryUrl);
  eleventyConfig.addFilter("hasCategory", (categories, targetCategory) => {
    const normalizedTarget = normalizeCategory(targetCategory).toLowerCase();
    if (!normalizedTarget) return false;
    return toArray(categories)
      .map(normalizeCategory)
      .filter(Boolean)
      .some((category) => category.toLowerCase() === normalizedTarget);
  });
  eleventyConfig.addFilter("galleryItemSrc", (item) => {
    if (!item) return "";
    return typeof item === "string" ? item : item.image || "";
  });

  eleventyConfig.addCollection("projects", (collectionApi) => {
    return collectionApi
      .getFilteredByTag("projects")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("projectCategoryPages", (collectionApi) => {
    const projects = collectionApi
      .getFilteredByTag("projects")
      .sort((a, b) => b.date - a.date);
    return buildProjectCategoryPages(projects);
  });

  eleventyConfig.addCollection("projectCategories", (collectionApi) => {
    const projects = collectionApi
      .getFilteredByTag("projects")
      .sort((a, b) => b.date - a.date);

    return buildProjectCategoryPages(projects).map((entry) => {
      return { name: entry.name, slug: entry.slug, count: entry.projects.length };
    });
  });

  eleventyConfig.addNunjucksAsyncShortcode("optimizedImage", async (src, alt = "") => {
    if (!src) return "";

    const input = resolveImageInput(src);

    try {
      const metadata = await Image(input, {
        widths: [480, 800, 1200],
        formats: ["avif", "webp", "jpeg"],
        outputDir: "_site/img/",
        urlPath: "/img/"
      });

      return Image.generateHTML(metadata, {
        alt,
        sizes: "(min-width: 56rem) 50vw, 100vw",
        loading: "lazy",
        decoding: "async"
      });
    } catch {
      const safeSrc = escapeHtml(src);
      const safeAlt = escapeHtml(alt || "");
      return `<img src="${safeSrc}" alt="${safeAlt}" loading="lazy" decoding="async">`;
    }
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};
