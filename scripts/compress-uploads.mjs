// Shrinks oversized images in src/uploads in place (same filename and format).
// Usage: node scripts/compress-uploads.mjs [--dry-run]
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const MAX_EDGE = 2400;
const MIN_SAVINGS = 0.95; // only overwrite when result is < 95% of original bytes
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "uploads");
const dryRun = process.argv.includes("--dry-run");

const HEAVY_BYTES = 2 * 1024 * 1024;

const mb = (n) => (n / 1024 / 1024).toFixed(2) + " MB";

// Re-encoding an already-processed file is lossy and gains little, so only touch
// files that are oversized, heavy, or still carry metadata (EXIF/GPS/XMP/IPTC).
async function needsWork(buf, size) {
  const m = await sharp(buf, { failOn: "none" }).metadata();
  return (
    Math.max(m.width ?? 0, m.height ?? 0) > MAX_EDGE ||
    size > HEAVY_BYTES ||
    Boolean(m.exif || m.xmp || m.iptc)
  );
}

async function encode(buf, ext) {
  // rotate() applies EXIF orientation; output carries no metadata (EXIF/GPS dropped).
  const img = sharp(buf, { failOn: "none" })
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return img.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    case ".webp":
      return img.webp({ quality: 80 }).toBuffer();
    case ".png":
      return img.png({ compressionLevel: 9, effort: 10 }).toBuffer();
  }
}

async function walk(d) {
  const out = [];
  for (const e of await readdir(d, { withFileTypes: true })) {
    const full = path.join(d, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

const files = (await walk(dir)).sort();
let before = 0;
let after = 0;
let changed = 0;
let skipped = 0;
let failed = 0;

for (const file of files) {
  const name = path.relative(dir, file);
  const ext = path.extname(file).toLowerCase();
  const size = (await stat(file)).size;
  before += size;
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    after += size;
    skipped++;
    continue;
  }
  try {
    const buf = await readFile(file);
    const out = (await needsWork(buf, size)) ? await encode(buf, ext) : null;
    if (out && out.length < size * MIN_SAVINGS) {
      if (!dryRun) await writeFile(file, out);
      after += out.length;
      changed++;
      console.log(`${dryRun ? "would compress" : "compressed"}  ${name}  ${mb(size)} -> ${mb(out.length)}`);
    } else {
      after += size;
      skipped++;
      console.log(`unchanged   ${name}  ${mb(size)}`);
    }
  } catch (err) {
    after += size;
    failed++;
    console.warn(`failed      ${name}: ${err.message}`);
  }
}

console.log(
  `\n${dryRun ? "[dry run] " : ""}${changed} compressed, ${skipped} skipped, ${failed} failed. ` +
    `Total ${mb(before)} -> ${mb(after)} (saved ${mb(before - after)})`
);
