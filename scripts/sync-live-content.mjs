import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT_URL = "https://jack-kleinick-cms-auth.bammediaauth.workers.dev/content/works.json";
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = dirname(scriptDirectory);
const coversDirectory = join(root, "assets", "covers", "live");

function slugify(value) {
  return String(value || "cover")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "cover";
}

function normalizeTrack(track) {
  const item = typeof track === "string" ? { title: track, url: "" } : { ...track };
  if (item.url || typeof item.title !== "string") return item;

  const embeddedUrl = item.title.match(/\s+(https?:\/\/\S+)\s*$/i);
  if (!embeddedUrl) return item;

  return {
    ...item,
    title: item.title.slice(0, embeddedUrl.index).trim(),
    url: embeddedUrl[1],
  };
}

function extensionFor(response, url) {
  const urlExtension = extname(new URL(url).pathname).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(urlExtension)) return urlExtension;

  const contentType = (response.headers.get("content-type") || "").split(";")[0];
  return {
    "image/gif": ".gif",
    "image/png": ".png",
    "image/webp": ".webp",
  }[contentType] || ".jpg";
}

async function localizeCover(work) {
  if (!/^https?:\/\//i.test(work.image || "")) return work;

  const response = await fetch(work.image);
  if (!response.ok) throw new Error(`Cover download failed (${response.status}): ${work.image}`);

  const filename = `${slugify(`${work.artist}-${work.album}`)}${extensionFor(response, work.image)}`;
  const outputPath = join(coversDirectory, filename);
  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));

  return {
    ...work,
    tracks: (Array.isArray(work.tracks) ? work.tracks : []).map(normalizeTrack),
    image: relative(root, outputPath).replaceAll("\\", "/"),
  };
}

const response = await fetch(CONTENT_URL, { headers: { Accept: "application/json" } });
if (!response.ok) throw new Error(`Live content request failed: ${response.status}`);

const liveContent = await response.json();
if (!Array.isArray(liveContent.works) || !liveContent.works.length) {
  throw new Error("Live content did not contain any works.");
}

await mkdir(coversDirectory, { recursive: true });
const works = await Promise.all(
  liveContent.works.map((work) =>
    localizeCover({
      ...work,
      tracks: (Array.isArray(work.tracks) ? work.tracks : []).map(normalizeTrack),
    }),
  ),
);

const fallbackContent = {
  updatedAt: liveContent.updatedAt || new Date().toISOString(),
  works,
};
const serialized = `${JSON.stringify(fallbackContent, null, 2)}\n`;

await writeFile(join(root, "content", "works.json"), serialized);
await writeFile(
  join(root, "content", "works.js"),
  `// Managed fallback content for the Jack Kleinick site. Regenerate with node scripts/${basename(import.meta.filename)}.\nwindow.JackKleinickContent = ${serialized.trim()};\n`,
);

console.log(`Synced ${works.length} works and localized ${works.filter((work) => work.image.includes("/live/")).length} covers.`);
