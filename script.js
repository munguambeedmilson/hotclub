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
// cache: "no-cache" obriga o navegador a revalidar o ficheiro, para ver sempre a versão actual.
// Junta-os todos na MESMA grelha (#catalogGrid): se cada ficheiro ficasse numa
// <section> própria, as linhas de 4 cards ficariam com vazios no fim de cada uma.
const catalogGrid = document.getElementById("catalogGrid");
const includeSlots = [...document.querySelectorAll("[data-include]")];

Promise.all(
  includeSlots.map((slot) =>
    fetch(slot.dataset.include, { cache: "no-cache" })
      .then((res) => res.text())
      .then((html) =>
        [...new DOMParser().parseFromString(html, "text/html").querySelectorAll("main section > .card-half")]
      )
      .catch((err) => {
        console.error(`Falha ao carregar ${slot.dataset.include}`, err);
        return [];
      })
  )
).then((groups) => {
  if (!catalogGrid) {
    console.error("#catalogGrid not found in index.html — cards were not included.");
    return;
  }
  groups.flat().forEach((card) => catalogGrid.appendChild(card));
  includeSlots.forEach((slot) => slot.remove());
});

// ===== Modal de pré-visualização de vídeo =====
// Abre ao clicar no botão play da capa ou no botão PREVIEW do card e mostra
// o vídeo, a descrição do produto, as suas tags, o preço e o botão de compra.
const previewModal = document.getElementById("previewModal");
const previewVideo = document.getElementById("previewVideo");
const previewClose = document.getElementById("previewClose");
const pvTitle = document.getElementById("pvTitle");
const pvDesc = document.getElementById("pvDesc");
const pvTags = document.getElementById("pvTags");
const pvPriceOld = document.getElementById("pvPriceOld");
const pvPriceNew = document.getElementById("pvPriceNew");
const pvBuy = document.getElementById("pvBuy");

let lastTrigger = null;

// Enquanto não existir ficheiro de vídeo, fica a capa do card por trás do leitor.
previewVideo.addEventListener("error", () => previewVideo.classList.add("is-empty"));

function setVideoSource(card) {
  const src = card.dataset.video || "Videos/preview.mp4";
  previewVideo.classList.remove("is-empty");
  if (previewVideo.getAttribute("src") !== src) {
    previewVideo.setAttribute("src", src);
    previewVideo.load();
  }
}

function openPreview(card) {
  pvTitle.textContent = card.querySelector(".product-title")?.textContent.trim() || "";
  pvDesc.textContent = card.querySelector(".product-desc")?.textContent.trim() || "";
  pvPriceOld.textContent = card.querySelector(".price-old")?.textContent.trim() || "";
  pvPriceNew.textContent = card.querySelector(".price-new")?.textContent.trim() || "";
  pvBuy.setAttribute("href", card.querySelector(".btn-buy")?.getAttribute("href") || "#");

  // Copia as tags do próprio card para a descrição do modal
  pvTags.replaceChildren(
    ...[...card.querySelectorAll(".tag")].map((tag) => tag.cloneNode(true))
  );

  setVideoSource(card);
  previewModal.hidden = false;
  document.body.style.overflow = "hidden";
  previewClose.focus();
  previewVideo.play().catch(() => {}); // fails harmlessly if the file is missing yet
}

function closePreview() {
  previewModal.hidden = true;
  previewVideo.pause();
  try { previewVideo.currentTime = 0; } catch (_) { /* sem fonte carregada */ }
  document.body.style.overflow = "";
  lastTrigger?.focus();
}

document.addEventListener("click", (e) => {
  const trigger = e.target.closest(".btn-play, .btn-preview");
  if (!trigger || !trigger.closest(".product-card")) return;
  e.preventDefault();
  lastTrigger = trigger;
  openPreview(trigger.closest(".product-card"));
});

previewClose.addEventListener("click", closePreview);
previewModal.addEventListener("click", (e) => {
  if (e.target === previewModal) closePreview();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!payModal.hidden) closePayModal();
  else if (!previewModal.hidden) closePreview();
});

// ===== Modal de métodos de pagamento (botão BUY NOW) =====
// Não há botão de pagar: clicar num método escolhe-o e abre já o Telegram com
// o produto + preço reais e o método escolhido, na mensagem pronta a enviar.
const payModal = document.getElementById("payModal");
const payClose = document.getElementById("payClose");
const payMethods = document.getElementById("payMethods");

let payOrder = { name: "", price: "", href: "https://t.me/" };
let chosenMethod = "";

function openPayModal(order) {
  payOrder = order;
  chosenMethod = "";
  payMethods.querySelectorAll(".pay-method").forEach((btn) => {
    btn.classList.remove("is-selected");
    btn.setAttribute("aria-checked", "false");
  });
  payModal.hidden = false;
  document.body.style.overflow = "hidden";
  payClose.focus();
}

