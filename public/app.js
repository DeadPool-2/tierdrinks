// TierDrinks SPA — vanilla, no build. Talks to the node:http API.

const AXES = [
  { key: "taste", label: "Вкус" },
  { key: "energy", label: "Бодрость" },
  { key: "value", label: "Цена/качество" },
  { key: "aftertaste", label: "Послевкусие" },
];

const TIERS = [
  { k: "S", min: 9, color: "#ff4d4d" },
  { k: "A", min: 8, color: "#ff914d" },
  { k: "B", min: 6.5, color: "#ffd24d" },
  { k: "C", min: 5, color: "#6bd46b" },
  { k: "D", min: 3.5, color: "#4db8ff" },
  { k: "F", min: 0, color: "#9aa4b2" },
];

const PRESET_TAGS = [
  "вкусный",
  "кислый",
  "сладкий",
  "газ-бомба",
  "химоза",
  "питкий",
  "ядрёный",
  "слабый",
  "травит",
  "как вода",
  "топ",
  "не зайдёт",
];

const USER_NAMES = { a: "Ты", b: "Друг" };

const state = {
  drinks: [],
  ratings: [],
  brandColors: {},
  me: localStorage.getItem("td.me") || null,
  view: "catalog",
  search: "",
  brandFilter: null,
  tierMode: "all", // all | me | friend
};

// ---------- utils ----------
const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );

function hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return `hsl(${h} 65% 55%)`;
}

function brandColor(d) {
  return state.brandColors[d.brand] || hashColor(d.brand || d.name);
}

// readable text color over a hex/hsl background
function textOn(color) {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return "#0c0f16";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0c0f16" : "#ffffff";
}

function phMarkup(d, cls = "") {
  const c = brandColor(d);
  const t = textOn(c);
  return `<div class="ph ${cls}" style="background:linear-gradient(160deg,${c},rgba(0,0,0,.55));color:${t}">${esc(
    d.name
  )}</div>`;
}

function thumbMarkup(d, cls = "") {
  if (d.image) {
    return `<img src="${esc(d.image)}" alt="${esc(
      d.name
    )}" onerror="window.__phFail(this)" data-name="${esc(
      d.name
    )}" data-color="${esc(brandColor(d))}" />`;
  }
  return phMarkup(d, cls);
}

window.__phFail = (img) => {
  const div = document.createElement("div");
  div.className = "ph";
  div.style.background = `linear-gradient(160deg,${img.dataset.color},rgba(0,0,0,.55))`;
  div.style.color = textOn(img.dataset.color);
  div.textContent = img.dataset.name;
  img.replaceWith(div);
};

// ---------- scoring ----------
const userScore = (r) => (r.taste + r.energy + r.value + r.aftertaste) / 4;

function aggregate(drinkId, mode = "all") {
  const rs = state.ratings.filter((r) => r.drinkId === drinkId);
  const byUser = {};
  rs.forEach((r) => (byUser[r.user] = r));
  let picks;
  if (mode === "me") picks = rs.filter((r) => r.user === state.me);
  else if (mode === "friend") picks = rs.filter((r) => r.user !== state.me);
  else picks = rs;
  if (!picks.length) return { score: null, byUser };
  const score = picks.reduce((s, r) => s + userScore(r), 0) / picks.length;
  return { score, byUser };
}

function tierOf(score) {
  return TIERS.find((t) => score >= t.min) || TIERS[TIERS.length - 1];
}

const fmt = (n) => (n == null ? "—" : (Math.round(n * 10) / 10).toFixed(1));

// ---------- api ----------
async function loadState() {
  const r = await fetch("/api/state");
  const data = await r.json();
  state.drinks = data.drinks;
  state.ratings = data.ratings;
  state.brandColors = data.brandColors || {};
}

