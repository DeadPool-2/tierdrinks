// Smoke tests for the dev backend (server.js): seed merge, tombstones,
// prune, price refresh and the export route. Zero-deps: node --test.
//   npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3891;
const BASE = `http://127.0.0.1:${PORT}`;

let dataDir;
let child = null;

async function startServer() {
  child = spawn(process.execPath, [path.join(ROOT, "server.js")], {
    env: { ...process.env, PORT: String(PORT), TD_DATA_DIR: dataDir },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("server start timeout")), 8000);
    child.stdout.on("data", (b) => {
      if (String(b).includes("TierDrinks on")) {
        clearTimeout(t);
        resolve();
      }
    });
    child.stderr.on("data", (b) => process.stderr.write(b));
    child.on("exit", (code) => reject(new Error(`server died: ${code}`)));
  });
}

async function stopServer() {
  if (!child) return;
  const done = new Promise((r) => child.on("exit", r));
  child.kill();
  await done;
  child = null;
}

const api = async (method, p, body) => {
  const res = await fetch(BASE + p, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null), res };
};

before(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "tierdrinks-test-"));
  await startServer();
});

after(async () => {
  await stopServer();
  await fs.rm(dataDir, { recursive: true, force: true });
});

test("сид: каталог поднимается из seedData+seedExtra", async () => {
  const { status, json } = await api("GET", "/api/state");
  assert.equal(status, 200);
  assert.ok(json.drinks.length >= 150, `мало напитков: ${json.drinks.length}`);
  assert.ok(json.drinks.some((d) => d.category === "soda"), "нет газировки");
  const rockstar = json.drinks.find((d) => d.id === "rockstar-original-original");
  assert.ok(rockstar, "нет Rockstar Original");
  assert.equal(rockstar.price, null, "фейковая цена у Rockstar");
});

test("лог: запись и удаление дегустации", async () => {
  const post = await api("POST", "/api/log", {
    drinkId: "monster-energy-original",
    user: "a",
    taste: 8,
    value: 6,
    aftertaste: 7,
    tags: ["топ"],
    note: "смоук",
  });
  assert.equal(post.status, 200);
  assert.equal("energy" in post.json.entry, false);
  const id = post.json.entry.id;
  const st = await api("GET", "/api/state");
  assert.equal(st.json.log.length, 1);
  const del = await api("DELETE", "/api/log/" + id);
  assert.equal(del.status, 200);
});

test("цена: юзер-правка попадает в priceHistory", async () => {
  const r = await api("POST", "/api/price", {
    drinkId: "monster-energy-original",
    price: 199,
    user: "b",
  });
  assert.equal(r.status, 200);
  assert.equal(r.json.drink.price, 199);
  const ph = r.json.drink.priceHistory;
  assert.equal(ph[ph.length - 1].user, "b");
});

test("tombstone: удалённый сид-напиток не воскресает после рестарта", async () => {
  const del = await api("DELETE", "/api/drinks/burn-mango-mango");
  assert.equal(del.status, 200);
  await stopServer();
  await startServer();
  const st = await api("GET", "/api/state");
  assert.ok(
    !st.json.drinks.some((d) => d.id === "burn-mango-mango"),
    "tombstone не сработал"
  );
});

test("рестарт: лог и юзер-цена переживают перезапуск", async () => {
  const post = await api("POST", "/api/log", {
    drinkId: "red-bull-original",
    user: "b",
    taste: 5,
    value: 5,
    aftertaste: 5,
  });
  assert.equal(post.status, 200);
  await stopServer();
  await startServer();
  const st = await api("GET", "/api/state");
  assert.equal(st.json.log.length, 1, "лог потерян");
  const monster = st.json.drinks.find((d) => d.id === "monster-energy-original");
  assert.equal(monster.price, 199, "юзер-цена потеряна");
});

test("prune: сид-сирота без оценок исчезает, дописанный руками напиток живёт", async () => {
  await stopServer();
  const dbPath = path.join(dataDir, "db.json");
  const db = JSON.parse(await fs.readFile(dbPath, "utf8"));
  db.drinks.push({
    id: "ghost-seed-drink",
    brand: "Ghost",
    name: "Ghost Seed",
    flavor: "Призрак",
    category: "energy",
    price: 100,
    priceHistory: [{ price: 100, ts: new Date().toISOString(), user: "seed" }],
  });
  db.drinks.push({
    id: "custom-user-drink",
    brand: "Custom",
    name: "Юзерский",
    flavor: "Ручной",
    category: "energy",
    price: 50,
    priceHistory: [{ price: 50, ts: new Date().toISOString(), user: "a" }],
  });
  await fs.writeFile(dbPath, JSON.stringify(db));
  await startServer();
  const st = await api("GET", "/api/state");
  assert.ok(
    !st.json.drinks.some((d) => d.id === "ghost-seed-drink"),
    "сид-сирота не вычищен"
  );
  assert.ok(
    st.json.drinks.some((d) => d.id === "custom-user-drink"),
    "юзерский напиток удалён"
  );
});

test("export: отдаёт attachment с полным дампом", async () => {
  const res = await fetch(BASE + "/api/export");
  assert.equal(res.status, 200);
  assert.match(
    res.headers.get("content-disposition") || "",
    /attachment; filename="tierdrinks-backup-/
  );
  const dump = await res.json();
  assert.ok(Array.isArray(dump.drinks) && Array.isArray(dump.log));
});

test("бэкап: дневная копия появляется после записи", async () => {
  await api("POST", "/api/price", {
    drinkId: "red-bull-original",
    price: 155,
    user: "a",
  });
  const files = await fs.readdir(path.join(dataDir, "backups"));
  assert.ok(
    files.some((f) => /^db-\d{4}-\d{2}-\d{2}\.json$/.test(f)),
    "нет дневного бэкапа"
  );
});
