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

// mirror of src/flavors.js labels (for the stats section)
const FLAVOR_LABELS = {
  coffee: "Кофе",
  tea: "Чай",
  caramel: "Карамель",
  mango: "Манго",
  peach: "Персик",
  cherry: "Вишня",
  blueberry: "Черника",
  cranberry: "Клюква",
  watermelon: "Арбуз",
  pineapple: "Ананас",
  strawberry: "Клубника",
  cactus: "Кактус",
  lychee: "Личи",
  barberry: "Барбарис",
  passion: "Маракуйя",
  apple: "Яблоко",
  kiwi: "Киви",
  mojito: "Мохито",
  cola: "Кола",
  lemonade: "Лимонад",
  orange: "Апельсин",
  citrus: "Цитрус",
  grape: "Виноград",
  tropical: "Тропик",
  multifruit: "Мультифрукт",
  berry: "Ягоды",
  zero: "Без сахара",
  original: "Оригинал",
  other: "Другое",
};

const USER_NAMES = { a: "Миша", b: "Тимур" };
const other = (u) => (u === "a" ? "b" : "a");

const state = {
  drinks: [],
  log: [],
  brandColors: {},
  me: localStorage.getItem("td.me") || null,
  view: "catalog",
  search: "",
  brandFilter: null,
  collectionFilter: null,
  tierMode: "all",
  statScope: localStorage.getItem("td.me") || "a",
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
const drinkById = (id) => state.drinks.find((d) => d.id === id);
const fmtDate = (ts) =>
  new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

function hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return `hsl(${h} 65% 55%)`;
}
const brandColor = (d) =>
  state.brandColors[d.brand] || hashColor(d.brand || d.name);

function textOn(color) {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return "#0c0f16";
  const n = parseInt(m[1], 16);
  const lum =
    (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) /
    255;
  return lum > 0.6 ? "#0c0f16" : "#ffffff";
}

function phMarkup(d, cls = "") {
  const c = brandColor(d);
  return `<div class="ph ${cls}" style="background:linear-gradient(160deg,${c},rgba(0,0,0,.55));color:${textOn(
    c
  )}">${esc(d.name)}</div>`;
}
function thumbMarkup(d, cls = "") {
  if (d.image)
    return `<img src="${esc(d.image)}" alt="${esc(
      d.name
    )}" onerror="window.__phFail(this)" data-name="${esc(
      d.name
    )}" data-color="${esc(brandColor(d))}" />`;
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

// tiny inline sparkline
function spark(values, color = "#ffcc33", w = 96, h = 28) {
  if (!values.length) return "";
  const max = Math.max(...values),
    min = Math.min(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const pts = values
    .map(
      (v, i) =>
        `${(i * step).toFixed(1)},${(
          h -
          3 -
          ((v - min) / span) * (h - 6)
        ).toFixed(1)}`
    )
    .join(" ");
  const last = values[values.length - 1];
  const lx = (values.length - 1) * step;
  const ly = h - 3 - ((last - min) / span) * (h - 6);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(
    1
  )}" r="2.6" fill="${color}"/></svg>`;
}

// ---------- scoring (log-based) ----------
const entryScore = (e) => (e.taste + e.energy + e.value + e.aftertaste) / 4;
const logFor = (drinkId, user) =>
  state.log
    .filter((e) => e.drinkId === drinkId && e.user === user)
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));
const latestEntry = (drinkId, user) => {
  const l = logFor(drinkId, user);
  return l.length ? l[l.length - 1] : null;
};

function aggregate(drinkId, mode = "all") {
  const users =
    mode === "me"
      ? [state.me]
      : mode === "friend"
      ? [other(state.me)]
      : ["a", "b"];
  const scores = [];
  const byUser = {};
  for (const u of users) {
    const e = latestEntry(drinkId, u);
    if (e) {
      byUser[u] = e;
      scores.push(entryScore(e));
    }
  }
  const score = scores.length
    ? scores.reduce((s, x) => s + x, 0) / scores.length
    : null;
  return { score, byUser };
}
const tierOf = (score) =>
  TIERS.find((t) => score >= t.min) || TIERS[TIERS.length - 1];
