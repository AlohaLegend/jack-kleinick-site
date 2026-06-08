const loginCard = document.querySelector("#login-card");
const loginForm = document.querySelector("#login-form");
const passwordInput = document.querySelector("#password");
const loginNote = document.querySelector("#login-note");
const adminApp = document.querySelector("#admin-app");
const importForm = document.querySelector("#import-form");
const spotifyUrl = document.querySelector("#spotify-url");
const workList = document.querySelector("#work-list");
const workCount = document.querySelector("#work-count");
const newButton = document.querySelector("#new-button");
const saveButton = document.querySelector("#save-button");
const publishButton = document.querySelector("#publish-button");
const deleteButton = document.querySelector("#delete-button");
const editor = document.querySelector("#editor");
const statusEl = document.querySelector("#status");
const previewImage = document.querySelector("#preview-image");
const previewTitle = document.querySelector("#preview-title");
const previewMeta = document.querySelector("#preview-meta");

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

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#ffc5bc" : "rgba(245, 241, 234, 0.64)";
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

function assetUrl(path = "") {
  if (/^https?:\/\//i.test(path)) return path;
  return `/${String(path).replace(/^\/+/, "")}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
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
  selectWork(0);
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
  setStatus("Saved locally");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginNote.textContent = "Checking password...";
  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ password: passwordInput.value }),
    });
    loginCard.hidden = true;
    adminApp.hidden = false;
    await loadWorks();
  } catch (error) {
    loginNote.textContent = error.message;
  }
});

importForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Importing Spotify work...");
  try {
    const imported = await api("/api/spotify/import", {
      method: "POST",
      body: JSON.stringify({ url: spotifyUrl.value }),
    });
    imported.project.colors = await extractColors(imported.source.thumbnailUrl);
    works.unshift(imported.project);
    dirty = true;
    spotifyUrl.value = "";
    selectWork(0);
    setStatus("Imported. Add credits, then save.");
  } catch (error) {
    setStatus(error.message, true);
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

saveButton.addEventListener("click", async () => {
  try {
    setStatus("Saving...");
    await saveWorks();
  } catch (error) {
    setStatus(error.message, true);
  }
});

publishButton.addEventListener("click", async () => {
  try {
    setStatus("Saving before publish...");
    await saveWorks();
    setStatus("Publishing to GitHub Pages...");
    const result = await api("/api/publish", { method: "POST", body: "{}" });
    setStatus(result.output || "Published");
  } catch (error) {
    setStatus(error.message, true);
  }
});

api("/api/session")
  .then(async (session) => {
    if (!session.ok) throw new Error("Not logged in");
    loginCard.hidden = true;
    adminApp.hidden = false;
    await loadWorks();
  })
  .catch(() => {
    loginCard.hidden = false;
    adminApp.hidden = true;
  });
