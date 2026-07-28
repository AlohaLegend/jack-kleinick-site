const CONTENT_API_BASE = "https://jack-kleinick-cms-auth.bammediaauth.workers.dev";
const ANALYTICS_HOSTS = new Set(["jackkleinick.com", "www.jackkleinick.com"]);
const ANALYTICS_VISITOR_KEY = "jackAnalyticsVisitor";
const fallbackContent = window.JackKleinickContent || { works: [] };

let projects = [];
let activeProject = 0;
let focusedProject = 0;
let displayedProject = 0;
let modalSwipe = null;
let lastWheelNavAt = 0;
let lastAnalyticsEvent = { path: "", time: 0 };

const grid = document.querySelector("#work-grid");
const stage = document.querySelector("#gravity-stage");
const stageFocus = document.querySelector("#stage-focus");
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
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function safeExternalUrl(value = "") {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "#";
  } catch {
    return "#";
  }
}

function analyticsEnabled() {
  return ANALYTICS_HOSTS.has(window.location.hostname);
}

function analyticsVisitorId() {
  try {
    const existing = window.localStorage.getItem(ANALYTICS_VISITOR_KEY);
    if (existing) return existing;
    const value = crypto.randomUUID();
    window.localStorage.setItem(ANALYTICS_VISITOR_KEY, value);
    return value;
  } catch {
    return "unknown";
  }
}

function analyticsDevice() {
  const width = window.innerWidth;
  if (width < 680) return "phone";
  if (width < 1100) return "tablet";
  return "desktop";
}

function analyticsPath(value = "") {
  return value.startsWith("/") ? value : `/${value}`;
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
  const now = Date.now();
  const cleanPath = analyticsPath(path);
  if (lastAnalyticsEvent.path === cleanPath && now - lastAnalyticsEvent.time < 1200) return;
  lastAnalyticsEvent = { path: cleanPath, time: now };

  const body = JSON.stringify({
    visitorId: analyticsVisitorId(),
    path: cleanPath,
    referrer: document.referrer || "",
    device: analyticsDevice(),
    language: navigator.language || "",
    screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
  });

  fetch(`${CONTENT_API_BASE}/analytics/collect`, {
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
  const [dark, pastel] = projectMood(index);
  const image = projects[index]?.image || "assets/studio-hero.jpg";
  document.body.style.setProperty("--album-a", dark);
  document.body.style.setProperty("--album-b", pastel);
  document.body.style.setProperty("--page-tint", pastel);
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
  return icons[name] || "";
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

function renderTrackLinks(project) {
  return (Array.isArray(project.tracks) ? project.tracks : [])
    .map((track) => {
      const item = typeof track === "string" ? { title: track, url: "" } : track;
      return item.url
        ? `<a href="${escapeAttr(safeExternalUrl(item.url))}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
        : `<span>${escapeHtml(item.title)}</span>`;
    })
    .join("");
}

function columnProjects(columnIndex) {
  return projects.filter((_, index) => index % 3 === columnIndex);
}

function renderColumnCard(project, index, copyIndex) {
  const trackCount = Array.isArray(project.tracks) ? project.tracks.length : 0;
  return `
    <button class="column-card" type="button" data-token="${index}" aria-label="Focus ${escapeAttr(project.album)} by ${escapeAttr(project.artist)}">
      <img src="${escapeAttr(project.image || "assets/studio-hero.jpg")}" alt="${escapeAttr(project.album)} cover" loading="lazy" decoding="async">
      <span class="card-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="card-copy">
        <strong>${escapeHtml(project.album || "Untitled")}</strong>
        <small>${escapeHtml(project.artist || "")}${trackCount > 1 ? ` / ${trackCount} tracks` : ""}</small>
      </span>
      <span class="card-tint" aria-hidden="true"></span>
    </button>
  `;
}

function renderGrid() {
  if (!projects.length) {
    grid.innerHTML = "";
    entryScreen?.classList.add("is-complete");
    return;
  }

  grid.innerHTML = [0, 1, 2]
    .map((columnIndex) => {
      const items = columnProjects(columnIndex);
      const repeatedItems = [...items, ...items, ...items];
      return `
        <div class="work-column is-column-${columnIndex + 1}" style="--column-speed: ${42 + columnIndex * 7}s; --column-offset: ${columnIndex * -8}rem;">
          <div class="column-rail">
            ${repeatedItems.map((project, copyIndex) => renderColumnCard(project, projects.indexOf(project), copyIndex)).join("")}
          </div>
        </div>
      `;
    })
    .join("");

  const initialIndex = randomProjectIndex();
  focusProject(initialIndex);
  bindColumnCards();
}

function bindColumnCards() {
  grid.querySelectorAll(".column-card").forEach((card) => {
    const index = Number(card.dataset.token);
    card.addEventListener("click", () => focusProject(index));
    card.addEventListener("dblclick", () => openProject(index));
  });
}

function focusProject(index) {
  if (!projects[index]) return;
  focusedProject = index;
  displayedProject = index;
  const project = projects[index];
  applyAlbumMood(index);
  document.body.classList.add("is-playing");
  focusTitle.textContent = project.album || "Untitled";
  focusMeta.textContent = [project.artist, project.year].filter(Boolean).join(" / ");
  focusRole.textContent = project.role || "";
  focusTracks.innerHTML = renderTrackLinks(project);
  focusPlatforms.innerHTML = renderPlatformLinks(project);
  grid.querySelectorAll(".column-card").forEach((card) => {
    card.classList.toggle("is-focused", Number(card.dataset.token) === index);
  });
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
  modalTitle.innerHTML = `<em>${escapeHtml(project.album || "Untitled")}</em><br>${escapeHtml(project.artist || "")}`;
  modalYear.textContent = project.year || "";
  modalRole.textContent = project.role || "";
  modalTracks.innerHTML = renderTrackLinks(project);
  modalPlatforms.innerHTML = renderPlatformLinks(project);
  modalImage.src = project.image || "assets/studio-hero.jpg";
  modalImage.alt = project.album || "";
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
  stage?.classList.add("is-column-stage");
  motionEnable?.setAttribute("hidden", "");
  const content = await loadContent();
  projects = Array.isArray(content.works) ? content.works : [];
  renderGrid();
  trackPageView("/");

  window.setTimeout(() => {
    entryScreen?.classList.add("is-complete");
  }, 2100);
}

bootSite();

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  const close = event.target.closest("[data-close]");

  if (viewButton) showView(viewButton.dataset.view);
  if (close) closeModal();
});

focusOpen?.addEventListener("click", () => {
  if (displayedProject < 0) return;
  openProject(displayedProject);
});

stageFocus?.addEventListener("click", (event) => {
  if (event.target.closest("button, a")) return;
  if (displayedProject >= 0 && window.matchMedia("(max-width: 640px)").matches) {
    openProject(displayedProject);
  }
});

prevButton?.addEventListener("click", () => {
  shiftProject(-1);
});

nextButton?.addEventListener("click", () => {
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
