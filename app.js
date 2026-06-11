const CONTENT_API_BASE = "https://jack-kleinick-cms-auth.bammediaauth.workers.dev";
const ANALYTICS_HOSTS = new Set(["jackkleinick.com", "www.jackkleinick.com"]);
const ANALYTICS_VISITOR_KEY = "jackAnalyticsVisitor";
const fallbackContent = window.JackKleinickContent || { works: [] };
let projects = [];
const grid = document.querySelector("#work-grid");
const stage = document.querySelector("#gravity-stage");
const stageFocus = document.querySelector("#stage-focus");
const stageTarget = document.querySelector(".stage-target");
const focusTitle = document.querySelector("#focus-title");
const focusMeta = document.querySelector("#focus-meta");
const focusRole = document.querySelector("#focus-role");
const focusTracks = document.querySelector("#focus-tracks");
const focusPlatforms = document.querySelector("#focus-platforms");
const focusOpen = document.querySelector("#focus-open");
const motionEnable = document.querySelector("#motion-enable");
const workView = document.querySelector("#work-view");
const infoView = document.querySelector("#info-view");
const modal = document.querySelector("#project-modal");
const modalImage = document.querySelector("#modal-image");
const modalTitle = document.querySelector("#modal-title");
const modalYear = document.querySelector("#modal-year");
const modalRole = document.querySelector("#modal-role");
const modalTracks = document.querySelector("#modal-tracks");
const modalPlatforms = document.querySelector("#modal-platforms");
const prevButton = document.querySelector("#prev-project");
const nextButton = document.querySelector("#next-project");
const entryScreen = document.querySelector("#entry-screen");

let activeProject = 0;
let focusedProject = 0;
let displayedProject = 0;
let lastFrame = 0;
let introReleaseTimer;
let sensorPermissionAsked = false;
let sensorsActive = false;
let lastShakeAt = 0;
let lastMotionMagnitude = 0;
let modalSwipe = null;
let lastWheelNavAt = 0;
let lastCoverTap = { index: -1, time: 0 };
let lastAnalyticsEvent = { path: "", time: 0 };
let liteMode = false;
let lastFpsSample = 0;
const fpsSamples = [];
const bodies = [];
const deviceGravity = { x: 0, y: 0 };
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
function viewportBounds() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    windowWidth: window.innerWidth,
  };
}

function focusTargetPosition(size = 0) {
  if (!stageTarget) {
    const bounds = viewportBounds();
    return {
      x: bounds.width * 0.5 - size * 0.5,
      y: bounds.height * 0.52 - size * 0.5,
      radius: Math.max(118, bounds.width * 0.12),
    };
  }

  const target = stageTarget.getBoundingClientRect();
  return {
    x: target.left + target.width * 0.5 - size * 0.5,
    y: target.top + target.height * 0.5 - size * 0.5,
    radius: Math.max(96, target.width * 0.58),
  };
}

function recordObstacle() {
  if (!stageTarget) return null;
  const target = stageTarget.getBoundingClientRect();
  return {
    x: target.left + target.width * 0.5,
    y: target.top + target.height * 0.5,
    radius: target.width * 0.5,
  };
}

function panelObstacle() {
  if (!stageFocus) return null;
  const panel = stageFocus.getBoundingClientRect();
  const padding = 8;
  return {
    left: panel.left - padding,
    right: panel.right + padding,
    top: panel.top - padding,
    bottom: panel.bottom + padding,
  };
}

function headerObstacle() {
  if (window.innerWidth > 560) return null;
  const header = document.querySelector(".site-header")?.getBoundingClientRect();
  if (!header?.height) return null;
  const padding = 8;
  return {
    left: header.left - padding,
    right: header.right + padding,
    top: header.top - padding,
    bottom: header.bottom + padding,
  };
}

function edgeBleed() {
  return 0;
}

function topPlayEdge() {
  if (window.innerWidth > 560) return 0;
  const header = document.querySelector(".site-header")?.getBoundingClientRect();
  return header?.height ? header.bottom + 8 : 0;
}

function storedLitePreference() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("lite") === "1") return true;
    if (params.get("lite") === "0") {
      window.localStorage.setItem("jackLiteMode", "0");
      return false;
    }
    if (params.get("lite") === "save") {
      window.localStorage.setItem("jackLiteMode", "1");
      return true;
    }
    return window.localStorage.getItem("jackLiteMode") === "1";
  } catch {
    return false;
  }
}

function enableLiteMode(reason = "adaptive") {
  if (liteMode) return;
  liteMode = true;
  document.body.classList.add("is-lite-mode");
  document.body.dataset.liteReason = reason;
  fpsSamples.length = 0;
  bodies.forEach((body) => {
    body.vx *= 0.35;
    body.vy *= 0.35;
    body.rotation *= 0.6;
  });
}

function prefersLiteMode() {
  return liteMode || reduceMotionQuery.matches;
}

