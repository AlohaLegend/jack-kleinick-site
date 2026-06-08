const DEFAULT_ALLOWED_ORIGINS =
  "https://jackkleinick.com,https://www.jackkleinick.com,https://alohalegend.github.io,http://localhost:4173,http://127.0.0.1:4173,http://127.0.0.1:4184";
const DEFAULT_CONTENT_URL = "https://jackkleinick.com/content/works.json";
const CONTENT_KEY = "works.json";
const SESSION_COOKIE = "jack_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const ASSET_KEY_PREFIX = "asset:";
const ASSET_ROUTE_PREFIX = "/assets/uploads/";
const MAX_ASSET_BYTES = 8 * 1024 * 1024;
const ALLOWED_ASSET_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const textEncoder = new TextEncoder();

const base64UrlEncode = (value) => {
  const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : textEncoder.encode(String(value));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
};

const base64UrlDecode = (value) => {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
};

const allowedOrigins = (env) =>
  String(env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigin = (request, env) => {
  const origin = request.headers.get("Origin");
  if (!origin) return "*";
  return allowedOrigins(env).includes(origin) ? origin : "";
};

const isAllowedOrigin = (request, env) => {
  const origin = request.headers.get("Origin");
  return !origin || allowedOrigins(env).includes(origin);
};

const corsHeaders = (request, env) => {
  const origin = allowedOrigin(request, env);

  return {
    "Access-Control-Allow-Origin": origin || "null",
    "Access-Control-Allow-Credentials": origin === "*" ? "false" : "true",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    Vary: "Origin",
  };
};

const jsonResponse = (request, body, init = {}) =>
  new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(request, init.env || {}),
      ...(init.headers || {}),
    },
  });

const publicJsonResponse = (body) =>
  new Response(JSON.stringify(body), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": "false",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "Content-Type": "application/json; charset=utf-8",
      Expires: "0",
      Pragma: "no-cache",
    },
  });

const publicAssetHeaders = (metadata = {}, initHeaders = {}) => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "false",
  "Accept-Ranges": "bytes",
  "Cache-Control": "public, max-age=31536000, immutable",
  "Content-Disposition": `inline; filename="${String(metadata.originalName || "jack-cover").replaceAll('"', "")}"`,
  "Content-Type": metadata.contentType || "application/octet-stream",
  ...initHeaders,
});

const readJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const hmacKey = async (secret) =>
  crypto.subtle.importKey("raw", textEncoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);

const signPayload = async (payload, secret) => {
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), textEncoder.encode(payload));
  return base64UrlEncode(signature);
};

const createSessionValue = async (env) => {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = base64UrlEncode(JSON.stringify({ expiresAt, nonce: crypto.randomUUID() }));
  const signature = await signPayload(payload, env.SESSION_SECRET);
  return `${payload}.${signature}`;
};