function closePayModal() {
  payModal.hidden = true;
  // só devolve o scroll se o modal de vídeo também estiver fechado
  if (previewModal.hidden) document.body.style.overflow = "";
}

function buildTelegramUrl() {
  const message = [
    "Hi 👋",
    "I want to purchase:",
    `📦 Content/product: ${payOrder.name}`,
    `💰 Price: ${payOrder.price}`,
    `I'll pay with ${chosenMethod}.`,
  ].join("\n");
  const sep = payOrder.href.includes("?") ? "&" : "?";
  return `${payOrder.href}${sep}text=${encodeURIComponent(message)}`;
}

// Qualquer botão BUY NOW abre a escolha de pagamento com o produto daquele card
document.addEventListener("click", (e) => {
  const buy = e.target.closest(".btn-buy");
  if (!buy) return;
  e.preventDefault();
  const card = buy.closest(".product-card") || lastTrigger?.closest(".product-card");
  if (!card) return;
  openPayModal({
    name: card.querySelector(".product-title")?.textContent.trim() || "",
    price: card.querySelector(".price-new")?.textContent.trim() || "",
    href: buy.getAttribute("href") || "#",
  });
});

payMethods.addEventListener("click", (e) => {
  const btn = e.target.closest(".pay-method");
  if (!btn) return;
  payMethods.querySelectorAll(".pay-method").forEach((b) => {
    b.classList.remove("is-selected");
    b.setAttribute("aria-checked", "false");
  });
  btn.classList.add("is-selected");
  btn.setAttribute("aria-checked", "true");
  chosenMethod = btn.dataset.method;

  // escolher o método já conduz ao Telegram (dentro do gesto do utilizador)
  window.open(buildTelegramUrl(), "_blank", "noopener");
  closePayModal();
});

payClose.addEventListener("click", closePayModal);
payModal.addEventListener("click", (e) => {
  if (e.target === payModal) closePayModal();
});

// ===== Notificação de compra recente (prova social) =====
// Mostra "<cliente> just bought <produto> — <preço>" alternando os
// produtos e preços reais dos cards da página (16 nomes de comprador).
const purchaseToast = document.getElementById("purchaseToast");
const toastName = document.getElementById("toastName");
const toastProduct = document.getElementById("toastProduct");
const toastPrice = document.getElementById("toastPrice");
const toastTime = document.getElementById("toastTime");
const toastClose = document.getElementById("toastClose");

const BUYERS = [
  "David M.", "Sarah K.", "Lucas P.", "Aisha R.",
  "Michael T.", "Emma L.", "James W.", "Olivia H.",
  "Daniel F.", "Marta S.", "Noah B.", "Zara P.",
  "Pedro A.", "Chloe D.", "Tiago M.", "Nadia C.",
];
const WHEN = ["just now", "1 minute ago", "2 minutes ago", "4 minutes ago", "7 minutes ago", "12 minutes ago"];

let toastStep = 0;
let toastHideTimer = null;
let toastNextTimer = null;

function scheduleToast(ms = 9000) {
  clearTimeout(toastNextTimer);
  toastNextTimer = setTimeout(showPurchaseToast, ms);
}

function showPurchaseToast() {
  // produto + preço reais, lidos dos cards (deduplicados pelo nome)
  const products = [...new Map(
    [...document.querySelectorAll(".product-card")].map((card) => [
      card.querySelector(".product-title")?.textContent.trim() || "",
      {
        name: card.querySelector(".product-title")?.textContent.trim() || "",
        price: card.querySelector(".price-new")?.textContent.trim() || "",
      },
    ])
  ).values()].filter((p) => p.name);

  if (!products.length) { // cards ainda a carregar
    scheduleToast(4000);
    return;
  }

  const product = products[(toastStep * 3 + 1) % products.length];
  toastName.textContent = BUYERS[toastStep % BUYERS.length];
  toastProduct.textContent = product.name;
  toastPrice.textContent = product.price ? `— ${product.price}` : "";
  toastTime.textContent = WHEN[toastStep % WHEN.length];
  toastStep++;

  purchaseToast.hidden = false;
  requestAnimationFrame(() => purchaseToast.classList.add("is-visible"));

  clearTimeout(toastHideTimer);
  toastHideTimer = setTimeout(hidePurchaseToast, 5000);
}

function hidePurchaseToast() {
  purchaseToast.classList.remove("is-visible");
  setTimeout(() => {
    purchaseToast.hidden = true;
    scheduleToast(); // volta a aparecer passado uns segundos
  }, 400);
}

toastClose.addEventListener("click", () => {
  clearTimeout(toastHideTimer);
  hidePurchaseToast();
});

// primeira notificação passado 6s, depois em ciclo ~14s
scheduleToast(6000);