function sampleFrameRate(timestamp) {
  if (liteMode || document.hidden || !workView.classList.contains("is-active") || modal.classList.contains("is-open")) {
    lastFpsSample = timestamp;
    return;
  }

  if (lastFpsSample) {
    const frameMs = timestamp - lastFpsSample;
    if (frameMs > 0 && frameMs < 250) {
      fpsSamples.push(1000 / frameMs);
      if (fpsSamples.length > 90) fpsSamples.shift();
      if (fpsSamples.length === 90) {
        const averageFps = fpsSamples.reduce((sum, fps) => sum + fps, 0) / fpsSamples.length;
        if (averageFps < 42) enableLiteMode("low-fps");
      }
    }
  }

  lastFpsSample = timestamp;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function bodyScale(body) {
  if (body.index !== focusedProject) return 1;
  if (prefersLiteMode()) return body.pinned ? 1.16 : 1.08;
  return body.pinned ? 1.28 : 1.16;
}

function stageFloor(bounds) {
  return bounds.height;
}

function tossCovers(force = 1) {
  bodies.forEach((body, index) => {
    if (body.dragging || body.pinned) return;

    const adjustedForce = prefersLiteMode() ? force * 0.35 : force;
    const phase = performance.now() * 0.003 + index * 1.91;
    body.vx += Math.cos(phase) * 0.72 * adjustedForce;
    body.vy += Math.sin(phase * 1.23) * 0.55 * adjustedForce;
    body.rotation += Math.sin(phase) * 5.5 * adjustedForce;
  });
}

function handleDeviceOrientation(event) {
  if (typeof event.gamma === "number") {
    const targetX = clamp(event.gamma / 34, -1, 1);
    deviceGravity.x += (targetX - deviceGravity.x) * 0.08;
  }
}

function handleDeviceMotion(event) {
  const source = event.accelerationIncludingGravity || event.acceleration;
  if (!source) return;

  const x = source.x || 0;
  const y = source.y || 0;
  const z = source.z || 0;
  const magnitude = Math.hypot(x, y, z);
  const delta = Math.abs(magnitude - lastMotionMagnitude);
  lastMotionMagnitude = magnitude;

  const now = performance.now();
  if (delta < 8.5 || now - lastShakeAt < 650) return;

  lastShakeAt = now;
  tossCovers(clamp(delta / 11, 0.8, 1.8));
}

async function enableDeviceSensors() {
  if (sensorsActive) return true;
  if (sensorPermissionAsked) return false;
  sensorPermissionAsked = true;

  try {
    const permissionRequests = [];
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      permissionRequests.push(DeviceOrientationEvent.requestPermission());
    }

    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
      permissionRequests.push(DeviceMotionEvent.requestPermission());
    }

    const states = await Promise.all(permissionRequests);
    if (states.some((state) => state !== "granted")) {
      sensorPermissionAsked = false;
      return false;
    }
  } catch {
    sensorPermissionAsked = false;
    return false;
  }

  window.addEventListener("deviceorientation", handleDeviceOrientation);
  window.addEventListener("devicemotion", handleDeviceMotion);
  sensorsActive = true;
  document.body.classList.add("motion-enabled");
  motionEnable?.setAttribute("hidden", "");
  tossCovers(0.35);
  return true;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