const verifySession = async (request, env) => {
  if (!env.SESSION_SECRET) return false;

  const authorization = request.headers.get("Authorization") || "";
  const bearerSession = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  const cookie = request.headers.get("Cookie") || "";
  const [, cookieSession] = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`)) || [];
  const sessionValue = bearerSession || cookieSession;

  if (!sessionValue) return false;

  const [payload, signature] = sessionValue.split(".");
  if (!payload || !signature) return false;

  const expectedSignature = await signPayload(payload, env.SESSION_SECRET);
  if (signature !== expectedSignature) return false;

  try {
    const { expiresAt } = JSON.parse(base64UrlDecode(payload));
    return typeof expiresAt === "number" && expiresAt > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
};

const sessionCookie = (sessionValue) =>
  `${SESSION_COOKIE}=${sessionValue}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;

const clearSessionCookie = () =>
  `${SESSION_COOKIE}=deleted; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

const requireSession = async (request, env) => {
  if (await verifySession(request, env)) return null;
  return jsonResponse(request, { error: "Please log in again." }, { status: 401, env });
};

const cleanString = (value, fallback = "", maxLength = 500) => {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.slice(0, maxLength) || fallback;
};

const cleanLongString = (value, fallback = "", maxLength = 1400) => {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/\r\n/g, "\n");
  return cleaned.slice(0, maxLength) || fallback;
};

const cleanUrl = (value, fallback = "") => {
  if (typeof value !== "string") return fallback;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
};

const cleanAsset = (value, fallback = "assets/studio-hero.jpg") => {
  const cleaned = cleanString(value, fallback, 360);
  if (/^https?:\/\//i.test(cleaned)) return cleanUrl(cleaned, fallback);
  if (/^\/?assets\/[a-z0-9._/-]+\.(?:jpg|jpeg|png|webp|gif)$/i.test(cleaned)) return cleaned.replace(/^\/+/, "");
  return fallback;
};

const cleanHex = (value, fallback) => (/^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback);

const cleanTrack = (track = {}) => ({
  title: cleanString(track.title, "Untitled", 160),
  url: cleanUrl(track.url, ""),
});

const cleanWork = (work = {}) => ({
  album: cleanString(work.album, "Untitled", 180),
  artist: cleanString(work.artist, "", 140),
  year: cleanString(work.year, "", 120),
  role: cleanLongString(work.role, "", 1800),
  tracks: Array.isArray(work.tracks) ? work.tracks.map(cleanTrack).filter((track) => track.title) : [],
  image: cleanAsset(work.image),
  colors: {
    dark: cleanHex(work.colors?.dark, "#6d4227"),
    pastel: cleanHex(work.colors?.pastel, "#c69a76"),
  },
});

const normalizeContent = (content = {}) => ({
  updatedAt: cleanString(content.updatedAt, new Date().toISOString(), 40),
  works: Array.isArray(content.works) ? content.works.map(cleanWork) : [],
});

const readFallbackContent = async (env) => {
  try {
    const response = await fetch(env.FALLBACK_CONTENT_URL || DEFAULT_CONTENT_URL, {
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (response.ok) return normalizeContent(await response.json());
  } catch {
    return { updatedAt: new Date().toISOString(), works: [] };
  }

  return { updatedAt: new Date().toISOString(), works: [] };
};

const readContent = async (env) => {
  const stored = await env.JACK_CMS_CONTENT?.get(CONTENT_KEY);
  if (stored) {
    try {
      return normalizeContent(JSON.parse(stored));
    } catch {
      return readFallbackContent(env);
    }
  }

  return readFallbackContent(env);
};

const writeContent = async (env, content) => {
  if (!env.JACK_CMS_CONTENT) throw new Error("Content storage is not configured.");
  const normalized = normalizeContent({ ...content, updatedAt: new Date().toISOString() });
  await env.JACK_CMS_CONTENT.put(CONTENT_KEY, JSON.stringify(normalized, null, 2), {
    metadata: { updatedAt: normalized.updatedAt },
  });
  return normalized;
};

const decodeEntities = (value = "") =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

const getMeta = (html) => {
  const meta = {};
  for (const match of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const tag = match[0];
    const key = tag.match(/\s(?:property|name)=["']([^"']+)["']/i)?.[1];
    const content = tag.match(/\scontent=["']([^"']*)["']/i)?.[1];
    if (key && typeof content === "string") meta[key] = decodeEntities(content);
  }
  return meta;
};

const slugify = (value) => {
  const slug = cleanString(value, "jack-cover", 100)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return slug || "jack-cover";
};

const normalizeExternalUrl = (value) => {
  const url = new URL(cleanString(value));
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Use a full Spotify URL.");
  url.search = "";
  url.hash = "";
  return url.href;
};

const saveRemoteAsset = async (request, env, imageUrl, slug) => {
  if (!imageUrl) return "assets/studio-hero.jpg";
  if (!env.JACK_CMS_CONTENT) throw new Error("Asset storage is not configured.");

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error(`Cover download failed: ${imageResponse.status}`);

  const contentType = (imageResponse.headers.get("content-type") || "").split(";")[0].toLowerCase();
  const extension = ALLOWED_ASSET_TYPES[contentType] || "jpg";
  const buffer = await imageResponse.arrayBuffer();
  if (!buffer.byteLength || buffer.byteLength > MAX_ASSET_BYTES) throw new Error("Cover art was too large to save.");

  const originalName = `${slug}.${extension}`;
  const filename = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}-${slug}.${extension}`;

  await env.JACK_CMS_CONTENT.put(`${ASSET_KEY_PREFIX}${filename}`, buffer, {
    metadata: {
      byteLength: buffer.byteLength,
      contentType: contentType || "image/jpeg",
      originalName,
      uploadedAt: new Date().toISOString(),
    },
  });

  return `${new URL(request.url).origin}${ASSET_ROUTE_PREFIX}${filename}`;
};