async function api(method, path, body) {
  const r = await fetch(path, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Ошибка сервера");
  return data;
}

// ---------- profile ----------
function renderProfile() {
  $("#profile").innerHTML = ["a", "b"]
    .map(
      (u) =>
        `<button data-user="${u}" class="${state.me === u ? "on" : ""}">${
          USER_NAMES[u]
        }</button>`
    )
    .join("");
}

function setMe(u) {
  state.me = u;
  localStorage.setItem("td.me", u);
  $("#gate").classList.add("hidden");
  renderProfile();
  render();
}

// ---------- router ----------
function render() {
  if (!state.me) {
    $("#gate").classList.remove("hidden");
    return;
  }
  document
    .querySelectorAll(".tab")
    .forEach((t) =>
      t.classList.toggle("active", t.dataset.view === state.view)
    );
  if (state.view === "catalog") renderCatalog();
  else if (state.view === "tier") renderTier();
  else renderAdd();
}

// ---------- catalog ----------
function renderCatalog() {
  const brands = [...new Set(state.drinks.map((d) => d.brand))].sort();
  const q = state.search.trim().toLowerCase();
  let list = state.drinks.slice();
  if (state.brandFilter)
    list = list.filter((d) => d.brand === state.brandFilter);
  if (q)
    list = list.filter((d) =>
      `${d.brand} ${d.name} ${d.flavor}`.toLowerCase().includes(q)
    );

  const cards = list
    .map((d) => {
      const { score, byUser } = aggregate(d.id, "all");
      const meR = byUser[state.me];
      const friendR = byUser[state.me === "a" ? "b" : "a"];
      let status = "Нет оценок",
        cls = "none";
      if (meR && friendR) (status = "Оценён обоими"), (cls = "both");
      else if (!meR && friendR) (status = "Оцени!"), (cls = "wait");
      else if (meR && !friendR) (status = "Ждёт друга"), (cls = "wait");
      const tier = score != null ? tierOf(score) : null;
      return `
      <div class="card" data-id="${d.id}">
        <div class="thumb">
          ${thumbMarkup(d)}
          ${
            tier
              ? `<div class="tier-pill" style="background:${tier.color}">${tier.k}</div>`
              : ""
          }
          <div class="score-badge">${fmt(score)}</div>
        </div>
        <div class="body">
          <div class="brand">${esc(d.brand)}</div>
          <div class="name">${esc(d.name)}</div>
          <div class="flavor">${esc(d.flavor || "")}</div>
          <div class="meta">
            <span class="price">${d.price ? d.price + " ₽" : ""}</span>
            <span class="status ${cls}">${status}</span>
          </div>
        </div>
      </div>`;
    })
    .join("");

  $("#view").innerHTML = `
    <div class="toolbar">
      <input class="search" id="search" placeholder="Поиск напитка…" value="${esc(
        state.search
      )}" />
    </div>
    <div class="chipbar" id="chipbar">
      <button class="filter-chip ${
        !state.brandFilter ? "on" : ""
      }" data-brand="">Все</button>
      ${brands
        .map(
          (b) =>
            `<button class="filter-chip ${
              state.brandFilter === b ? "on" : ""
            }" data-brand="${esc(b)}">${esc(b)}</button>`
        )
        .join("")}
    </div>
    <div class="grid">${
      cards || '<div class="empty">Ничего не найдено</div>'
    }</div>`;

  const search = $("#search");
  search.oninput = (e) => {
    state.search = e.target.value;
    const grid = $(".grid");
    // light re-render of grid only to keep focus
    renderCatalogGrid(grid);
  };
  $("#chipbar").onclick = (e) => {
    const b = e.target.closest("[data-brand]");
    if (!b) return;
    state.brandFilter = b.dataset.brand || null;
    renderCatalog();
  };
  $(".grid").onclick = (e) => {
    const card = e.target.closest(".card");
    if (card) openRating(card.dataset.id);
  };
}

function renderCatalogGrid(grid) {
  const q = state.search.trim().toLowerCase();
  let list = state.drinks.slice();
  if (state.brandFilter)
    list = list.filter((d) => d.brand === state.brandFilter);
  if (q)
    list = list.filter((d) =>
      `${d.brand} ${d.name} ${d.flavor}`.toLowerCase().includes(q)
    );
  grid.innerHTML =
    list
      .map((d) => {
        const { score, byUser } = aggregate(d.id, "all");
        const meR = byUser[state.me];
        const friendR = byUser[state.me === "a" ? "b" : "a"];
        let status = "Нет оценок",
          cls = "none";
        if (meR && friendR) (status = "Оценён обоими"), (cls = "both");
        else if (!meR && friendR) (status = "Оцени!"), (cls = "wait");
        else if (meR && !friendR) (status = "Ждёт друга"), (cls = "wait");
        const tier = score != null ? tierOf(score) : null;
        return `<div class="card" data-id="${
          d.id
        }"><div class="thumb">${thumbMarkup(d)}${
          tier
            ? `<div class="tier-pill" style="background:${tier.color}">${tier.k}</div>`
            : ""
        }<div class="score-badge">${fmt(
          score
        )}</div></div><div class="body"><div class="brand">${esc(
          d.brand
        )}</div><div class="name">${esc(d.name)}</div><div class="flavor">${esc(
          d.flavor || ""
        )}</div><div class="meta"><span class="price">${
          d.price ? d.price + " ₽" : ""
        }</span><span class="status ${cls}">${status}</span></div></div></div>`;
      })
      .join("") || '<div class="empty">Ничего не найдено</div>';
}

// ---------- tier list ----------
function renderTier() {
  const scored = state.drinks
    .map((d) => ({ d, ...aggregate(d.id, state.tierMode) }))
    .filter((x) => x.score != null)
    .sort((a, b) => b.score - a.score);
  const unrated = state.drinks.filter(
    (d) => aggregate(d.id, state.tierMode).score == null
  );

  const rows = TIERS.map((t) => {
    const items = scored.filter((x) => tierOf(x.score).k === t.k);
    const mini = items
      .map(
        (x) => `
      <div class="tier-mini" data-id="${x.d.id}">
        <div class="tm-thumb">${thumbMarkup(x.d, "tier-mini-ph")}</div>
        <div class="tm-name">${esc(x.d.name)}</div>
      </div>`
      )
      .join("");
    return `
      <div class="tier-row">
        <div class="tier-label" style="background:${t.color}">${t.k}</div>
        <div class="tier-items">${
          mini || '<span class="tier-empty">—</span>'
        }</div>
      </div>`;
  }).join("");

  const modeBtn = (m, label) =>
    `<button class="${
      state.tierMode === m ? "on" : ""
    }" data-mode="${m}">${label}</button>`;

  $("#view").innerHTML = `
    <div class="tier-modes">
      ${modeBtn("all", "Общий")}
      ${modeBtn("me", "Мои")}
      ${modeBtn("friend", USER_NAMES[state.me === "a" ? "b" : "a"])}
    </div>
    <div class="sub-summary">${scored.length} оценено · ${
    unrated.length
  } ждут</div>
    ${rows}
    ${
      unrated.length
        ? `<div class="unrated-block"><h3>Ещё не в тир-листе</h3><div class="tier-items">${unrated
            .map(
              (d) =>
                `<div class="tier-mini" data-id="${
                  d.id
                }"><div class="tm-thumb">${thumbMarkup(
                  d,
                  "tier-mini-ph"
                )}</div><div class="tm-name">${esc(d.name)}</div></div>`
            )
            .join("")}</div></div>`
        : ""
    }`;

  $(".tier-modes").onclick = (e) => {
    const b = e.target.closest("[data-mode]");
    if (!b) return;
    state.tierMode = b.dataset.mode;
    renderTier();
  };
  $("#view").onclick = (e) => {
    const mini = e.target.closest(".tier-mini");
    if (mini) openRating(mini.dataset.id);
  };
}