const fmt = (n) => (n == null ? "—" : (Math.round(n * 10) / 10).toFixed(1));
const drankCount = (drinkId, user) =>
  state.log.filter((e) => e.drinkId === drinkId && (!user || e.user === user))
    .length;

// brand display order: Monster, Red Bull pinned first, then first-seen order
function brandOrder() {
  const seen = [];
  for (const d of state.drinks) if (!seen.includes(d.brand)) seen.push(d.brand);
  const pinned = ["Monster", "Red Bull"];
  return [
    ...pinned.filter((b) => seen.includes(b)),
    ...seen.filter((b) => !pinned.includes(b)),
  ];
}

// ---------- api ----------
async function loadState() {
  const r = await fetch("/api/state");
  const data = await r.json();
  state.drinks = data.drinks;
  state.log = data.log || [];
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
  state.statScope = u;
  localStorage.setItem("td.me", u);
  $("#gate").classList.add("hidden");
  renderProfile();
  render();
}

// ---------- router ----------
function render() {
  if (!state.me) return $("#gate").classList.remove("hidden");
  document
    .querySelectorAll(".tab")
    .forEach((t) =>
      t.classList.toggle("active", t.dataset.view === state.view)
    );
  if (state.view === "catalog") renderCatalog();
  else if (state.view === "tier") renderTier();
  else if (state.view === "stats") renderStats();
  else renderAdd();
}

// ---------- catalog ----------
function catalogList() {
  const q = state.search.trim().toLowerCase();
  let list = state.drinks.slice();
  if (state.brandFilter)
    list = list.filter((d) => d.brand === state.brandFilter);
  if (state.collectionFilter)
    list = list.filter((d) => (d.collection || "") === state.collectionFilter);
  if (q)
    list = list.filter((d) =>
      `${d.brand} ${d.name} ${d.flavor} ${d.collection || ""}`
        .toLowerCase()
        .includes(q)
    );
  const order = brandOrder();
  list.sort((a, b) => order.indexOf(a.brand) - order.indexOf(b.brand));
  return list;
}

function cardMarkup(d) {
  const { score, byUser } = aggregate(d.id, "all");
  const meR = byUser[state.me];
  const friendR = byUser[other(state.me)];
  let status = "Нет оценок",
    cls = "none";
  if (meR && friendR) (status = "Оценён обоими"), (cls = "both");
  else if (!meR && friendR) (status = "Оцени!"), (cls = "wait");
  else if (meR && !friendR) (status = "Ждёт друга"), (cls = "wait");
  const tier = score != null ? tierOf(score) : null;
  const drunk = drankCount(d.id);
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
        <div class="brand">${esc(d.brand)}${
    d.collection ? ` · <span class="coll">${esc(d.collection)}</span>` : ""
  }</div>
        <div class="name">${esc(d.name)}</div>
        <div class="flavor">${esc(d.flavor || "")}</div>
        <div class="meta">
          <span class="price">${d.price ? d.price + " ₽" : ""}</span>
          <span class="status ${cls}">${drunk ? "🥤 " + drunk : status}</span>
        </div>
      </div>
    </div>`;
}

function renderCatalog() {
  const brands = brandOrder();
  const collections = state.brandFilter
    ? [
        ...new Set(
          state.drinks
            .filter((d) => d.brand === state.brandFilter && d.collection)
            .map((d) => d.collection)
        ),
      ]
    : [];

  $("#view").innerHTML = `
    <div class="toolbar">
      <input class="search" id="search" placeholder="Поиск напитка…" value="${esc(
        state.search
      )}" />
    </div>
    <div class="chipbar" id="brandbar">
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
    ${
      collections.length
        ? `<div class="chipbar collbar" id="collbar">
            <button class="filter-chip sm ${
              !state.collectionFilter ? "on" : ""
            }" data-coll="">Все линейки</button>
            ${collections
              .map(
                (c) =>
                  `<button class="filter-chip sm ${
                    state.collectionFilter === c ? "on" : ""
                  }" data-coll="${esc(c)}">${esc(c)}</button>`
              )
              .join("")}
          </div>`
        : ""
    }
    <div class="grid" id="grid"></div>`;

  renderGrid();

  $("#search").oninput = (e) => {
    state.search = e.target.value;
    renderGrid();
  };
  $("#brandbar").onclick = (e) => {
    const b = e.target.closest("[data-brand]");
    if (!b) return;
    state.brandFilter = b.dataset.brand || null;
    state.collectionFilter = null;
    renderCatalog();
  };
  const cb = $("#collbar");
  if (cb)
    cb.onclick = (e) => {
      const c = e.target.closest("[data-coll]");
      if (!c) return;
      state.collectionFilter = c.dataset.coll || null;
      renderCatalog();
    };
}

