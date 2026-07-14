// One-off catalog image fetcher (run locally, needs network).
//   node scripts/fetch-images.mjs          → fetch + match + download + write imageMap
//   node scripts/fetch-images.mjs --dry     → report matches only, no download
// Source: Open Food Facts (open data, direct CDN images). RU packaging preferred.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_DRINKS } from '../src/seedData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'data', 'images');
const MAP_PATH = path.join(ROOT, 'src', 'imageMap.json');
const DRY = process.argv.includes('--dry');
const UA = 'TierDrinks/0.1 (mlepetkov@gmail.com)';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
const norm = s =>
  String(s || '')
    .toLowerCase()
    .replace(/[а-яё]/g, ch => TRANSLIT[ch] ?? '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// flavor synonym groups (normalized latin). 'energy' intentionally excluded — too common.
const FLAVOR_GROUPS = {
  mango: ['mango', 'mangue'],
  peach: ['peach', 'peche', 'persik'],
  cherry: ['cherry', 'cerise', 'vishnya'],
  blueberry: ['blueberry', 'myrtille', 'chernika', 'blue edition'],
  cranberry: ['cranberry', 'klyukva'],
  watermelon: ['watermelon', 'pasteque', 'arbuz', 'red edition', 'sandia'],
  cactus: ['cactus', 'kaktus', 'kaktusfrucht', 'green edition'],
  tropical: ['tropical', 'tropic', 'tropich', 'yellow edition', 'tropiques'],
  mojito: ['mojito', 'mohito'],
  cola: ['cola', 'kola'],
  barberry: ['barberry', 'barbaris'],
  lychee: ['lychee', 'litchi', 'lichi'],
  passion: ['passion', 'maracuja', 'maracuya', 'marakuya', 'pipeline'],
  apple: ['apple', 'pomme', 'yabloko'],
  kiwi: ['kiwi', 'kivi'],
  pineapple: ['pineapple', 'ananas'],
  strawberry: ['strawberry', 'fraise', 'klubnika', 'rosa'],
  orange: ['orange', 'apelsin', 'sunrise', 'dreamsicle'],
  lemonade: ['lemonade', 'limonad'],
  coffee: ['coffee', 'kofe', 'mocha', 'moca', 'mocca', 'espresso', 'latte', 'java', 'bean'],
  tea: ['tea', 'chai'],
  caramel: ['caramel', 'karamel'],
  berry: ['berry', 'berries', 'yagod', 'wildberry', 'fruits rouges', 'pacific'],
  sugarfree: ['zero', 'sugarfree', 'sugar free', 'sans sucre', 'no sugar', 'bez sahar', 'ultra white', 'ultra'],
  storm: ['storm', 'shtorm'],
  original: ['original', 'classic', 'oridzhinal'],
};

// leading-boundary match: catches RU stems (yagod→yagodnyy) yet avoids
// substring false positives (' apple' is NOT inside ' pineapple').
function groupsOf(text) {
  const hay = ' ' + norm(text) + ' ';
  const hits = new Set();
  for (const [g, syns] of Object.entries(FLAVOR_GROUPS)) {
    if (syns.some(s => hay.includes(' ' + norm(s)))) hits.add(g);
  }
  return hits;
}

// coffee/tea are legit Monster lines (Java/Rehab) → not blacklisted; the
// brand-token guard in pickBest already rejects generic off-brand cans.
const BLACKLIST = /\b(gum|chewing|bar|barre|cookie|biscuit|snack|powder|syrup|sirop)\b/;

const BRANDS = [
  { name: 'Red Bull', tags: ['red-bull'], tok: ['red bull', 'redbull'] },
  { name: 'Monster', tags: ['monster-energy', 'monster'], tok: ['monster'] },
  { name: 'Adrenaline Rush', tags: ['adrenaline-rush', 'adrenaline'], tok: ['adrenaline'] },
  { name: 'Flash Up', tags: ['flash-up-energy', 'flash-up'], tok: ['flash'] },
  { name: 'Gorilla', tags: ['gorilla-energy', 'gorilla'], tok: ['gorilla'] },
  { name: 'Burn', tags: ['burn'], tok: ['burn'] },
  { name: 'Drive Me', tags: ['drive-me', 'drive'], tok: ['drive'] },
  { name: 'Tornado', tags: ['tornado-energy', 'tornado'], tok: ['tornado'] },
  { name: 'E-ON', tags: ['e-on', 'eon'], tok: ['eon', 'e on'] },
  { name: 'Jaguar', tags: ['jaguar'], tok: ['jaguar'] },
  { name: 'Volt', tags: ['volt'], tok: ['volt'] },
];
const TOKENS = Object.fromEntries(BRANDS.map(b => [b.name, b.tok]));

async function fetchJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      const text = await res.text();
      if (text.trimStart().startsWith('{')) return JSON.parse(text);
    } catch {
      /* retry */
    }
    await sleep(1500 + i * 1500);
  }
  return null;
}

