// Duração da oferta (em minutos)
const DURATION_MINUTES = 15;

const totalSeconds = DURATION_MINUTES * 60;
let remaining = totalSeconds;

const hoursEl = document.getElementById("cd-hours");
const minutesEl = document.getElementById("cd-minutes");
const secondsEl = document.getElementById("cd-seconds");
const textEl = document.getElementById("cd-text");
const barEl = document.getElementById("cd-bar");

const pad = (n) => String(n).padStart(2, "0");

function render() {
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;

  hoursEl.textContent = pad(h);
  minutesEl.textContent = pad(m);
  secondsEl.textContent = pad(s);

  textEl.textContent = `${m} minutes and ${s} seconds`;
  barEl.style.width = (remaining / totalSeconds) * 100 + "%";
}

function tick() {
  if (remaining <= 0) {
    clearInterval(timer);
    document.getElementById("cd-message").innerHTML =
      '<span class="hurry">OFFER ENDED</span>';
    return;
  }
  remaining--;
  render();
}

render();
const timer = setInterval(tick, 1000);

// Carrega os pares de cards de cada ficheiro (cards-1.html ... cards-5.html)
document.querySelectorAll("[data-include]").forEach(async (slot) => {
  const res = await fetch(slot.dataset.include);
  const doc = new DOMParser().parseFromString(await res.text(), "text/html");
  const section = doc.querySelector("main section");
  if (section) slot.replaceWith(section);
});
