const projects = [
  {
    album: "Honeydew Moon",
    artist: "Theo Kandel",
    year: "2026",
    role: "Writing / production playlist credit",
    tracks: ["Honeydew Moon"],
    image: "assets/covers/theo-kandel-honeydew-moon.jpg",
  },
  {
    album: "Eating & Drinking & Being in Love",
    artist: "Theo Kandel",
    year: "Playlist LP block",
    role: "Deep collaborator block across the playlist",
    tracks: ["Lunch", "On My Mind", "The Painters", "Fixer Upper", "Nothing New"],
    image: "assets/covers/theo-kandel-eating-drinking.jpg",
  },
  {
    album: "12065",
    artist: "grentperez",
    year: "2025",
    role: "Producer",
    tracks: ["12065", "Day By Day"],
    image: "assets/covers/grentperez-12065.jpg",
  },
  {
    album: "SOS 2001",
    artist: "Juliet Ivy",
    year: "2025",
    role: "Writing / production playlist credit",
    tracks: ["SOS 2001", "here we go again!", "breakfast song", "sweet dreams"],
    image: "assets/covers/juliet-ivy-sos-2001.jpg",
  },
  {
    album: "Bugs",
    artist: "Farrah Hanna",
    year: "2025",
    role: "Writing / production playlist credit",
    tracks: ["Bugs", "Everybody Who Prayed", "Easy & Sweet", "The Tallest Child in New York", "The Kill"],
    image: "assets/covers/farrah-hanna-bugs.jpg",
  },
  {
    album: "When We Were Young",
    artist: "Mia Wray",
    year: "2025",
    role: "Writing / production playlist credit",
    tracks: ["When We Were Young"],
    image: "assets/covers/mia-wray-when-we-were-young.jpg",
  },
  {
    album: "Some Great Stadium",
    artist: "Caity Krone",
    year: "Playlist EP block",
    role: "Writing / production playlist credit",
    tracks: ["Some Great Stadium", "Nose Job", "Camera Man", "Angry Little Fish", "At Least", "Villain"],
    image: "assets/covers/caity-krone-some-great-stadium.jpg",
  },
  {
    album: "Tú Con Él",
    artist: "Jack Rabbit",
    year: "Playlist album block",
    role: "Producer, Songwriter",
    tracks: ["Tú Con Él", "The Wedding Song", "Fall", "That's All, Right?", "Easy"],
    image: "assets/covers/jack-rabbit-tu-con-el.jpg",
  },
  {
    album: "To Let Go Your Hand",
    artist: "kabir",
    year: "2026",
    role: "Producer, Songwriter, Guitar",
    tracks: ["To Let Go Your Hand"],
    image: "assets/covers/kabir-to-let-go-your-hand.jpg",
  },
  {
    album: "Madeline",
    artist: "Madeline",
    year: "Playlist album block",
    role: "Producer, Songwriter, Acoustic Guitar",
    tracks: ["Somebody I Know", "Thought You Knew", "Many Thanks!", "Relief", "Sad Eyes"],
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
    album: "Bloodstream",
    artist: "Wingtip",
    year: "Playlist album block",
    role: "Producer",
    tracks: ["Bloodstream", "Talk", "There You Are", "Last to Know", "Something's Holding me Back"],
    image: "assets/covers/wingtip-talk.jpg",
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
    album: "HEAT",
    artist: "Appleby",
    year: "Playlist credit",
    role: "Writing / production playlist credit",
    tracks: ["HEAT", "Navy Blue"],
    image: "assets/covers/appleby-heat.jpg",
  },
  {
    album: "hotel room",
    artist: "Puma Blue",
    year: "Playlist credit",
    role: "Writing / production playlist credit",
    tracks: ["hotel room"],
    image: "assets/covers/puma-blue-hotel-room.jpg",
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
    album: "The Man",
    artist: "Gigi Perez",
    year: "Playlist credit",
    role: "Writing / production playlist credit",
    tracks: ["The Man"],
    image: "assets/covers/gigi-perez-the-man.jpg",
  },
  {
    album: "die in the hills",
    artist: "Abi Carter",
    year: "Playlist credit",
    role: "Writing / production playlist credit",
    tracks: ["die in the hills"],
    image: "assets/covers/abi-carter-die-in-the-hills.jpg",
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
const themeToggle = document.querySelector("#theme-toggle");

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
  closeModal();
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem("jack-kleinick-theme", theme);
  const isDark = theme === "dark";
  themeToggle.textContent = isDark ? "Light" : "Dark";
  themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`);
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
setTheme(localStorage.getItem("jack-kleinick-theme") || "light");

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  const card = event.target.closest("[data-project]");
  const close = event.target.closest("[data-close]");

  if (viewButton) showView(viewButton.dataset.view);
  if (card) openProject(Number(card.dataset.project));
  if (close) closeModal();
});

themeToggle.addEventListener("click", () => {
  setTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
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
