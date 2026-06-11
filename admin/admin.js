const loginCard = document.querySelector("#login-card");
const loginForm = document.querySelector("#login-form");
const passwordInput = document.querySelector("#password");
const loginNote = document.querySelector("#login-note");
const adminApp = document.querySelector("#admin-app");
const importForm = document.querySelector("#import-form");
const spotifyUrl = document.querySelector("#spotify-url");
const workList = document.querySelector("#work-list");
const workCount = document.querySelector("#work-count");
const hudWorkTotal = document.querySelector("#hud-work-total");
const newButton = document.querySelector("#new-button");
const saveButton = document.querySelector("#save-button");
const saveBottomButton = document.querySelector("#save-bottom-button");
const logoutButton = document.querySelector("#logout-button");
const deleteButton = document.querySelector("#delete-button");
const editor = document.querySelector("#editor");
const statusEl = document.querySelector("#status");
const previewImage = document.querySelector("#preview-image");
const previewTitle = document.querySelector("#preview-title");
const previewMeta = document.querySelector("#preview-meta");
const analyticsRefresh = document.querySelector("#analytics-refresh");
const analyticsEls = {
  updated: document.querySelector("#analytics-updated"),
  pageviews: document.querySelector("#analytics-pageviews"),
  visitors: document.querySelector("#analytics-visitors"),
  topPlace: document.querySelector("#analytics-top-place"),
  topDevice: document.querySelector("#analytics-top-device"),
  paths: document.querySelector("#analytics-paths"),
  referrers: document.querySelector("#analytics-referrers"),
  locations: document.querySelector("#analytics-locations"),
  browsers: document.querySelector("#analytics-browsers"),
};

const fields = {
  album: document.querySelector("#field-album"),
  artist: document.querySelector("#field-artist"),
  year: document.querySelector("#field-year"),
  image: document.querySelector("#field-image"),
  dark: document.querySelector("#field-dark"),
  pastel: document.querySelector("#field-pastel"),
  role: document.querySelector("#field-role"),
  tracks: document.querySelector("#field-tracks"),
};

let works = [];
let selectedIndex = -1;
let dirty = false;
const API_BASE = "https://jack-kleinick-cms-auth.bammediaauth.workers.dev";
const API_TIMEOUT_MS = 18000;
const sessionKey = "jackAdminSession";

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#ffc5bc" : "rgba(245, 241, 234, 0.64)";
}

function friendlyError(error) {
  if (error?.name === "AbortError") return "Connection timed out. Refresh and try again.";
  return error?.message || "Something went wrong.";
}

function setButtonBusy(button, isBusy, busyText = "Working...") {
  if (!button) return;
  if (isBusy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || button.textContent;
  delete button.dataset.originalText;
  button.disabled = false;
}

function setSaveBusy(isBusy) {
  setButtonBusy(saveButton, isBusy, "Saving...");
  setButtonBusy(saveBottomButton, isBusy, "Saving...");
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

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function firstCountLabel(items = [], fallback = "--") {
  return items[0]?.label || fallback;
}

function renderAnalyticsList(element, items = []) {
  if (!element) return;
  const rows = Array.isArray(items) ? items.slice(0, 6) : [];
  if (!rows.length) {
    element.innerHTML = `<li><b>No data yet</b><span></span></li>`;
    return;
  }

  element.innerHTML = rows
    .map((item) => `<li><b>${escapeHtml(item.label || "Unknown")}</b><span>${formatNumber(item.value)}</span></li>`)
    .join("");
}

function assetUrl(path = "") {
  if (/^https?:\/\//i.test(path)) return path;
  return `/${String(path).replace(/^\/+/, "")}`;
}

async function api(path, options = {}) {
  const session = sessionStorage.getItem(sessionKey);
  const { headers: optionHeaders = {}, timeoutMs = API_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(session ? { Authorization: `Bearer ${session}` } : {}),
        ...optionHeaders,
      },
      signal: controller.signal,
      ...fetchOptions,
    });
    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text ? text.slice(0, 220) : "" };
    }
    if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
    return data;
  } finally {
    window.clearTimeout(timeout);
  }
}

function trackLines(project) {
  return (Array.isArray(project.tracks) ? project.tracks : [])
    .map((track) => `${track.title || ""}${track.url ? ` | ${track.url}` : ""}`)
    .join("\n");
}

function parseTrackLines(value) {
  return String(value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|");
      return {
        title: (parts.shift() || "").trim(),
        url: parts.join("|").trim(),
      };
    })
    .filter((track) => track.title);
}

