const credits = [
  {
    title: "Artist Development Sessions",
    place: "Los Angeles",
    tag: "la",
    role: "producer / arrangement",
    detail: "Early-stage records built around voice, tempo, and a production palette that leaves space.",
  },
  {
    title: "Downtown Writing Rooms",
    place: "New York",
    tag: "ny",
    role: "co-production",
    detail: "Compact sessions for artists moving between writing, tracking, and finishing decisions.",
  },
  {
    title: "Remote Finishing Passes",
    place: "London",
    tag: "london",
    role: "production notes",
    detail: "Cross-time-zone polish: structure, sonic references, transitions, and final record feel.",
  },
  {
    title: "Playlist Reel",
    place: "Source Playlist",
    tag: "all",
    role: "selected work",
    detail: "A living reel connected to Jack's shared Spotify playlist while final credit metadata is locked.",
  },
];

const phases = {
  pre: "Finding the song's center: references, tempo, key, lyric intent, and the sonic world around it.",
  track: "Building performances that feel alive without crowding the artist: vocals, instruments, edits, and tone.",
  finish: "Turning rough promise into release-ready decisions: arrangement trims, mix perspective, and handoff notes.",
};

const grid = document.querySelector("#credit-grid");
const chips = document.querySelectorAll(".chip");
const orbitLabel = document.querySelector("#orbit-label");
const phaseButtons = document.querySelectorAll(".phase");
const phaseCopy = document.querySelector("#phase-copy");
const soundToggle = document.querySelector("#sound-toggle");
const canvas = document.querySelector("#signal-canvas");
const context = canvas.getContext("2d");

let activeFilter = "all";
let pointerX = 0.5;
let pointerY = 0.5;
let soundOn = false;
let audioContext;
let oscillator;
let gain;

function renderCredits() {
  const visible = credits.filter((credit) => activeFilter === "all" || credit.tag === activeFilter);
  grid.innerHTML = visible
    .map(
      (credit) => `
        <article class="credit-card" tabindex="0" data-orbit="${credit.role}">
          <div class="credit-meta">
            <span>${credit.place}</span>
            <span>${credit.role}</span>
          </div>
          <h3>${credit.title}</h3>
          <p>${credit.detail}</p>
        </article>
      `,
    )
    .join("");

  document.querySelectorAll(".credit-card").forEach((card) => {
    card.addEventListener("pointerenter", () => {
      orbitLabel.textContent = card.dataset.orbit;
    });
    card.addEventListener("focus", () => {
      orbitLabel.textContent = card.dataset.orbit;
    });
  });
}

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    activeFilter = chip.dataset.filter;
    chips.forEach((item) => item.classList.toggle("active", item === chip));
    renderCredits();
  });
});

phaseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    phaseButtons.forEach((item) => item.classList.toggle("active", item === button));
    phaseCopy.textContent = phases[button.dataset.phase];
  });
});

function resizeCanvas() {
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * scale);
  canvas.height = Math.floor(window.innerHeight * scale);
  context.setTransform(scale, 0, 0, scale, 0, 0);
}

function drawSignal(time = 0) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  context.clearRect(0, 0, width, height);
  context.globalAlpha = 0.55;

  for (let i = 0; i < 9; i += 1) {
    const y = height * (0.18 + i * 0.09);
    const amplitude = 12 + i * 2 + pointerY * 22;
    context.beginPath();
    context.strokeStyle = i % 3 === 0 ? "rgba(215,151,70,.20)" : "rgba(143,183,201,.13)";
    context.lineWidth = 1;

    for (let x = 0; x <= width; x += 18) {
      const drift = time * 0.001 + i * 0.7 + pointerX * 2;
      const wave = Math.sin(x * 0.014 + drift) * amplitude;
      const mod = Math.cos(x * 0.004 - drift) * 8;
      if (x === 0) context.moveTo(x, y + wave + mod);
      context.lineTo(x, y + wave + mod);
    }
    context.stroke();
  }

  requestAnimationFrame(drawSignal);
}

function startSignal() {
  audioContext = new AudioContext();
  oscillator = audioContext.createOscillator();
  gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 88;
  gain.gain.value = 0.025;
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
}

soundToggle.addEventListener("click", async () => {
  if (!audioContext) startSignal();
  soundOn = !soundOn;
  gain.gain.setTargetAtTime(soundOn ? 0.035 : 0, audioContext.currentTime, 0.05);
  soundToggle.classList.toggle("active", soundOn);
  soundToggle.setAttribute("aria-pressed", String(soundOn));
});

window.addEventListener("pointermove", (event) => {
  pointerX = event.clientX / window.innerWidth;
  pointerY = event.clientY / window.innerHeight;
  if (oscillator && soundOn) {
    oscillator.frequency.setTargetAtTime(72 + pointerX * 54, audioContext.currentTime, 0.06);
  }
});

window.addEventListener("resize", resizeCanvas);
document.querySelector("#year").textContent = new Date().getFullYear();

resizeCanvas();
renderCredits();
drawSignal();