// ---------- rating modal ----------
function openRating(drinkId) {
  const d = state.drinks.find((x) => x.id === drinkId);
  if (!d) return;
  const existing = state.ratings.find(
    (r) => r.drinkId === drinkId && r.user === state.me
  );
  const vals = {};
  AXES.forEach((a) => (vals[a.key] = existing ? existing[a.key] : 5));
  const chosenTags = new Set(existing ? existing.tags : []);
  const allTags = [
    ...new Set([...PRESET_TAGS, ...(existing ? existing.tags : [])]),
  ];

  const axisRows = AXES.map(
    (a) => `
    <div class="axis">
      <div class="axis-top"><span class="axis-name">${
        a.label
      }</span><span class="axis-val" id="val-${a.key}">${
      vals[a.key]
    }</span></div>
      <input type="range" min="0" max="10" step="0.5" value="${
        vals[a.key]
      }" data-axis="${a.key}" />
    </div>`
  ).join("");

  const tagChips = allTags
    .map(
      (t) =>
        `<span class="tag ${chosenTags.has(t) ? "on" : ""}" data-tag="${esc(
          t
        )}">${esc(t)}</span>`
    )
    .join("");

  $("#modal-root").innerHTML = `
    <div class="modal-scrim" id="scrim">
      <div class="modal" id="modal">
        <div class="modal-head">
          <div class="m-thumb">${thumbMarkup(d)}</div>
          <div>
            <div class="modal-title">${esc(d.name)}</div>
            <div class="modal-sub">${esc(d.brand)}${
    d.flavor ? " · " + esc(d.flavor) : ""
  } · оценка от «${USER_NAMES[state.me]}»</div>
          </div>
        </div>
        ${axisRows}
        <div class="tags" id="tags">${tagChips}</div>
        <label class="field"><span>Заметка</span><textarea id="note" rows="2" placeholder="Пара слов…">${esc(
          existing ? existing.note : ""
        )}</textarea></label>
        <div class="modal-actions">
          <button class="btn ghost" id="cancel">Отмена</button>
          <button class="btn" id="save">Сохранить</button>
        </div>
      </div>
    </div>`;

  const modal = $("#modal");
  modal.querySelectorAll("input[type=range]").forEach((inp) => {
    inp.oninput = () => {
      vals[inp.dataset.axis] = Number(inp.value);
      $("#val-" + inp.dataset.axis).textContent = inp.value;
    };
  });
  $("#tags").onclick = (e) => {
    const chip = e.target.closest("[data-tag]");
    if (!chip) return;
    const t = chip.dataset.tag;
    if (chosenTags.has(t)) chosenTags.delete(t);
    else chosenTags.add(t);
    chip.classList.toggle("on");
  };
  const close = () => ($("#modal-root").innerHTML = "");
  $("#cancel").onclick = close;
  $("#scrim").onclick = (e) => {
    if (e.target.id === "scrim") close();
  };
  $("#save").onclick = async () => {
    $("#save").disabled = true;
    try {
      const payload = {
        drinkId,
        user: state.me,
        tags: [...chosenTags],
        note: $("#note").value,
        ...vals,
      };
      const { rating } = await api("POST", "/api/ratings", payload);
      const i = state.ratings.findIndex(
        (r) => r.drinkId === drinkId && r.user === state.me
      );
      if (i >= 0) state.ratings[i] = rating;
      else state.ratings.push(rating);
      close();
      render();
    } catch (err) {
      alert(err.message);
      $("#save").disabled = false;
    }
  };
}