function currentFromFields() {
  return {
    album: fields.album.value.trim() || "Untitled",
    artist: fields.artist.value.trim(),
    year: fields.year.value.trim(),
    role: fields.role.value.trim(),
    tracks: parseTrackLines(fields.tracks.value),
    image: fields.image.value.trim() || "assets/studio-hero.jpg",
    colors: {
      dark: fields.dark.value || "#6d4227",
      pastel: fields.pastel.value || "#c69a76",
    },
  };
}

function syncCurrent() {
  if (selectedIndex < 0 || !works[selectedIndex]) return;
  works[selectedIndex] = currentFromFields();
  dirty = true;
  renderPreview();
}

function renderPreview() {
  const project = selectedIndex >= 0 ? works[selectedIndex] : null;
  if (!project) {
    previewImage.src = "/assets/studio-hero.jpg";
    previewTitle.textContent = "Select a work";
    previewMeta.textContent = "";
    return;
  }

  previewImage.src = assetUrl(project.image);
  previewTitle.textContent = project.album || "Untitled";
  previewMeta.textContent = [project.artist, project.year].filter(Boolean).join(" / ");
  document.body.style.background = `color-mix(in srgb, ${project.colors?.pastel || "#c69a76"} 26%, #090b0c)`;
}

function renderList() {
  workCount.textContent = `${works.length} ${works.length === 1 ? "work" : "works"}`;
  if (hudWorkTotal) hudWorkTotal.textContent = `$${String(works.length).padStart(6, "0")}`;
  workList.innerHTML = works
    .map(
      (project, index) => `
        <button class="work-item ${index === selectedIndex ? "is-active" : ""}" type="button" data-index="${index}">
          <img src="${assetUrl(project.image)}" alt="">
          <span><strong>${escapeHtml(project.album || "Untitled")}</strong><br>${escapeHtml(project.artist || "")}</span>
        </button>
      `,
    )
    .join("");
}

function selectWork(index) {
  if (selectedIndex >= 0) syncCurrent();
  selectedIndex = index;
  const project = works[index];
  fields.album.value = project?.album || "";
  fields.artist.value = project?.artist || "";
  fields.year.value = project?.year || "";
  fields.image.value = project?.image || "assets/studio-hero.jpg";
  fields.dark.value = project?.colors?.dark || "#6d4227";
  fields.pastel.value = project?.colors?.pastel || "#c69a76";
  fields.role.value = project?.role || "";
  fields.tracks.value = trackLines(project || {});
  renderList();
  renderPreview();
  setStatus(dirty ? "Unsaved changes" : "");
}

function blankWork() {
  return {
    album: "Untitled",
    artist: "",
    year: "",
    role: "",
    tracks: [],
    image: "assets/studio-hero.jpg",
    colors: {
      dark: "#6d4227",
      pastel: "#c69a76",
    },
  };
}

function componentToHex(value) {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
}

function rgbToHex([red, green, blue]) {
  return `#${componentToHex(red)}${componentToHex(green)}${componentToHex(blue)}`;
}

function mixRgb(color, target, amount) {
  return color.map((value, index) => value * (1 - amount) + target[index] * amount);
}

function dominantFromPixels(data) {
  const buckets = new Map();
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha < 180) continue;
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    if (max < 28 || min > 238) continue;
    const key = `${Math.round(red / 24) * 24},${Math.round(green / 24) * 24},${Math.round(blue / 24) * 24}`;
    buckets.set(key, (buckets.get(key) || 0) + 1 + (max - min) / 255);
  }

  const [winner] = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0] || [["110,66,39"]];
  return winner.split(",").map(Number);
}

function extractColors(imageUrl) {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve({ dark: "#6d4227", pastel: "#c69a76" });
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 48;
      canvas.height = 48;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dominant = dominantFromPixels(context.getImageData(0, 0, canvas.width, canvas.height).data);
      resolve({
        dark: rgbToHex(mixRgb(dominant, [7, 9, 9], 0.46)),
        pastel: rgbToHex(mixRgb(dominant, [245, 241, 234], 0.42)),
      });
    };
    image.onerror = () => resolve({ dark: "#6d4227", pastel: "#c69a76" });
    image.src = imageUrl;
  });
}

async function loadWorks() {
  const data = await api("/api/works");
  works = Array.isArray(data.works) ? data.works : [];
  if (works.length) {
    selectWork(0);
    return;
  }

  selectedIndex = -1;
  renderList();
  renderPreview();
}