function safeExternalUrl(value = "") {
  const fallback = "https://open.spotify.com/playlist/0vlibWutg819Jhq4i6lZmp";
  try {
    const url = new URL(String(value), window.location.href);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {
    return fallback;
  }
  return fallback;
}

function analyticsEnabled() {
  return ANALYTICS_HOSTS.has(window.location.hostname);
}

function analyticsVisitorId() {
  try {
    const existing = window.localStorage.getItem(ANALYTICS_VISITOR_KEY);
    if (existing) return existing;
    const created =
      window.crypto?.randomUUID?.() ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(ANALYTICS_VISITOR_KEY, created);
    return created;
  } catch {
    return "";
  }
}

function analyticsDevice() {
  if (window.matchMedia("(max-width: 560px)").matches) return "Phone";
  if (window.matchMedia("(max-width: 1024px)").matches) return "Tablet";
  return "Desktop";
}

function analyticsPath(value = "") {
  const cleaned = String(value || window.location.pathname || "/").trim();
  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
}

function projectSlug(project = {}) {
  return (
    String(project.album || "work")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "work"
  );
}

function trackPageView(path) {
  if (!analyticsEnabled()) return;

  const nextPath = analyticsPath(path);
  const now = performance.now();
  if (lastAnalyticsEvent.path === nextPath && now - lastAnalyticsEvent.time < 5000) return;
  lastAnalyticsEvent = { path: nextPath, time: now };

  const payload = {
    path: nextPath,
    referrer: document.referrer,
    title: document.title,
    visitorId: analyticsVisitorId(),
    device: analyticsDevice(),
    language: navigator.language || "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    screen: `${window.screen?.width || window.innerWidth}x${window.screen?.height || window.innerHeight}`,
  };
  const body = JSON.stringify(payload);
  const url = `${CONTENT_API_BASE}/analytics/collect`;

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch {
    // Fall through to fetch.
  }

  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

function projectMood(index) {
  const colors = projects[index]?.colors || {};
  return [colors.dark || colors.primary || "#6d4227", colors.pastel || colors.accent || "#c69a76"];
}

function applyAlbumMood(index) {
  const mood = projectMood(index);
  const image = projects[index]?.image || "assets/studio-hero.jpg";
  document.body.style.setProperty("--album-a", mood[0]);
  document.body.style.setProperty("--album-b", mood[1]);
  document.body.style.setProperty("--page-tint", mood[1]);
  document.body.style.setProperty("--record-art", `url("${image}")`);
}

function randomProjectIndex() {
  return projects.length ? Math.floor(Math.random() * projects.length) : 0;
}

function platformSearchQuery(project, trackTitle = "") {
  return encodeURIComponent(`${project.artist || ""} ${trackTitle || project.album || ""}`.trim());
}

function platformIcon(name) {
  const icons = {
    spotify: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M7.4 9.5c3.5-1 6.7-.7 9.8.9"></path><path d="M8.1 12.2c2.6-.7 5.2-.5 7.5.7"></path><path d="M8.8 14.7c1.9-.5 3.8-.4 5.6.5"></path></svg>`,
    apple: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.8 4.2v10.4a3 3 0 1 1-1.7-2.7V7.1l-6.5 1.4v7.2a3 3 0 1 1-1.7-2.7V7.2z"></path></svg>`,
    youtube: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 8.5v7l6-3.5z"></path><rect x="3" y="6" width="18" height="12" rx="4"></rect></svg>`,
    google: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 10.8h7.1c.1.5.2.9.2 1.5 0 4.2-2.8 7.2-7.1 7.2A7.5 7.5 0 1 1 17.6 6"></path></svg>`,
  };
  return icons[name];
}

function renderPlatformLinks(project) {
  const tracks = Array.isArray(project.tracks) ? project.tracks : [];
  const firstTrack = tracks.find((track) => typeof track !== "string" && track.url);
  const firstTitle = firstTrack?.title || project.album;
  const query = platformSearchQuery(project, firstTitle);
  const spotifyHref = safeExternalUrl(firstTrack?.url);
  const platforms = [
    ["spotify", "Spotify", spotifyHref],
    ["apple", "Apple Music", `https://music.apple.com/us/search?term=${query}`],
    ["youtube", "YouTube Music", `https://music.youtube.com/search?q=${query}`],
    ["google", "Google", `https://www.google.com/search?q=${query}`],
  ];

  return platforms
    .map(
      ([name, label, href]) => `
        <a class="platform-icon ${escapeAttr(name)}" href="${escapeAttr(href)}" target="_blank" rel="noreferrer" aria-label="${escapeAttr(label)}">
          ${platformIcon(name)}
        </a>
      `,
    )
    .join("");
}

function renderGrid() {
  if (!projects.length) {
    grid.innerHTML = "";
    entryScreen?.classList.add("is-complete");
    return;
  }

  grid.innerHTML = projects
    .map(
      (project, index) => `
        <button class="cover-token" type="button" data-token="${index}" aria-label="Focus ${escapeAttr(project.album)} by ${escapeAttr(project.artist)}">
          <img src="${escapeAttr(project.image)}" alt="${escapeAttr(project.album)} cover" loading="lazy" decoding="async">
          <span><strong>${escapeHtml(project.album)}</strong><small>${escapeHtml(project.artist)}</small></span>
        </button>
      `,
    )
    .join("");

  setupBodies();
  const manualLite = storedLitePreference();
  if (manualLite || reduceMotionQuery.matches) {
    enableLiteMode(manualLite ? "manual" : "reduced-motion");
  }
  startIntroSelection();
  window.requestAnimationFrame(updateStage);
}

function startIntroSelection() {
  const index = randomProjectIndex();
  focusProject(index, { snap: true, intro: true });
  if (prefersLiteMode()) {
    releaseFocusedProject();
    return;
  }

  introReleaseTimer = window.setTimeout(() => {
    releaseFocusedProject({ toss: true });
  }, 3600);
}

function setupBodies() {
  const bounds = viewportBounds();
  const tokens = [...grid.querySelectorAll(".cover-token")];
  bodies.length = 0;

  tokens.forEach((token, index) => {
    const size = token.offsetWidth || 116;
    const lane = index % 5;
    const bleed = edgeBleed(size);
    const spread = Math.max(1, bounds.width - size + bleed * 2);
    bodies.push({
      token,
      index,
      x: -bleed + ((index * 173 + lane * 41) % spread),
      y: -bleed + ((index * 211 + lane * 83) % Math.max(120, bounds.height - size + bleed * 2)),
      vx: ((index % 7) - 3) * 0.052,
      vy: ((index % 5) - 2) * 0.038,
      drift: index * 1.73,
      rotation: (index % 2 === 0 ? -1 : 1) * (2 + (index % 5)),
      dragging: false,
      pinned: false,
      pointerId: null,
      offsetX: 0,
      offsetY: 0,
      lastX: 0,
      lastY: 0,
      lastMove: 0,
      startX: 0,
      startY: 0,
      lastTapMovement: Infinity,
      dragVx: 0,
      dragVy: 0,
    });

    token.addEventListener("pointerdown", (event) => beginDrag(event, index));
    token.addEventListener("pointermove", (event) => dragToken(event, index));
    token.addEventListener("pointerup", (event) => endDrag(event, index));
    token.addEventListener("pointercancel", (event) => endDrag(event, index));
    token.addEventListener("click", (event) => handleCoverClick(event, index));
    token.addEventListener("dblclick", () => openProject(index));
  });
}

function stagePoint(event) {
  return {
    x: event.clientX,
    y: event.clientY,
  };
}

function beginDrag(event, index) {
  const body = bodies[index];
  const point = stagePoint(event);
  const now = performance.now();
  const isMobileTap = window.matchMedia("(max-width: 560px)").matches;
  if (isMobileTap && lastCoverTap.index === index && now - lastCoverTap.time < 420) {
    lastCoverTap = { index: -1, time: 0 };
    openProject(index);
    event.preventDefault();
    return;
  }

  if (isMobileTap) {
    lastCoverTap = { index, time: now };
  }

  body.dragging = true;
  body.pinned = false;
  window.clearTimeout(introReleaseTimer);
  body.pointerId = event.pointerId;
  body.offsetX = point.x - body.x;
  body.offsetY = point.y - body.y;
  body.lastX = point.x;
  body.lastY = point.y;
  body.lastMove = performance.now();
  body.startX = point.x;
  body.startY = point.y;
  body.dragVx = body.vx;
  body.dragVy = body.vy;
  body.token.setPointerCapture(event.pointerId);
  body.dragClone = body.token.cloneNode(true);
  body.dragClone.classList.add("drag-proxy");
  document.body.appendChild(body.dragClone);
  body.token.classList.add("is-drag-source");
  event.preventDefault();
}

function dragToken(event, index) {
  const body = bodies[index];
  if (!body.dragging || body.pointerId !== event.pointerId) return;

  const point = stagePoint(event);
  const now = performance.now();
  const elapsed = Math.max(16, now - body.lastMove);
  body.x = point.x - body.offsetX;
  body.y = point.y - body.offsetY;
  const rawVx = ((point.x - body.lastX) / elapsed) * 16;
  const rawVy = ((point.y - body.lastY) / elapsed) * 16;
  body.dragVx += (rawVx - body.dragVx) * 0.28;
  body.dragVy += (rawVy - body.dragVy) * 0.28;
  body.vx = body.dragVx;
  body.vy = body.dragVy;

  const speed = Math.hypot(body.dragVx, body.dragVy);
  const tiltSource = Math.abs(body.dragVx) < 0.018 && speed < 0.045 ? 0 : body.dragVx;
  const targetRotation = Math.max(-7.5, Math.min(7.5, tiltSource * 1.85));
  body.rotation += (targetRotation - body.rotation) * 0.18;
  resolveHeaderCollision(body, { includeDragging: true });
  body.lastX = point.x;
  body.lastY = point.y;
  body.lastMove = now;
}

function pushBodyFromDrag(dragged, target) {
  if (!dragged || !target || target.dragging || target.pinned) return;

  const draggedSize = dragged.token.offsetWidth || 116;
  const targetSize = target.token.offsetWidth || 116;
  const draggedRadius = draggedSize * 0.5;
  const targetRadius = targetSize * 0.5;
  const dragSpeed = Math.min(1.8, Math.hypot(dragged.vx, dragged.vy));
  const draggedCenterX = dragged.x + draggedRadius;
  const draggedCenterY = dragged.y + draggedRadius;
  const targetCenterX = target.x + targetRadius;
  const targetCenterY = target.y + targetRadius;
  const dx = targetCenterX - draggedCenterX;
  const dy = targetCenterY - draggedCenterY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const collisionRange = draggedRadius + targetRadius;
  const cushion = collisionRange * (1.72 + dragSpeed * 0.06);

  if (distance >= cushion) return;

  const nx = dx / distance;
  const ny = dy / distance;
  const pressure = (cushion - distance) / cushion;
  const nearContact = Math.max(0, (collisionRange - distance) / collisionRange);
  const push = pressure * pressure * 14 + nearContact * 6;

  target.x += nx * push;
  target.y += ny * push;
  target.vx += nx * (0.045 + pressure * 0.1) + dragged.vx * 0.024;
  target.vy += ny * (0.045 + pressure * 0.1) + dragged.vy * 0.024;
  target.rotation += nx * pressure * 0.42;
}

function endDrag(event, index) {
  const body = bodies[index];
  if (!body.dragging || body.pointerId !== event.pointerId) return;
  const point = stagePoint(event);
  const moved = Math.hypot(point.x - body.startX, point.y - body.startY);

  body.dragging = false;
  body.pointerId = null;
  body.token.releasePointerCapture(event.pointerId);
  body.dragClone?.remove();
  body.dragClone = null;
  body.token.classList.remove("is-drag-source");
  body.token.style.zIndex = "";
  body.introPinned = false;
  body.lastTapMovement = moved;

  const size = body.token.offsetWidth || 116;
  const target = focusTargetPosition(size);
  const distance = Math.hypot(body.x - target.x, body.y - target.y);

  if (distance < target.radius) {
    focusProject(index, { play: true });
    body.vx = body.x < target.x ? -0.38 : 0.38;
    body.vy = -0.18;
  } else {
    focusProject(index);
  }

}

function handleCoverClick(event, index) {
  if (!window.matchMedia("(max-width: 560px)").matches) return;

  const body = bodies[index];
  if (!body || body.lastTapMovement > 12) return;

  const now = performance.now();
  const isDoubleTap = lastCoverTap.index === index && now - lastCoverTap.time < 420;
  if (isDoubleTap) {
    lastCoverTap = { index: -1, time: 0 };
    openProject(index);
    event.preventDefault();
    return;
  }

  lastCoverTap = { index, time: now };
}

function releaseFocusedProject(options = {}) {
  const body = bodies[focusedProject];
  if (!body) return;

  body.pinned = false;
  body.introPinned = false;

  if (options.toss) {
    const direction = focusedProject % 2 === 0 ? 1 : -1;
    body.vx = 0.35 * direction;
    body.vy = -0.22;
    body.rotation = direction * 3.5;
  }

  body.token.classList.remove("is-focused", "is-intro-focused");
  document.body.classList.remove("is-playing");
  focusedProject = -1;
}

function focusProject(index, options = {}) {
  if (!projects[index]) return;
  focusedProject = index;
  displayedProject = index;
  const project = projects[index];
  applyAlbumMood(index);
  document.body.classList.add("is-playing");
  focusTitle.textContent = project.album;
  focusMeta.textContent = `${project.artist} / ${project.year}`;
  focusRole.textContent = project.role;
  focusTracks.innerHTML = (Array.isArray(project.tracks) ? project.tracks : [])
    .map((track) => {
      const item = typeof track === "string" ? { title: track, url: "" } : track;
      return item.url
        ? `<a href="${escapeAttr(safeExternalUrl(item.url))}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
        : `<span>${escapeHtml(item.title)}</span>`;
    })
    .join("");
  focusPlatforms.innerHTML = renderPlatformLinks(project);

  bodies.forEach((body, bodyIndex) => {
    body.token.classList.toggle("is-focused", bodyIndex === index);
    body.token.classList.toggle("is-intro-focused", bodyIndex === index && options.intro);
    if (bodyIndex !== index) body.pinned = false;
    if (bodyIndex !== index) body.introPinned = false;
  });

  if (options.snap && bodies[index]) {
    const body = bodies[index];
    const size = body.token.offsetWidth || 116;
    const target = focusTargetPosition(size);
    body.x = target.x;
    body.y = target.y;
    body.vx = 0;
    body.vy = 0;
    body.rotation = 0;
    body.pinned = true;
    body.introPinned = Boolean(options.intro);
    body.token.style.zIndex = "7";
  }
}

function clampBodyToViewport(body, bounds, floor) {
  const size = body.token.offsetWidth || 116;
  const scale = bodyScale(body);
  const scaleInset = (size * (scale - 1)) / 2;
  const bleed = edgeBleed();
  const leftEdge = -bleed + scaleInset;
  const rightEdge = bounds.width - size + bleed - scaleInset;
  const topEdge = topPlayEdge() - bleed + scaleInset;

  if (body.x < leftEdge) {
    body.x = leftEdge;
    body.vx = Math.abs(body.vx) * 0.72 + 0.035;
  }

  if (body.x > rightEdge) {
    body.x = rightEdge;
    body.vx = -Math.abs(body.vx) * 0.72 - 0.035;
  }

  if (body.y < topEdge) {
    body.y = topEdge;
    body.vy = Math.abs(body.vy) * 0.62 + 0.025;
  }

  if (!body.dragging && body.y + size + scaleInset > floor) {
    body.y = floor - size - scaleInset;
    body.vy = Math.abs(body.vy) > 0.08 ? -Math.abs(body.vy) * 0.58 : -0.07;
    body.vx *= 0.99;
    body.rotation *= 0.985;
  }
}

function applySeparation(body, axis, amount) {
  if (axis === "x") {
    body.x += amount;
    body.vx = body.vx * -0.18 + Math.sign(amount) * 0.012;
    return;
  }

  body.y += amount;
  body.vy = amount < 0 ? -Math.abs(body.vy) * 0.24 - 0.035 : Math.abs(body.vy) * 0.16;
  body.vx *= 0.94;
  body.rotation *= 0.98;
}

function keepBodyMoving(body, timestamp, delta) {
  const speed = Math.hypot(body.vx, body.vy);
  if (speed > 0.055) return;

  const driftTime = timestamp * 0.00016 + body.drift;
  body.vx += Math.sin(driftTime * 1.7) * 0.0055 * delta;
  body.vy += Math.sin(driftTime * 2.1) * 0.0046 * delta;
}

function separatePair(a, b) {
  const aSize = a.token.offsetWidth || 116;
  const bSize = b.token.offsetWidth || 116;
  const aLeft = a.x;
  const aRight = a.x + aSize;
  const aTop = a.y;
  const aBottom = a.y + aSize;
  const bLeft = b.x;
  const bRight = b.x + bSize;
  const bTop = b.y;
  const bBottom = b.y + bSize;
  const overlapX = Math.min(aRight, bRight) - Math.max(aLeft, bLeft);
  const overlapY = Math.min(aBottom, bBottom) - Math.max(aTop, bTop);

  if (overlapX <= 0 || overlapY <= 0) return;

  const axis = overlapY < overlapX * 1.2 ? "y" : "x";
  const aCenter = axis === "x" ? a.x + aSize * 0.5 : a.y + aSize * 0.5;
  const bCenter = axis === "x" ? b.x + bSize * 0.5 : b.y + bSize * 0.5;
  const direction = aCenter < bCenter ? -1 : 1;
  const overlap = axis === "x" ? overlapX : overlapY;
  const separation = overlap + 0.5;
  const aLocked = a.dragging || a.pinned;
  const bLocked = b.dragging || b.pinned;

  if (aLocked && bLocked) return;

  if (aLocked) {
    applySeparation(b, axis, -direction * separation * 0.48);
    return;
  }

  if (bLocked) {
    applySeparation(a, axis, direction * separation * 0.48);
    return;
  }

  applySeparation(a, axis, direction * separation * 0.5);
  applySeparation(b, axis, -direction * separation * 0.5);
}

function resolveCoverCollisions(bounds, floor) {
  const draggedBodies = bodies.filter((body) => body.dragging);
  draggedBodies.forEach((dragged) => {
    bodies.forEach((body) => pushBodyFromDrag(dragged, body));
  });

  const passes = prefersLiteMode() ? 1 : 3;
  for (let pass = 0; pass < passes; pass += 1) {
    for (let first = 0; first < bodies.length; first += 1) {
      for (let second = first + 1; second < bodies.length; second += 1) {
        separatePair(bodies[first], bodies[second]);
      }
    }

    bodies.forEach((body) => clampBodyToViewport(body, bounds, floor));
  }
}

function resolveRecordCollision(body) {
  if (body.dragging || body.pinned) return;
  if (window.innerWidth <= 560) return;

  const record = recordObstacle();
  if (!record) return;

  const size = body.token.offsetWidth || 116;
  const coverRadius = size * 0.5;
  const centerX = body.x + coverRadius;
  const centerY = body.y + coverRadius;
  const dx = centerX - record.x;
  const dy = centerY - record.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const minDistance = record.radius + coverRadius * 1.08;

  if (distance >= minDistance) return;

  const nx = dx / distance;
  const ny = dy / distance;
  const push = minDistance - distance + 1;
  body.x += nx * push;
  body.y += ny * push;
  body.vx = Math.max(-1.2, Math.min(1.2, body.vx * 0.24 + nx * 0.18));
  body.vy = Math.max(-1.2, Math.min(1.2, body.vy * 0.24 + ny * 0.16));
  body.rotation += nx * 0.55;
}

function resolveRectCollision(body, rect, options = {}) {
  if ((body.dragging && !options.includeDragging) || body.pinned) return;
  if (!rect) return;

  const size = body.token.offsetWidth || 116;
  const scale = bodyScale(body);
  const inset = (size * (scale - 1)) / 2;
  const left = body.x - inset;
  const right = body.x + size + inset;
  const top = body.y - inset;
  const bottom = body.y + size + inset;

  if (right <= rect.left || left >= rect.right || bottom <= rect.top || top >= rect.bottom) return;

  const maxX = window.innerWidth - size - inset;
  const maxY = window.innerHeight - size - inset;
  const pushes = [
    { axis: "x", amount: rect.left - right, next: body.x + rect.left - right },
    { axis: "x", amount: rect.right - left, next: body.x + rect.right - left },
    { axis: "y", amount: rect.top - bottom, next: body.y + rect.top - bottom },
    { axis: "y", amount: rect.bottom - top, next: body.y + rect.bottom - top },
  ]
    .map((push) => ({
      ...push,
      valid: push.axis === "x" ? push.next >= 0 && push.next <= maxX : push.next >= 0 && push.next <= maxY,
    }))
    .sort((a, b) => {
      if (a.valid !== b.valid) return a.valid ? -1 : 1;
      return Math.abs(a.amount) - Math.abs(b.amount);
    });

  const push = pushes[0];
  if (push.axis === "x") {
    body.x += push.amount;
    body.vx = push.amount < 0 ? -Math.abs(body.vx) * 0.58 - 0.05 : Math.abs(body.vx) * 0.58 + 0.05;
  } else {
    body.y += push.amount;
    body.vy = push.amount < 0 ? -Math.abs(body.vy) * 0.58 - 0.05 : Math.abs(body.vy) * 0.58 + 0.05;
  }
  body.rotation *= 0.97;
}

function resolvePanelCollision(body) {
  resolveRectCollision(body, panelObstacle());
}

function resolveHeaderCollision(body, options = {}) {
  resolveRectCollision(body, headerObstacle(), options);
}

function updateStage(timestamp) {
  if (!workView.classList.contains("is-active") || modal.classList.contains("is-open")) {
    lastFrame = timestamp;
    window.requestAnimationFrame(updateStage);
    return;
  }

  sampleFrameRate(timestamp);

  const bounds = viewportBounds();
  const delta = Math.min(2, Math.max(0.5, (timestamp - lastFrame) / 16 || 1));
  const floor = stageFloor(bounds);
  const reducedMotion = reduceMotionQuery.matches || document.hidden;
  const lite = prefersLiteMode();
  lastFrame = timestamp;

  bodies.forEach((body) => {
    if (!body.dragging && !body.pinned) {
      if (reducedMotion) {
        body.vx *= 0.82;
        body.vy *= 0.82;
        body.rotation *= 0.96;
      } else {
        const driftPower = lite ? 0.34 : 1;
        const driftTime = timestamp * 0.00016 + body.drift;
        const size = body.token.offsetWidth || 116;
        const centerX = (bounds.width - size) * 0.5;
        const floatTargetY = (bounds.height - size) * (0.18 + 0.64 * (0.5 + Math.sin(driftTime * 0.72) * 0.5));
        const lowerBand = bounds.height * 0.62;
        body.vx += Math.sin(driftTime) * 0.0029 * driftPower * delta;
        body.vx += deviceGravity.x * 0.0015 * driftPower * delta;
        body.vx += (centerX - body.x) * 0.0000022 * driftPower * delta;
        body.vy += Math.sin(driftTime * 1.35) * 0.0034 * driftPower * delta;
        body.vy += (floatTargetY - body.y) * 0.0000065 * driftPower * delta;
        if (body.y > lowerBand) {
          body.vy -= ((body.y - lowerBand) / bounds.height) * 0.010 * driftPower * delta;
        }
        if (lite) {
          const speed = Math.hypot(body.vx, body.vy);
          if (speed < 0.025) {
            body.vx += Math.sin(driftTime * 1.7) * 0.0012;
            body.vy += Math.cos(driftTime * 1.3) * 0.001;
          }
        } else {
          keepBodyMoving(body, timestamp, delta);
        }
        body.vx *= lite ? 0.982 : 0.994;
        body.vy *= lite ? 0.982 : 0.994;
      }

      body.x += body.vx * delta;
      body.y += body.vy * delta;
      body.rotation += body.vx * 0.008;

      clampBodyToViewport(body, bounds, floor);
    }
  });

  resolveCoverCollisions(bounds, floor);
  bodies.forEach((body) => {
    resolveRecordCollision(body);
    resolveHeaderCollision(body, { includeDragging: true });
    resolvePanelCollision(body);
    clampBodyToViewport(body, bounds, floor);
  });

  bodies.forEach((body, index) => {
    const scale = bodyScale(body);
    const transform = `translate3d(${body.x}px, ${body.y}px, 0) rotate(${body.rotation}deg) scale(${scale})`;
    body.token.style.transform = transform;
    body.token.style.zIndex = body.pinned ? "7" : String(3 + (index % 3));
    if (body.dragClone) {
      body.dragClone.style.transform = transform;
    }
  });

  window.requestAnimationFrame(updateStage);
}

function showView(view) {
  const showInfo = view === "info";
  workView.classList.toggle("is-active", !showInfo);
  infoView.classList.toggle("is-active", showInfo);
  document.body.classList.toggle("is-info-view", showInfo);
  closeModal();
  trackPageView(showInfo ? "/info" : "/");
}

function openProject(index) {
  if (!projects[index]) return;
  activeProject = index;
  const project = projects[index];
  applyAlbumMood(index);
  modalTitle.innerHTML = `<em>${escapeHtml(project.album)}</em><br>${escapeHtml(project.artist)}`;
  modalYear.textContent = project.year;
  modalRole.textContent = project.role;
  modalTracks.innerHTML = (Array.isArray(project.tracks) ? project.tracks : [])
    .map((track) => {
      const item = typeof track === "string" ? { title: track, url: "" } : track;
      return item.url
        ? `<a href="${escapeAttr(safeExternalUrl(item.url))}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
        : `<span>${escapeHtml(item.title)}</span>`;
    })
    .join("");
  modalPlatforms.innerHTML = renderPlatformLinks(project);
  modalImage.src = project.image || "assets/studio-hero.jpg";
  modalImage.alt = project.album;
  prevButton.disabled = index === 0;
  nextButton.disabled = index === projects.length - 1;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-modal-open");
  document.body.style.overflow = "hidden";
  trackPageView(`/work/${projectSlug(project)}`);
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-modal-open");
  document.body.style.overflow = "";
  modalSwipe = null;
}

function shiftProject(direction) {
  const nextIndex = activeProject + direction;
  if (nextIndex < 0 || nextIndex >= projects.length) return;
  openProject(nextIndex);
}

async function loadContent() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(`${CONTENT_API_BASE}/content/works.json`, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (response.ok) {
      const remoteContent = await response.json();
      if (Array.isArray(remoteContent.works) && remoteContent.works.length) {
        return remoteContent;
      }
    }
  } catch {
    return fallbackContent;
  } finally {
    window.clearTimeout(timeout);
  }

  return fallbackContent;
}

async function bootSite() {
  const content = await loadContent();
  projects = Array.isArray(content.works) ? content.works : [];
  renderGrid();
  trackPageView("/");

  window.setTimeout(() => {
    entryScreen.classList.add("is-complete");
  }, 2600);
}

bootSite();

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  const close = event.target.closest("[data-close]");

  if (viewButton) showView(viewButton.dataset.view);
  if (close) closeModal();
});