const importSpotifyProject = async (request, env) => {
  const sessionError = await requireSession(request, env);
  if (sessionError) return sessionError;

  const body = await readJson(request);
  const spotifyUrl = normalizeExternalUrl(body?.url);
  const oembedResponse = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`);
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
  const album = meta["og:title"] || oembed.title || "Untitled";
  const artist = meta["music:musician_description"] || descriptionParts[0] || "";
  const year = descriptionParts.find((part) => /^(19|20)\d{2}$/.test(part)) || "";
  const thumbnailUrl = oembed.thumbnail_url || meta["og:image"] || "";
  const image = await saveRemoteAsset(request, env, thumbnailUrl, slugify(`${artist}-${album}`));

  return jsonResponse(
    request,
    {
      project: {
        album,
        artist,
        year,
        role: "",
        tracks: [{ title: album, url: spotifyUrl }],
        image,
        colors: { dark: "#6d4227", pastel: "#c69a76" },
      },
      source: {
        title: oembed.title || album,
        description,
        thumbnailUrl,
        provider: oembed.provider_name || "Spotify",
      },
    },
    { env },
  );
};

const handleLogin = async (request, env) => {
  const body = await readJson(request);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return jsonResponse(request, { error: "Admin password is not configured." }, { status: 500, env });
  }

  if (password !== env.ADMIN_PASSWORD) {
    return jsonResponse(request, { error: "That password did not work." }, { status: 401, env });
  }

  const sessionValue = await createSessionValue(env);
  return jsonResponse(
    request,
    { authenticated: true, session: sessionValue },
    { env, headers: { "Set-Cookie": sessionCookie(sessionValue) } },
  );
};

const handleWorksUpdate = async (request, env) => {
  const sessionError = await requireSession(request, env);
  if (sessionError) return sessionError;

  const body = await readJson(request);
  const content = await writeContent(env, { works: body?.works || body?.content?.works || [] });
  return jsonResponse(request, content, { env });
};

const handleAdminWorks = async (request, env) => {
  const sessionError = await requireSession(request, env);
  if (sessionError) return sessionError;
  return jsonResponse(request, await readContent(env), { env });
};

const handlePublicAsset = async (request, env, filename) => {
  if (!env.JACK_CMS_CONTENT) return new Response("Asset storage is not configured.", { status: 500 });
  if (!/^[a-z0-9][a-z0-9.-]{1,180}\.(?:jpg|png|webp|gif)$/i.test(filename)) {
    return new Response("Not found.", { status: 404 });
  }

  const { value, metadata } = await env.JACK_CMS_CONTENT.getWithMetadata(`${ASSET_KEY_PREFIX}${filename}`, {
    type: "arrayBuffer",
  });

  if (!value) return new Response("Not found.", { status: 404 });

  return new Response(value, {
    headers: publicAssetHeaders(metadata, { "Content-Length": String(value.byteLength) }),
  });
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method === "GET" && pathname === "/content/works.json") {
      return publicJsonResponse(await readContent(env));
    }

    if (request.method === "GET" && pathname.startsWith(ASSET_ROUTE_PREFIX)) {
      return handlePublicAsset(request, env, pathname.slice(ASSET_ROUTE_PREFIX.length));
    }

    if (!isAllowedOrigin(request, env)) {
      return jsonResponse(request, { error: "Origin not allowed." }, { status: 403, env });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (request.method === "GET" && pathname === "/health") {
      return jsonResponse(request, { ok: true }, { env });
    }

    if (request.method === "GET" && pathname === "/api/session") {
      return jsonResponse(request, { authenticated: await verifySession(request, env) }, { env });
    }

    if (request.method === "POST" && pathname === "/api/login") {
      return handleLogin(request, env);
    }

    if (request.method === "POST" && pathname === "/api/logout") {
      return jsonResponse(request, { authenticated: false }, { env, headers: { "Set-Cookie": clearSessionCookie() } });
    }

    if (request.method === "GET" && (pathname === "/api/works" || pathname === "/api/content")) {
      return handleAdminWorks(request, env);
    }

    if (request.method === "PUT" && (pathname === "/api/works" || pathname === "/api/content")) {
      return handleWorksUpdate(request, env);
    }

    if (request.method === "POST" && pathname === "/api/spotify/import") {
      return importSpotifyProject(request, env);
    }

    return jsonResponse(request, { error: "Not found." }, { status: 404, env });
  },
};