async function loadAnalytics() {
  if (!analyticsEls.pageviews) return;
  analyticsEls.updated.textContent = "Loading traffic...";

  try {
    const data = await api("/api/analytics?days=30");
    const totals = data.totals || {};
    const locations = totals.cities?.length ? totals.cities : totals.regions?.length ? totals.regions : totals.countries;

    analyticsEls.pageviews.textContent = formatNumber(totals.pageViews);
    analyticsEls.visitors.textContent = formatNumber(totals.uniqueVisitors);
    analyticsEls.topPlace.textContent = firstCountLabel(locations);
    analyticsEls.topDevice.textContent = firstCountLabel(totals.devices);
    analyticsEls.updated.textContent = `Updated ${new Date(data.updatedAt || Date.now()).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`;

    renderAnalyticsList(analyticsEls.paths, totals.paths);
    renderAnalyticsList(analyticsEls.referrers, totals.referrers);
    renderAnalyticsList(analyticsEls.locations, locations);
    renderAnalyticsList(analyticsEls.browsers, totals.browsers);
  } catch (error) {
    analyticsEls.updated.textContent = error.message;
    analyticsEls.pageviews.textContent = "--";
    analyticsEls.visitors.textContent = "--";
    analyticsEls.topPlace.textContent = "--";
    analyticsEls.topDevice.textContent = "--";
  }
}

async function saveWorks() {
  if (selectedIndex >= 0) syncCurrent();
  const data = await api("/api/works", {
    method: "PUT",
    body: JSON.stringify({ works }),
  });
  works = Array.isArray(data.works) ? data.works : works;
  dirty = false;
  renderList();
  setStatus("Saved live. New page loads will use this catalog.");
}

async function openAdminApp() {
  loginCard.hidden = true;
  adminApp.hidden = false;
  setStatus("Loading live catalog...");

  try {
    await loadWorks();
    setStatus("");
  } catch (error) {
    setStatus(`Catalog did not load: ${friendlyError(error)}`, true);
  }

  loadAnalytics();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginNote.textContent = "Checking password...";
  const loginButton = loginForm.querySelector("button");
  setButtonBusy(loginButton, true, "Checking...");

  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ password: passwordInput.value }),
      timeoutMs: 12000,
    });
    if (data.session) sessionStorage.setItem(sessionKey, data.session);
    loginNote.textContent = "Access granted. Loading Jack HQ...";
    await openAdminApp();
  } catch (error) {
    loginNote.textContent = friendlyError(error);
  } finally {
    setButtonBusy(loginButton, false);
  }
});

importForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Importing Spotify work...");
  const importButton = importForm.querySelector("button");
  setButtonBusy(importButton, true, "Importing...");

  try {
    const imported = await api("/api/spotify/import", {
      method: "POST",
      body: JSON.stringify({ url: spotifyUrl.value }),
      timeoutMs: 45000,
    });
    imported.project.colors = await extractColors(imported.source.thumbnailUrl);
    works.unshift(imported.project);
    dirty = true;
    spotifyUrl.value = "";
    selectWork(0);
    setStatus("Imported. Add credits, then save.");
  } catch (error) {
    setStatus(friendlyError(error), true);
  } finally {
    setButtonBusy(importButton, false);
  }
});

workList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-index]");
  if (!button) return;
  selectWork(Number(button.dataset.index));
});

editor.addEventListener("input", () => {
  syncCurrent();
  renderList();
  setStatus("Unsaved changes");
});

newButton.addEventListener("click", () => {
  if (selectedIndex >= 0) syncCurrent();
  works.unshift(blankWork());
  dirty = true;
  selectWork(0);
});

deleteButton.addEventListener("click", () => {
  if (selectedIndex < 0 || !works[selectedIndex]) return;
  const project = works[selectedIndex];
  if (!window.confirm(`Delete ${project.album}?`)) return;
  works.splice(selectedIndex, 1);
  dirty = true;
  selectWork(Math.min(selectedIndex, works.length - 1));
  setStatus("Deleted. Save to keep this change.");
});

async function handleSave() {
  try {
    setSaveBusy(true);
    setStatus("Saving...");
    await saveWorks();
  } catch (error) {
    setStatus(friendlyError(error), true);
  } finally {
    setSaveBusy(false);
  }
}

saveButton.addEventListener("click", handleSave);
saveBottomButton?.addEventListener("click", handleSave);

analyticsRefresh?.addEventListener("click", () => {
  loadAnalytics();
});

logoutButton.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: "{}" }).catch(() => {});
  sessionStorage.removeItem(sessionKey);
  loginCard.hidden = false;
  adminApp.hidden = true;
  loginNote.textContent = "Logged out.";
});

api("/api/session")
  .then(async (session) => {
    if (!session.authenticated) throw new Error("Not logged in");
    await openAdminApp();
  })
  .catch(() => {
    loginCard.hidden = false;
    adminApp.hidden = true;
  });