motionEnable?.addEventListener("click", async (event) => {
  event.stopPropagation();
  const enabled = await enableDeviceSensors();
  if (!enabled) {
    motionEnable.removeAttribute("hidden");
  }
});

focusOpen.addEventListener("click", () => {
  if (displayedProject < 0) return;
  openProject(displayedProject);
});

stageFocus?.addEventListener("click", (event) => {
  if (window.matchMedia("(max-width: 560px)").matches && displayedProject >= 0) {
    openProject(displayedProject);
    return;
  }

  event.stopPropagation();
});

prevButton.addEventListener("click", () => {
  shiftProject(-1);
});

nextButton.addEventListener("click", () => {
  shiftProject(1);
});

document.addEventListener("keydown", (event) => {
  if (!modal.classList.contains("is-open")) return;
  if (event.key === "Escape") closeModal();
  if (event.key === "ArrowLeft") shiftProject(-1);
  if (event.key === "ArrowRight") shiftProject(1);
});

modal.addEventListener("pointerdown", (event) => {
  if (!modal.classList.contains("is-open")) return;
  if (event.target.closest("button, a")) return;
  modalSwipe = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  };
});

modal.addEventListener("pointerup", (event) => {
  if (!modalSwipe || modalSwipe.id !== event.pointerId) return;
  const dx = event.clientX - modalSwipe.x;
  const dy = event.clientY - modalSwipe.y;
  modalSwipe = null;
  if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
  shiftProject(dx < 0 ? 1 : -1);
});

modal.addEventListener("pointercancel", () => {
  modalSwipe = null;
});

modal.addEventListener(
  "wheel",
  (event) => {
    if (!modal.classList.contains("is-open")) return;
    if (Math.abs(event.deltaX) < 42 || Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.2) return;

    const now = performance.now();
    if (now - lastWheelNavAt < 650) return;
    lastWheelNavAt = now;
    event.preventDefault();
    shiftProject(event.deltaX > 0 ? 1 : -1);
  },
  { passive: false },
);

window.addEventListener("resize", () => {
  const bounds = viewportBounds();
  const floor = stageFloor(bounds);
  bodies.forEach((body) => {
    const size = body.token.offsetWidth || 116;
    const scaleInset = (size * (bodyScale(body) - 1)) / 2;
    const bleed = edgeBleed();
    body.x = Math.min(Math.max(-bleed + scaleInset, body.x), bounds.width - size + bleed - scaleInset);
    body.y = Math.min(Math.max(topPlayEdge() - bleed + scaleInset, body.y), floor - size + bleed - scaleInset);
  });
});

if (typeof reduceMotionQuery.addEventListener === "function") {
  reduceMotionQuery.addEventListener("change", (event) => {
    if (event.matches) enableLiteMode("reduced-motion");
  });
}