async function brandCandidates(brand) {
  const pool = new Map(); // image_url → product_name
  for (const tag of brand.tags) {
    for (const country of ['&countries_tags=en:russia', '']) {
      const url = `https://world.openfoodfacts.org/api/v2/search?brands_tags=${tag}&fields=product_name,image_front_url,categories_tags&page_size=100${country}`;
      const j = await fetchJson(url);
      await sleep(1200);
      if (!j || !j.products) continue;
      for (const p of j.products) {
        if (!p.image_front_url || !p.product_name) continue;
        const hay = norm(`${p.product_name} ${(p.categories_tags || []).join(' ')}`);
        if (BLACKLIST.test(hay)) continue;
        if (!pool.has(p.image_front_url)) pool.set(p.image_front_url, p.product_name);
      }
      if (pool.size >= 60) break;
    }
  }
  return [...pool.entries()].map(([url, name]) => ({ url, name, groups: groupsOf(name) }));
}

function pickBest(drink, cands, tokens = []) {
  if (!cands.length) return null;
  const want = groupsOf(`${drink.name} ${drink.flavor}`);
  const wantFlavor = new Set([...want].filter(g => g !== 'original'));
  const scored = [];
  for (const c of cands) {
    const candFlavor = [...c.groups].filter(g => g !== 'original');
    if (wantFlavor.size) {
      const inter = [...wantFlavor].filter(g => c.groups.has(g));
      if (!inter.length) continue; // must share the wanted flavor
      const wrong = candFlavor.filter(g => !wantFlavor.has(g));
      const score = inter.length * 100 - wrong.length * 60 - c.name.length * 0.05;
      scored.push({ ...c, score, matched: inter });
    } else {
      // plain/original drink → require the candidate to actually be this brand
      // (has 'original' keyword OR the brand name in its title), avoid flavored cans.
      const brandOk = c.groups.has('original') || tokens.some(t => norm(c.name).includes(t));
      if (!brandOk || candFlavor.length) continue;
      const score = (c.groups.has('original') ? 30 : 0) + 10 - c.name.length * 0.05;
      scored.push({ ...c, score, matched: [] });
    }
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

async function download(url, dest) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 1000 && buf[0] === 0xff && buf[1] === 0xd8) {
          await fs.writeFile(dest, buf);
          return true;
        }
      }
    } catch {
      /* retry */
    }
    await sleep(800);
  }
  return false;
}

async function main() {
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  const byBrand = {};
  for (const b of BRANDS) {
    process.stderr.write(`\n[brand] ${b.name} … `);
    byBrand[b.name] = await brandCandidates(b);
    process.stderr.write(`${byBrand[b.name].length} candidates`);
  }

  const map = {};
  let ok = 0,
    miss = 0;
  console.log('\n\n=== MATCH REPORT ===');
  for (const d of SEED_DRINKS) {
    const id = norm(`${d.name} ${d.flavor}`).replace(/ /g, '-');
    const cands = byBrand[d.brand] || [];
    const best = pickBest(d, cands, TOKENS[d.brand] || []);
    const good = best && best.score > 0;
    const tag = good ? '✓' : '·';
    console.log(
      `${tag} ${(d.name + ' [' + d.flavor + ']').padEnd(42)} ${good ? '→ ' + best.name + ' (s' + best.score.toFixed(0) + (best.matched.length ? ', ' + best.matched.join('+') : '') + ')' : '— нет фото'}`,
    );
    if (good) {
      if (!DRY) {
        const dest = path.join(IMAGES_DIR, `${id}.jpg`);
        if (await download(best.url, dest)) {
          map[id] = `/images/${id}.jpg`;
          ok++;
          await sleep(300);
        } else {
          miss++;
        }
      } else {
        map[id] = `/images/${id}.jpg`;
        ok++;
      }
    } else {
      miss++;
    }
  }

  if (!DRY) await fs.writeFile(MAP_PATH, JSON.stringify(map, null, 2) + '\n');
  console.log(`\n=== DONE ${DRY ? '(dry)' : ''}: ${ok} matched, ${miss} missing ===`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
