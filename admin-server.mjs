import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { basename, extname, join, normalize, resolve, sep } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const port = Number(process.env.ADMIN_PORT || 4184);
const contentPath = join(root, "content", "works.js");
const assetRoot = join(root, "assets", "covers");
const passwordPath = join(root, ".admin-password");
const sessions = new Map();
const sessionTtlMs = 1000 * 60 * 60 * 12;

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function textResponse(response, status, body, headers = {}) {
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(body);
}

function jsonResponse(response, status, body, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

async function getPassword() {
  if (process.env.JACK_ADMIN_PASSWORD) return process.env.JACK_ADMIN_PASSWORD.trim();
  if (existsSync(passwordPath)) return (await readFile(passwordPath, "utf8")).trim();

  const generated = `jack-${randomBytes(3).toString("hex")}-${randomBytes(3).toString("hex")}`;
  await writeFile(passwordPath, `${generated}\n`, { mode: 0o600 });
  console.log(`Created local admin password in .admin-password: ${generated}`);
  return generated;
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || "")
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );
}

function getSession(request) {
  const token = parseCookies(request).jack_admin_session;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  session.expires = Date.now() + sessionTtlMs;
  return session;
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function parseContent(script) {
  const match = script.match(/window\.JackKleinickContent\s*=\s*([\s\S]*);\s*$/);
  if (!match) throw new Error("content/works.js is not in the expected format");
  return JSON.parse(match[1]);
}

async function readWorksData() {
  return parseContent(await readFile(contentPath, "utf8"));
}

function cleanString(value) {
  return String(value || "").trim();
}

function cleanTrack(track) {
  return {
    title: cleanString(track?.title),
    url: cleanString(track?.url),
  };
}

function cleanWork(work) {
  const tracks = Array.isArray(work?.tracks) ? work.tracks.map(cleanTrack).filter((track) => track.title) : [];
  return {
    album: cleanString(work?.album) || "Untitled",
    artist: cleanString(work?.artist),
    year: cleanString(work?.year),
    role: cleanString(work?.role),
    tracks,
    image: cleanString(work?.image) || "assets/studio-hero.jpg",
    colors: {
      dark: cleanString(work?.colors?.dark) || "#6d4227",
      pastel: cleanString(work?.colors?.pastel) || "#c69a76",
    },
  };
}

async function writeWorksData(works) {
  const cleaned = Array.isArray(works) ? works.map(cleanWork) : [];
  const payload = {
    updatedAt: new Date().toISOString(),
    works: cleaned,
  };
  const script = `// Managed content for the Jack Kleinick site. Edit through the admin backend when possible.\nwindow.JackKleinickContent = ${JSON.stringify(payload, null, 2)};\n`;
  await writeFile(contentPath, script);
  return payload;
}

function decodeEntities(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getMeta(html) {
  const meta = {};
  for (const match of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const tag = match[0];
    const key = tag.match(/\s(?:property|name)=["']([^"']+)["']/i)?.[1];
    const content = tag.match(/\scontent=["']([^"']*)["']/i)?.[1];
    if (key && typeof content === "string") meta[key] = decodeEntities(content);
  }
  return meta;
}

function slugify(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "spotify-cover";
}

async function uniqueAssetPath(slug, extension) {
  await mkdir(assetRoot, { recursive: true });
  let fileName = `${slug}${extension}`;
  let filePath = join(assetRoot, fileName);
  let count = 2;
  while (existsSync(filePath)) {
    fileName = `${slug}-${count}${extension}`;
    filePath = join(assetRoot, fileName);
    count += 1;
  }
  return { fileName, filePath };
}

async function saveCover(imageUrl, slug) {
  if (!imageUrl) return "assets/studio-hero.jpg";
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error(`Cover download failed: ${imageResponse.status}`);
  const contentType = imageResponse.headers.get("content-type") || "";
  const extension = contentType.includes("png") ? ".png" : ".jpg";
  const { fileName, filePath } = await uniqueAssetPath(slug, extension);
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  await writeFile(filePath, buffer);
  return `assets/covers/${fileName}`;
}

function normalizeExternalUrl(value) {
  const url = new URL(cleanString(value));
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Use a full Spotify URL");
  url.search = "";
  url.hash = "";
  return url.href;
}

async function importSpotifyProject(rawUrl) {
  const spotifyUrl = normalizeExternalUrl(rawUrl);
  const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`;
  const oembedResponse = await fetch(oembedUrl);
  if (!oembedResponse.ok) throw new Error(`Spotify lookup failed: ${oembedResponse.status}`);
  const oembed = await oembedResponse.json();

  let meta = {};
  try {
    const pageResponse = await fetch(spotifyUrl);
    if (pageResponse.ok) meta = getMeta(await pageResponse.text());
  } catch {
    meta = {};
  }

  const description = meta["og:description"] || "";
  const descriptionParts = description.split("·").map((part) => part.trim()).filter(Boolean);
  const artist = meta.music_musician_description || meta["music:musician_description"] || descriptionParts[0] || "";
  const year = descriptionParts.find((part) => /^(19|20)\d{2}$/.test(part)) || "";
  const album = meta["og:title"] || oembed.title || "Untitled";
  const imageUrl = oembed.thumbnail_url || meta["og:image"] || "";
  const image = await saveCover(imageUrl, slugify(`${artist}-${album}`));

  return {
    project: {
      album,
      artist,
      year,
      role: "",
      tracks: [{ title: album, url: spotifyUrl }],
      image,
      colors: {
        dark: "#6d4227",
        pastel: "#c69a76",
      },
    },
    source: {
      title: oembed.title || album,
      description,
      thumbnailUrl: imageUrl,
      provider: oembed.provider_name || "Spotify",
    },
  };
}

function run(command, args) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { cwd: root, shell: false });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("close", (code) => {
      resolvePromise({ code, output: output.trim() });
    });
  });
}

async function publishChanges() {
  const status = await run("git", ["status", "--porcelain"]);
  if (status.code !== 0) throw new Error(status.output || "Unable to read git status");
  if (!status.output) return "Nothing to publish.";

  const add = await run("git", ["add", "content/works.js", "assets/covers"]);
  if (add.code !== 0) throw new Error(add.output || "Unable to stage content changes");

  const commit = await run("git", ["commit", "-m", "Update works content"]);
  if (commit.code !== 0 && !commit.output.includes("nothing to commit")) {
    throw new Error(commit.output || "Unable to commit content changes");
  }

  const push = await run("git", ["push", "origin", "HEAD:main"]);
  if (push.code !== 0) throw new Error(push.output || "Unable to push content changes");

  return [commit.output, push.output].filter(Boolean).join("\n\n");
}

function staticPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const route = decoded === "/" ? "/index.html" : decoded === "/admin" || decoded === "/admin/" ? "/admin/index.html" : decoded;
  const file = normalize(resolve(root, `.${route}`));
  if (file !== root && !file.startsWith(`${root}${sep}`)) return null;
  if (existsSync(file) && statSync(file).isDirectory()) return join(file, "index.html");
  return file;
}

async function serveStatic(request, response, pathname) {
  const file = staticPath(pathname);
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    textResponse(response, 404, "Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": types[extname(file)] || "application/octet-stream",
    "cache-control": "no-store",
  });
  response.end(await readFile(file));
}

async function handleApi(request, response, pathname) {
  if (pathname === "/api/login" && request.method === "POST") {
    const { password } = await readJson(request);
    const expectedPassword = await getPassword();
    if (!safeCompare(password || "", expectedPassword)) {
      jsonResponse(response, 401, { error: "Incorrect password" });
      return;
    }

    const token = randomBytes(32).toString("hex");
    sessions.set(token, { expires: Date.now() + sessionTtlMs });
    jsonResponse(response, 200, { ok: true }, {
      "set-cookie": `jack_admin_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionTtlMs / 1000}`,
    });
    return;
  }

  if (pathname === "/api/session") {
    jsonResponse(response, 200, { ok: Boolean(getSession(request)) });
    return;
  }

  const session = getSession(request);
  if (!session) {
    jsonResponse(response, 401, { error: "Please log in again" });
    return;
  }

  if (pathname === "/api/works" && request.method === "GET") {
    jsonResponse(response, 200, await readWorksData());
    return;
  }

  if (pathname === "/api/works" && request.method === "PUT") {
    const { works } = await readJson(request);
    jsonResponse(response, 200, await writeWorksData(works));
    return;
  }

  if (pathname === "/api/spotify/import" && request.method === "POST") {
    const { url } = await readJson(request);
    jsonResponse(response, 200, await importSpotifyProject(url));
    return;
  }

  if (pathname === "/api/publish" && request.method === "POST") {
    jsonResponse(response, 200, { output: await publishChanges() });
    return;
  }

  textResponse(response, 404, `No API route for ${basename(pathname)}`);
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url.pathname);
      return;
    }

    await serveStatic(request, response, url.pathname);
  } catch (error) {
    jsonResponse(response, 500, { error: error.message || "Server error" });
  }
}).listen(port, async () => {
  await getPassword();
  console.log(`Jack Kleinick admin running at http://127.0.0.1:${port}/admin/`);
});
