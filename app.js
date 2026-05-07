const projects = [
  {
    album: "Selected Works",
    artist: "Jack Kleinick",
    year: "2026",
    role: "Producer",
    tracks: ["Playlist Reel"],
    tint: "rgba(24, 32, 36, .18)",
    sat: "1.05",
    x: "28%",
    y: "30%",
  },
  {
    album: "Los Angeles Sessions",
    artist: "Various Artists",
    year: "Los Angeles",
    role: "Production, arrangement",
    tracks: ["Artist Development", "Tracking"],
    tint: "rgba(150, 74, 44, .18)",
    sat: "1.15",
    x: "68%",
    y: "24%",
  },
  {
    album: "New York Rooms",
    artist: "Various Artists",
    year: "New York",
    role: "Co-production, writing support",
    tracks: ["Writing", "Edits"],
    tint: "rgba(35, 82, 112, .2)",
    sat: ".95",
    x: "34%",
    y: "72%",
  },
  {
    album: "London Passes",
    artist: "Various Artists",
    year: "London",
    role: "Finishing notes, production perspective",
    tracks: ["Remote Finish", "Reference Pass"],
    tint: "rgba(73, 91, 60, .18)",
    sat: ".9",
    x: "72%",
    y: "68%",
  },
  {
    album: "Vocal Direction",
    artist: "Studio",
    year: "Current",
    role: "Vocal production",
    tracks: ["Comping", "Tone", "Performance"],
    tint: "rgba(128, 47, 78, .18)",
    sat: "1.2",
    x: "50%",
    y: "40%",
  },
  {
    album: "Song Architecture",
    artist: "Studio",
    year: "Current",
    role: "Structure, arrangement",
    tracks: ["Pre-production", "Arrangement"],
    tint: "rgba(55, 55, 55, .16)",
    sat: ".82",
    x: "22%",
    y: "62%",
  },
  {
    album: "Texture Studies",
    artist: "Studio",
    year: "Current",
    role: "Synths, production palette",
    tracks: ["Keys", "Synths", "Atmosphere"],
    tint: "rgba(179, 132, 52, .18)",
    sat: "1.25",
    x: "64%",
    y: "42%",
  },
  {
    album: "Playlist Reel",
    artist: "Spotify",
    year: "Listen",
    role: "Shared selected-work playlist",
    tracks: ["Open Spotify"],
    tint: "rgba(20, 110, 68, .2)",
    sat: "1.1",
    x: "44%",
    y: "24%",
    url: "https://open.spotify.com/playlist/0vlibWutg819Jhq4i6lZmp",
  },
];

const grid = document.querySelector("#work-grid");
const workView = document.querySelector("#work-view");
const infoView = document.querySelector("#info-view");
const modal = document.querySelector("#project-modal");
const modalImage = document.querySelector("#modal-image");
const modalTitle = document.querySelector("#modal-title");
const modalYear = document.querySelector("#modal-year");
const modalRole = document.querySelector("#modal-role");
const modalTracks = document.querySelector("#modal-tracks");
const prevButton = document.querySelector("#prev-project");
const nextButton = document.querySelector("#next-project");

let activeProject = 0;

function renderGrid() {
  grid.innerHTML = projects
    .map(
      (project, index) => `
        <button class="work-card" type="button" data-project="${index}" style="--tint:${project.tint};--sat:${project.sat};--x:${project.x};--y:${project.y}">
          <span class="cover-art">
            <span class="cover-initial">${project.album.charAt(0)}</span>
          </span>
          <span class="work-overlay">
            <p><em>${project.album}</em></p>
            <p>${project.artist}</p>
            <p>${project.year}</p>
          </span>
        </button>
      `,
    )
    .join("");
}

function showView(view) {
  const showInfo = view === "info";
  workView.classList.toggle("is-active", !showInfo);
  infoView.classList.toggle("is-active", showInfo);
  document.body.style.backgroundColor = "#fff";
  closeModal();
}

function openProject(index) {
  activeProject = index;
  const project = projects[index];
  modalTitle.innerHTML = `<em>${project.album}</em><br>${project.artist}`;
  modalYear.textContent = project.year;
  modalRole.textContent = project.role;
  modalTracks.innerHTML = project.tracks.map((track) => `<span>${track}</span>`).join("");
  modalImage.style.setProperty("--tint", project.tint);
  modalImage.src = "assets/studio-hero.png";
  modalImage.alt = project.album;
  prevButton.disabled = index === 0;
  nextButton.disabled = index === projects.length - 1;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

renderGrid();

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  const card = event.target.closest("[data-project]");
  const close = event.target.closest("[data-close]");

  if (viewButton) showView(viewButton.dataset.view);
  if (card) openProject(Number(card.dataset.project));
  if (close) closeModal();
});

prevButton.addEventListener("click", () => {
  if (activeProject > 0) openProject(activeProject - 1);
});

nextButton.addEventListener("click", () => {
  if (activeProject < projects.length - 1) openProject(activeProject + 1);
});

document.addEventListener("keydown", (event) => {
  if (!modal.classList.contains("is-open")) return;
  if (event.key === "Escape") closeModal();
  if (event.key === "ArrowLeft" && activeProject > 0) openProject(activeProject - 1);
  if (event.key === "ArrowRight" && activeProject < projects.length - 1) openProject(activeProject + 1);
});