// ---------- add drink ----------
function renderAdd() {
  const brands = [...new Set(state.drinks.map((d) => d.brand))].sort();
  $("#view").innerHTML = `
    <div class="sub-summary">Добавь напиток, которого нет в каталоге.</div>
    <label class="field"><span>Бренд *</span>
      <input class="form-input" id="f-brand" list="brands" placeholder="Monster" />
      <datalist id="brands">${brands
        .map((b) => `<option value="${esc(b)}">`)
        .join("")}</datalist>
    </label>
    <label class="field"><span>Название *</span><input class="form-input" id="f-name" placeholder="Monster Energy" /></label>
    <label class="field"><span>Вкус</span><input class="form-input" id="f-flavor" placeholder="Манго" /></label>
    <div class="row2">
      <label class="field"><span>Цена ₽</span><input class="form-input" id="f-price" type="number" inputmode="numeric" placeholder="130" /></label>
      <label class="field"><span>Объём, л</span><input class="form-input" id="f-volume" type="number" step="0.001" inputmode="decimal" placeholder="0.449" /></label>
    </div>
    <label class="field"><span>Категория</span>
      <select class="form-input" id="f-category"><option value="energy">Энергетик</option><option value="soda">Газировка</option></select>
    </label>
    <label class="field"><span>Ссылка на картинку</span><input class="form-input" id="f-image" placeholder="https://…" /></label>
    <label class="field"><span>Описание</span><textarea class="form-input" id="f-desc" rows="2"></textarea></label>
    <button class="btn" id="f-save">Добавить</button>`;

  $("#f-save").onclick = async () => {
    const payload = {
      brand: $("#f-brand").value.trim(),
      name: $("#f-name").value.trim(),
      flavor: $("#f-flavor").value.trim(),
      price: $("#f-price").value,
      volume: $("#f-volume").value,
      category: $("#f-category").value,
      image: $("#f-image").value.trim(),
      description: $("#f-desc").value.trim(),
    };
    if (!payload.brand || !payload.name)
      return alert("Бренд и название обязательны");
    try {
      const { drink } = await api("POST", "/api/drinks", payload);
      state.drinks.push(drink);
      state.view = "catalog";
      render();
    } catch (err) {
      alert(err.message);
    }
  };
}

// ---------- boot ----------
document.getElementById("tabs").addEventListener("click", (e) => {
  const t = e.target.closest(".tab");
  if (!t) return;
  state.view = t.dataset.view;
  render();
});
document.getElementById("profile").addEventListener("click", (e) => {
  const b = e.target.closest("[data-user]");
  if (b) setMe(b.dataset.user);
});
document.getElementById("gate").addEventListener("click", (e) => {
  const b = e.target.closest("[data-user]");
  if (b) setMe(b.dataset.user);
});

(async function boot() {
  renderProfile();
  await loadState();
  render();
})();
