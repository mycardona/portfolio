const path = require("node:path");
const Image = require("@11ty/eleventy-img");
const rawPathPrefix = process.env.SITE_PATH_PREFIX || "/";

function normalizePathPrefix(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed === "/") return "/";
  const withoutEdges = trimmed.replace(/^\/+|\/+$/g, "");
  if (!withoutEdges) return "/";
  return `/${withoutEdges}/`;
}

const pathPrefix = normalizePathPrefix(rawPathPrefix);

function withPathPrefix(pathname) {
  let cleanPath = String(pathname || "/").trim();
  if (!cleanPath.startsWith("/")) {
    cleanPath = `/${cleanPath}`;
  }

  if (pathPrefix === "/") return cleanPath;
  return `${pathPrefix.replace(/\/$/, "")}${cleanPath}`;
}

function assetUrl(value) {
  const input = String(value || "").trim();
  if (!input) return "";
  if (/^(?:[a-z]+:)?\/\//i.test(input)) return input;
  if (input.startsWith("data:") || input.startsWith("#")) return input;
  return withPathPrefix(input);
}

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

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(value, maxLength = 170) {
  const clean = stripHtml(value);
  if (!clean) return "";
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).replace(/\s+\S*$/, "").trim()}...`;
}

function galleryItemSrc(item) {
  if (!item) return "";
  return typeof item === "string" ? item : item.image || "";
}

function projectPreviewImage(project) {
  const data = project?.data || project || {};
  if (data.coverImage) return data.coverImage;
  return toArray(data.gallery).map(galleryItemSrc).find(Boolean) || "";
}

let categoryLabelsBySlug = new Map();

function categoryKey(category) {
  if (typeof category === "object" && category) {
    return String(category.slug || category.title || category.name || "").trim();
  }
  return String(category || "").trim();
}

function categorySlug(category) {
  return categoryKey(category)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function categoryLabel(category) {
  if (typeof category === "object" && category) {
    const explicitLabel = String(category.title || category.name || "").trim();
    if (explicitLabel) return explicitLabel;
  }

  const key = categoryKey(category);
  if (!key) return "";

  const slug = categorySlug(key);
  return categoryLabelsBySlug.get(slug) || key;
}

function parseCategoryOrder(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareCategoryEntries(a, b) {
  const aOrder = a?.order ?? Number.POSITIVE_INFINITY;
  const bOrder = b?.order ?? Number.POSITIVE_INFINITY;

  if (aOrder !== bOrder) return aOrder - bOrder;
  return String(a?.name || "").localeCompare(String(b?.name || ""));
}

function configuredCategories(collectionApi) {
  return collectionApi
    .getFilteredByGlob("src/content/categories/*.md")
    .map((item) => {
      const data = item?.data || {};
      const title = String(data.title || data.name || "").trim();
      const slug = categorySlug(data.slug || title);
      const description = String(data.description || "").trim();
      const order = parseCategoryOrder(data.order);
      if (!slug) return null;
      return { title: title || slug, name: title || slug, slug, description, order };
    })
    .filter(Boolean)
    .sort(compareCategoryEntries);
}

function updateCategoryLabelMap(categories) {
  categoryLabelsBySlug = new Map(categories.map((category) => [category.slug, category.name]));
}

function categoryUrl(category) {
  const slug = typeof category === "object" && category?.slug
    ? category.slug
    : categorySlug(category);
  if (!slug) return withPathPrefix("/");
  return withPathPrefix(`/category/${slug}/`);
}

function buildProjectCategoryPages(projects, categories = []) {
  const categoriesBySlug = new Map();
  const categoryBySlug = new Map(categories.map((entry) => [entry.slug, entry]));

  categories.forEach((entry) => {
    categoriesBySlug.set(entry.slug, {
      name: entry.name,
      slug: entry.slug,
      description: entry.description || "",
      order: entry.order ?? null,
      projects: []
    });
  });

  projects.forEach((item) => {
    const seen = new Set();
    toArray(item.data.categories)
      .map(categoryKey)
      .filter(Boolean)
      .forEach((category) => {
        const slug = categorySlug(category);
        if (!slug || seen.has(slug)) return;
        seen.add(slug);

        const categoryEntry = categoryBySlug.get(slug);
        const name = categoryEntry?.name || category;
        const description = categoryEntry?.description || "";
        const order = categoryEntry?.order ?? null;

        if (!categoriesBySlug.has(slug)) {
          categoriesBySlug.set(slug, { name, slug, description, order, projects: [] });
        }
        categoriesBySlug.get(slug).projects.push(item);
      });
  });

  return Array.from(categoriesBySlug.values()).sort(compareCategoryEntries);
}

function buildReelGroups(videos = []) {
  const groupsByKey = new Map();

  videos.forEach((item) => {
    const data = item?.data || {};
    const mediaUrl = String(data.mediaUrl || "").trim();
    if (!mediaUrl) return;

    const label = String(data.reelTag || data.title || "Video").trim() || "Video";
    const key = categorySlug(label) || `group-${groupsByKey.size + 1}`;

    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, { key, label, videos: [] });
    }

    groupsByKey.get(key).videos.push(item);
  });

  return Array.from(groupsByKey.values());
}

function buildPressQuotes(collectionApi) {
  return collectionApi
    .getFilteredByTag("pressQuotes")
    .map((item) => {
      const data = item?.data || {};
      const quote = String(data.quote || "").trim();
      const source = String(data.source || "").trim();
      const sourceUrl = String(data.sourceUrl || "").trim();
      const order = parseCategoryOrder(data.order);

      if (!quote) return null;

      return { quote, source, sourceUrl, order };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aOrder = a?.order ?? Number.POSITIVE_INFINITY;
      const bOrder = b?.order ?? Number.POSITIVE_INFINITY;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(a?.source || a?.quote || "").localeCompare(String(b?.source || b?.quote || ""));
    });
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

const directVideoExtensions = new Set([".mp4", ".webm", ".ogg", ".mov", ".m4v"]);
const directAudioExtensions = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]);

function mediaFileExtension(value) {
  if (!value) return "";

  const cleaned = String(value).split("#")[0].split("?")[0].trim();
  if (!cleaned) return "";

  const extension = path.extname(cleaned).toLowerCase();
  return extension || "";
}

function directMediaSource(value) {
  const input = String(value || "").trim();
  if (!input) return "";

  if (/^(?:https?:)?\/\//i.test(input)) return input;
  if (input.startsWith("/")) return assetUrl(input);

  return "";
}

function mediaEmbed(url, title = "Media") {
  if (!url) return "";

  const source = directMediaSource(url);
  const extension = mediaFileExtension(source || url);
  const safeTitle = escapeHtml(title);

  if (source && directVideoExtensions.has(extension)) {
    const safeSource = escapeHtml(source);
    return `<div class="embed embed-video"><video src="${safeSource}" title="${safeTitle}" controls preload="metadata" playsinline></video></div>`;
  }

  if (source && directAudioExtensions.has(extension)) {
    const safeSource = escapeHtml(source);
    return `<div class="embed embed-audio embed-native-audio"><audio src="${safeSource}" title="${safeTitle}" controls preload="metadata"></audio></div>`;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    const safeText = escapeHtml(url);
    return `<p><a href="${safeText}" target="_blank" rel="noopener noreferrer">Open media link</a></p>`;
  }

  const youtubeUrl = toYouTubeEmbed(parsed);
  if (youtubeUrl) {
    return `<div class="embed embed-video"><iframe src="${youtubeUrl}" title="${safeTitle}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  }

  const vimeoUrl = toVimeoEmbed(parsed);
  if (vimeoUrl) {
    return `<div class="embed embed-video"><iframe src="${vimeoUrl}" title="${safeTitle}" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
  }

  const host = parsed.hostname.replace(/^www\./, "");
  if (host.includes("soundcloud.com")) {
    const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`;
    return `<div class="embed embed-audio"><iframe src="${src}" title="${safeTitle}" loading="lazy" allow="autoplay"></iframe></div>`;
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
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      timeZone: "UTC"
    }).format(parsed);
  });

  eleventyConfig.addFilter("mediaEmbed", mediaEmbed);
  eleventyConfig.addFilter("asArray", (value) => {
    return toArray(value).map(categoryKey).filter(Boolean);
  });
  eleventyConfig.addFilter("categoryLabel", categoryLabel);
  eleventyConfig.addFilter("categorySlug", categorySlug);
  eleventyConfig.addFilter("categoryUrl", categoryUrl);
  eleventyConfig.addFilter("hasCategory", (categories, targetCategory) => {
    const targetSlug = categorySlug(targetCategory);
    if (!targetSlug) return false;
    return toArray(categories)
      .map(categorySlug)
      .filter(Boolean)
      .some((category) => category === targetSlug);
  });
  eleventyConfig.addFilter("galleryItemSrc", galleryItemSrc);
  eleventyConfig.addFilter("projectPreviewImage", projectPreviewImage);
  eleventyConfig.addFilter("assetUrl", assetUrl);
  eleventyConfig.addFilter("excerpt", (value, maxLength = 170) => excerpt(value, maxLength));

  eleventyConfig.addCollection("projects", (collectionApi) => {
    return collectionApi
      .getFilteredByTag("projects")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("reelGroups", (collectionApi) => {
    return buildReelGroups(collectionApi.getFilteredByTag("videos"));
  });

  eleventyConfig.addCollection("pressQuotes", (collectionApi) => {
    return buildPressQuotes(collectionApi);
  });

  eleventyConfig.addCollection("categories", (collectionApi) => {
    const categories = configuredCategories(collectionApi);
    updateCategoryLabelMap(categories);
    return categories;
  });

  eleventyConfig.addCollection("projectCategoryPages", (collectionApi) => {
    const projects = collectionApi
      .getFilteredByTag("projects")
      .sort((a, b) => b.date - a.date);
    const categories = configuredCategories(collectionApi);
    updateCategoryLabelMap(categories);
    return buildProjectCategoryPages(projects, categories);
  });

  eleventyConfig.addCollection("projectCategories", (collectionApi) => {
    const projects = collectionApi
      .getFilteredByTag("projects")
      .sort((a, b) => b.date - a.date);
    const categories = configuredCategories(collectionApi);
    updateCategoryLabelMap(categories);

    return buildProjectCategoryPages(projects, categories).map((entry) => {
      return { name: entry.name, slug: entry.slug, order: entry.order ?? null, count: entry.projects.length };
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
        urlPath: withPathPrefix("/img/")
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
    pathPrefix,
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
