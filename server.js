// TierDrinks — zero-dependency Node server (node:http).
// Serves the static SPA and a tiny JSON API backed by a file store.
// No npm deps → deploy is a single rsync, no build step on the VPS.

import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEED_DRINKS, BRAND_COLORS } from "./src/seedData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const DB_PATH = path.join(DATA_DIR, "db.json");

// ---------- id / slug ----------
const TRANSLIT = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

const slug = (str) =>
  String(str)
    .toLowerCase()
    .replace(/[а-яё]/g, (ch) => TRANSLIT[ch] ?? "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const drinkKey = (d) => `${d.brand}|${d.name}|${d.flavor}`;
const drinkId = (d) => slug(`${d.name}-${d.flavor}`);

// ---------- store ----------
let db = { drinks: [], ratings: [] };

async function atomicWrite(file, text) {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, text, "utf8");
  await fs.rename(tmp, file);
}

async function saveDb() {
  await atomicWrite(DB_PATH, JSON.stringify(db, null, 2));
}

// Load db.json if present, then merge in any new seed drinks (by natural key)
// so extending the catalog later just appends — ratings are never touched.
async function loadDb() {
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  try {
    db = JSON.parse(await fs.readFile(DB_PATH, "utf8"));
    if (!Array.isArray(db.drinks)) db.drinks = [];
    if (!Array.isArray(db.ratings)) db.ratings = [];
  } catch {
    db = { drinks: [], ratings: [] };
  }

  const existing = new Set(db.drinks.map(drinkKey));
  let added = 0;
  for (const seed of SEED_DRINKS) {
    if (existing.has(drinkKey(seed))) continue;
    db.drinks.push({ id: drinkId(seed), ...seed });
    existing.add(drinkKey(seed));
    added++;
  }
  if (added || !db.drinks.length) await saveDb();
  console.log(
    `[db] ${db.drinks.length} drinks, ${db.ratings.length} ratings (+${added} seeded)`
  );
}

// ---------- http helpers ----------
const CTYPE = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 8 * 1024 * 1024) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

// Serve a file from a base dir, blocking path traversal outside it.
async function serveStatic(res, baseDir, relPath) {
  const target = path.join(baseDir, relPath);
  if (!target.startsWith(baseDir + path.sep) && target !== baseDir) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  try {
    const data = await fs.readFile(target);
    const ctype =
      CTYPE[path.extname(target).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "content-type": ctype });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}

// ---------- validation ----------
const AXES = ["taste", "energy", "value", "aftertaste"];
const clampScore = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
};

// ---------- api ----------
async function handleApi(req, res, url) {
  const { pathname } = url;

  if (req.method === "GET" && pathname === "/api/state") {
    return sendJson(res, 200, {
      drinks: db.drinks,
      ratings: db.ratings,
      brandColors: BRAND_COLORS,
    });
  }

  if (req.method === "POST" && pathname === "/api/ratings") {
    const body = await readBody(req);
    const drink = db.drinks.find((d) => d.id === body.drinkId);
    if (!drink) return sendJson(res, 404, { error: "drink not found" });
    if (body.user !== "a" && body.user !== "b")
      return sendJson(res, 400, { error: "bad user" });

    const scores = {};
    for (const ax of AXES) {
      const s = clampScore(body[ax]);
      if (s === null) return sendJson(res, 400, { error: `bad score: ${ax}` });
      scores[ax] = s;
    }
    const rating = {
      drinkId: body.drinkId,
      user: body.user,
      ...scores,
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 12).map(String) : [],
      note: typeof body.note === "string" ? body.note.slice(0, 500) : "",
      ts: nowIso(),
    };
    const i = db.ratings.findIndex(
      (r) => r.drinkId === rating.drinkId && r.user === rating.user
    );
    if (i >= 0) db.ratings[i] = rating;
    else db.ratings.push(rating);
    await saveDb();
    return sendJson(res, 200, { ok: true, rating });
  }

  if (req.method === "POST" && pathname === "/api/drinks") {
    const body = await readBody(req);
    if (!body.name || !body.brand)
      return sendJson(res, 400, { error: "name and brand required" });
    const drink = {
      id:
        drinkId({ name: body.name, flavor: body.flavor || "" }) ||
        slug(`${body.brand}-${Date.now()}`),
      brand: String(body.brand).slice(0, 60),
      name: String(body.name).slice(0, 80),
      flavor: String(body.flavor || "").slice(0, 60),
      category: body.category === "soda" ? "soda" : "energy",
      volume: Number(body.volume) || null,
      price: Number(body.price) || null,
      description: String(body.description || "").slice(0, 300),
      image:
        typeof body.image === "string" && body.image
          ? body.image.slice(0, 300)
          : null,
    };
    if (db.drinks.some((d) => d.id === drink.id))
      return sendJson(res, 409, { error: "already exists" });
    db.drinks.push(drink);
    await saveDb();
    return sendJson(res, 200, { ok: true, drink });
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/drinks/")) {
    const id = decodeURIComponent(pathname.slice("/api/drinks/".length));
    const before = db.drinks.length;
    db.drinks = db.drinks.filter((d) => d.id !== id);
    db.ratings = db.ratings.filter((r) => r.drinkId !== id);
    if (db.drinks.length === before)
      return sendJson(res, 404, { error: "not found" });
    await saveDb();
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: "unknown endpoint" });
}

// node:22 has Date.now; kept as helper for a single choke point.
function nowIso() {
  return new Date().toISOString();
}

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    if (url.pathname.startsWith("/images/")) {
      return await serveStatic(
        res,
        IMAGES_DIR,
        url.pathname.slice("/images/".length)
      );
    }
    const rel =
      url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
    return await serveStatic(res, PUBLIC_DIR, rel);
  } catch (err) {
    sendJson(res, 500, { error: err.message || "server error" });
  }
});

await loadDb();
server.listen(PORT, () =>
  console.log(`TierDrinks on http://localhost:${PORT}`)
);
