const projects = [
  {
    album: "To Let Go Your Hand",
    artist: "kabir",
    year: "2026",
    role: "Producer, Songwriter, Guitar",
    tracks: ["To Let Go Your Hand"],
    image: "assets/covers/kabir-to-let-go-your-hand.jpg",
  },
  {
    album: "Thought You Knew",
    artist: "Madeline",
    year: "2024",
    role: "Producer, Songwriter, Acoustic Guitar",
    tracks: ["Thought You Knew"],
    image: "assets/covers/madeline-thought-you-knew.jpg",
  },
  {
    album: "Sad Eyes",
    artist: "Madeline",
    year: "2024",
    role: "Producer, Songwriter",
    tracks: ["Sad Eyes"],
    image: "assets/covers/madeline-sad-eyes.jpg",
  },
  {
    album: "Good Girl",
    artist: "Jack Rabbit",
    year: "2025",
    role: "Producer, Songwriter",
    tracks: ["Good Girl"],
    image: "assets/covers/jack-rabbit-good-girl.jpg",
  },
  {
    album: "12065",
    artist: "grentperez",
    year: "2025",
    role: "Producer",
    tracks: ["12065"],
    image: "assets/covers/grentperez-12065.jpg",
  },
  {
    album: "Talk",
    artist: "Wingtip",
    year: "2023",
    role: "Producer",
    tracks: ["Talk"],
    image: "assets/covers/wingtip-talk.jpg",
  },
  {
    album: "breakfast song",
    artist: "Juliet Ivy",
    year: "2023",
    role: "Producer, Writer",
    tracks: ["breakfast song"],
    image: "assets/covers/juliet-ivy-breakfast-song.jpg",
  },
  {
    album: "Texas Sky",
    artist: "Jack Rabbit",
    year: "2025",
    role: "Producer, Songwriter",
    tracks: ["Texas Sky"],
    image: "assets/covers/jack-rabbit-texas-sky.jpg",
  },
  {
    album: "That's All, Right?",
    artist: "Jack Rabbit",
    year: "2025",
    role: "Producer, Songwriter",
    tracks: ["That's All, Right?"],
    image: "assets/covers/jack-rabbit-thats-all-right.jpg",
  },
  {
    album: "Selected Works",
    artist: "Spotify Playlist",
    year: "Listen",
    role: "Playlist reel",
    tracks: ["Open Spotify"],
    image: "assets/studio-hero.png",
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
          <img src="${project.image}" alt="${project.album} cover" loading="lazy">
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
  modalImage.src = project.image;
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