function renderGrid() {
  const list = catalogList();
  const grid = $("#grid");
  grid.innerHTML =
    list.map(cardMarkup).join("") ||
    '<div class="empty">Ничего не найдено</div>';
  grid.onclick = (e) => {
    const card = e.target.closest(".card");
    if (card) openRating(card.dataset.id);
  };
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
        (x) =>
          `<div class="tier-mini" data-id="${
            x.d.id
          }"><div class="tm-thumb">${thumbMarkup(
            x.d,
            "tier-mini-ph"
          )}</div><div class="tm-name">${esc(x.d.name)}</div></div>`
      )
      .join("");
    return `<div class="tier-row"><div class="tier-label" style="background:${
      t.color
    }">${t.k}</div><div class="tier-items">${
      mini || '<span class="tier-empty">—</span>'
    }</div></div>`;
  }).join("");

  const modeBtn = (m, label) =>
    `<button class="${
      state.tierMode === m ? "on" : ""
    }" data-mode="${m}">${label}</button>`;

  $("#view").innerHTML = `
    <div class="tier-modes">
      ${modeBtn("all", "Общий")}${modeBtn("me", "Мои")}${modeBtn(
    "friend",
    USER_NAMES[other(state.me)]
  )}
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
    if (b) {
      state.tierMode = b.dataset.mode;
      renderTier();
    }
  };
  $("#view").onclick = (e) => {
    const mini = e.target.closest(".tier-mini");
    if (mini) openRating(mini.dataset.id);
  };
}

// ---------- rating / tasting modal ----------
function openRating(drinkId) {
  const d = drinkById(drinkId);
  if (!d) return;
  const mine = logFor(drinkId, state.me);
  const last = mine.length ? mine[mine.length - 1] : null;
  const vals = {};
  AXES.forEach((a) => (vals[a.key] = last ? last[a.key] : 5));
  const chosenTags = new Set(last ? last.tags : []);
  const allTags = [...new Set([...PRESET_TAGS, ...(last ? last.tags : [])])];

  const axisRows = AXES.map(
    (a) => `<div class="axis"><div class="axis-top"><span class="axis-name">${
      a.label
    }</span><span class="axis-val" id="val-${a.key}">${vals[a.key]}</span></div>
      <input type="range" min="0" max="10" step="0.5" value="${
        vals[a.key]
      }" data-axis="${a.key}" /></div>`
  ).join("");
  const tagChips = allTags
    .map(
      (t) =>
        `<span class="tag ${chosenTags.has(t) ? "on" : ""}" data-tag="${esc(
          t
        )}">${esc(t)}</span>`
    )
    .join("");

  // my tasting history for this drink
  const histScores = mine.map(entryScore);
  const historyBlock = mine.length
    ? `<div class="hist">
        <div class="hist-head"><span>Мои дегустации (${mine.length})</span>${
        mine.length > 1 ? spark(histScores) : ""
      }</div>
        <div class="hist-rows">${mine
          .slice()
          .reverse()
          .map(
            (e) =>
              `<div class="hist-row"><span class="hd">${fmtDate(
                e.ts
              )}</span><b>${fmt(entryScore(e))}</b><span class="ht">${(
                e.tags || []
              )
                .slice(0, 3)
                .map(esc)
                .join(", ")}</span></div>`
          )
          .join("")}</div>
        <button class="link-del" id="del-last">✕ удалить последнюю</button>
      </div>`
    : "";

  // price row + trend
  const ph = Array.isArray(d.priceHistory) ? d.priceHistory : [];
  const priceVals = ph.map((p) => p.price);
  const priceBlock = `<div class="price-row">
      <div class="pr-cur">Цена: <b>${d.price ? d.price + " ₽" : "—"}</b>${
    priceVals.length > 1 ? spark(priceVals, "#4ade80", 70, 24) : ""
  }</div>
      <button class="pr-edit" id="price-edit">✎ цена</button>
    </div>
    <div class="price-edit-box hidden" id="price-box">
      <input class="form-input" id="price-input" type="number" inputmode="numeric" placeholder="${
        d.price || "напр. 150"
      }" />
      <button class="btn sm" id="price-save">ОК</button>
    </div>`;

  $("#modal-root").innerHTML = `
    <div class="modal-scrim" id="scrim">
      <div class="modal" id="modal">
        <div class="modal-head">
          <div class="m-thumb">${thumbMarkup(d)}</div>
          <div>
            <div class="modal-title">${esc(d.name)}</div>
            <div class="modal-sub">${esc(d.brand)}${
    d.collection ? " · " + esc(d.collection) : ""
  }${d.flavor ? " · " + esc(d.flavor) : ""}</div>
          </div>
        </div>
        ${priceBlock}
        ${axisRows}
        <div class="tags" id="tags">${tagChips}</div>
        <label class="field"><span>Заметка</span><textarea id="note" rows="2" placeholder="Пара слов…">${esc(
          last ? last.note : ""
        )}</textarea></label>
        ${historyBlock}
        <div class="modal-actions">
          <button class="btn ghost" id="cancel">Закрыть</button>
          <button class="btn" id="save">🥤 Записать</button>
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
    chosenTags.has(t) ? chosenTags.delete(t) : chosenTags.add(t);
    chip.classList.toggle("on");
  };
  const close = () => ($("#modal-root").innerHTML = "");
  $("#cancel").onclick = close;
  $("#scrim").onclick = (e) => {
    if (e.target.id === "scrim") close();
  };

  // price editing
  $("#price-edit").onclick = () => $("#price-box").classList.toggle("hidden");
  $("#price-save").onclick = async () => {
    const val = Number($("#price-input").value);
    if (!val || val <= 0) return;
    try {
      const { drink } = await api("POST", "/api/price", {
        drinkId,
        price: val,
        user: state.me,
      });
      Object.assign(d, {
        price: drink.price,
        priceHistory: drink.priceHistory,
      });
      openRating(drinkId); // re-render modal with new price + trend
    } catch (err) {
      alert(err.message);
    }
  };

  if ($("#del-last"))
    $("#del-last").onclick = async () => {
      const lastMine = mine[mine.length - 1];
      if (!lastMine) return;
      try {
        await api("DELETE", "/api/log/" + encodeURIComponent(lastMine.id));
        state.log = state.log.filter((e) => e.id !== lastMine.id);
        openRating(drinkId);
      } catch (err) {
        alert(err.message);
      }
    };

  $("#save").onclick = async () => {
    $("#save").disabled = true;
    try {
      const { entry } = await api("POST", "/api/log", {
        drinkId,
        user: state.me,
        tags: [...chosenTags],
        note: $("#note").value,
        ...vals,
      });
      state.log.push(entry);
      close();
      render();
    } catch (err) {
      alert(err.message);
      $("#save").disabled = false;
    }
  };
}

// ---------- stats ----------
function renderStats() {
  const scope = state.statScope;
  const scopeName = USER_NAMES[scope];

  // consumption
  const totalA = state.log.filter((e) => e.user === "a").length;
  const totalB = state.log.filter((e) => e.user === "b").length;
  const byBrand = {};
  state.log.forEach((e) => {
    const d = drinkById(e.drinkId);
    if (!d) return;
    byBrand[d.brand] = byBrand[d.brand] || { a: 0, b: 0 };
    byBrand[d.brand][e.user]++;
  });
  const brandRows =
    Object.entries(byBrand)
      .sort((x, y) => y[1].a + y[1].b - (x[1].a + x[1].b))
      .slice(0, 8)
      .map(([b, c]) => {
        const tot = c.a + c.b;
        const max = Math.max(
          1,
          ...Object.values(byBrand).map((v) => v.a + v.b)
        );
        return `<div class="bar-row"><span class="bar-lab">${esc(b)}</span>
        <div class="bar"><i style="width:${(tot / max) * 100}%;background:${
          state.brandColors[b] || "#888"
        }"></i></div>
        <span class="bar-val">${tot}</span></div>`;
      })
      .join("") || '<div class="muted-note">Пока ничего не выпито.</div>';

  // favorite flavors for scope
  const flav = {};
  state.log
    .filter((e) => e.user === scope)
    .forEach((e) => {
      const d = drinkById(e.drinkId);
      if (!d) return;
      const t = d.flavorTag || "other";
      flav[t] = flav[t] || { n: 0, sum: 0 };
      flav[t].n++;
      flav[t].sum += entryScore(e);
    });
  const flavArr = Object.entries(flav).map(([t, v]) => ({
    t,
    n: v.n,
    avg: v.sum / v.n,
  }));
  const byScore = [...flavArr].sort((a, b) => b.avg - a.avg).slice(0, 6);
  const flavRows =
    byScore
      .map(
        (f) =>
          `<div class="bar-row"><span class="bar-lab">${esc(
            FLAVOR_LABELS[f.t] || f.t
          )}</span>
        <div class="bar"><i style="width:${(f.avg / 10) * 100}%"></i></div>
        <span class="bar-val">${f.avg.toFixed(1)} · ${f.n}×</span></div>`
      )
      .join("") ||
    '<div class="muted-note">Оцени напитки — появятся любимые вкусы.</div>';

  // price stats
  const priced = state.drinks.filter((d) => d.price);
  const dear = priced.slice().sort((a, b) => b.price - a.price)[0];
  const cheap = priced.slice().sort((a, b) => a.price - b.price)[0];
  const avgPrice = priced.length
    ? Math.round(priced.reduce((s, d) => s + d.price, 0) / priced.length)
    : 0;
  const risen = state.drinks
    .map((d) => {
      const ph = d.priceHistory || [];
      if (ph.length < 2) return null;
      return { d, delta: ph[ph.length - 1].price - ph[0].price };
    })
    .filter(Boolean)
    .sort((a, b) => b.delta - a.delta)[0];

  // taste agreement (latest per user on drinks both rated)
  const both = state.drinks
    .map((d) => {
      const ea = latestEntry(d.id, "a"),
        eb = latestEntry(d.id, "b");
      if (!ea || !eb) return null;
      return {
        d,
        diff: Math.abs(entryScore(ea) - entryScore(eb)),
        a: entryScore(ea),
        b: entryScore(eb),
      };
    })
    .filter(Boolean);
  const agreement = both.length
    ? Math.round(
        (1 - both.reduce((s, x) => s + x.diff, 0) / both.length / 10) * 100
      )
    : null;
  const spat = both.slice().sort((a, b) => b.diff - a.diff)[0];

  $("#view").innerHTML = `
    <section class="stat-sec">
      <h3>🥤 Выпито</h3>
      <div class="big-nums">
        <div class="bignum ${
          scope === "a" ? "hl" : ""
        }"><b>${totalA}</b><span>${USER_NAMES.a}</span></div>
        <div class="bignum ${
          scope === "b" ? "hl" : ""
        }"><b>${totalB}</b><span>${USER_NAMES.b}</span></div>
        <div class="bignum"><b>${totalA + totalB}</b><span>всего</span></div>
      </div>
      <div class="bars">${brandRows}</div>
    </section>

    <section class="stat-sec">
      <h3>❤️ Любимые вкусы</h3>
      <div class="scope-toggle">
        <button class="${scope === "a" ? "on" : ""}" data-scope="a">${
    USER_NAMES.a
  }</button>
        <button class="${scope === "b" ? "on" : ""}" data-scope="b">${
    USER_NAMES.b
  }</button>
      </div>
      <div class="bars">${flavRows}</div>
    </section>

    <section class="stat-sec">
      <h3>💸 Динамика цен</h3>
      <div class="mini-cards">
        <div class="mini-card"><span>Средний чек</span><b>${
          avgPrice ? avgPrice + " ₽" : "—"
        }</b></div>
        <div class="mini-card"><span>Дороже всех</span><b>${
          dear ? dear.price + " ₽" : "—"
        }</b><em>${dear ? esc(dear.name) : ""}</em></div>
        <div class="mini-card"><span>Дешевле всех</span><b>${
          cheap ? cheap.price + " ₽" : "—"
        }</b><em>${cheap ? esc(cheap.name) : ""}</em></div>
      </div>
      ${
        risen
          ? `<div class="muted-note">Сильнее всех ${
              risen.delta >= 0 ? "подорожал" : "подешевел"
            }: <b>${esc(risen.d.name)}</b> (${risen.delta >= 0 ? "+" : ""}${
              risen.delta
            } ₽)</div>`
          : '<div class="muted-note">Добавляй цены со временем — увидишь динамику.</div>'
      }
    </section>

    <section class="stat-sec">
      <h3>🤝 Совпадение вкусов</h3>
      ${
        agreement == null
          ? '<div class="muted-note">Нужно, чтобы вы оба оценили хотя бы один напиток.</div>'
          : `<div class="agree"><div class="agree-ring" style="--p:${agreement}"><span>${agreement}%</span></div>
             <div class="agree-txt">Согласие по ${both.length} общим напиткам.${
              spat && spat.diff > 0
                ? ` Главный спор — <b>${esc(spat.d.name)}</b> (${
                    USER_NAMES.a
                  } ${fmt(spat.a)} / ${USER_NAMES.b} ${fmt(spat.b)}).`
                : ""
            }</div></div>`
      }
    </section>`;

  const st = $(".scope-toggle");
  if (st)
    st.onclick = (e) => {
      const b = e.target.closest("[data-scope]");
      if (b) {
        state.statScope = b.dataset.scope;
        renderStats();
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
    <label class="field"><span>Коллекция / линейка</span><input class="form-input" id="f-collection" placeholder="Ultra, Juiced…" /></label>
    <label class="field"><span>Название *</span><input class="form-input" id="f-name" placeholder="Monster Ultra" /></label>
    <label class="field"><span>Вкус</span><input class="form-input" id="f-flavor" placeholder="Манго" /></label>
    <div class="row2">
      <label class="field"><span>Цена ₽</span><input class="form-input" id="f-price" type="number" inputmode="numeric" placeholder="150" /></label>
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
      collection: $("#f-collection").value.trim(),
      name: $("#f-name").value.trim(),
      flavor: $("#f-flavor").value.trim(),
      price: $("#f-price").value,
      volume: $("#f-volume").value,
      category: $("#f-category").value,
      image: $("#f-image").value.trim(),
      description: $("#f-desc").value.trim(),
      user: state.me,
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
  if (t) {
    state.view = t.dataset.view;
    render();
  }
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
