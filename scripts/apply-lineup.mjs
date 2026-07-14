// Consume the ru-brand-lineups workflow output → write src/seedExtra.json
// (new deduped flavors) + download their official renders into imageMap.
//   node scripts/apply-lineup.mjs <workflow-output.json>
// input = [{ brand, items: [{ name, flavor, collection, imageUrl, ... }] }]

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_DRINKS } from '../src/seedData.js';
import { tagOf } from '../src/flavors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'data', 'images');
const MAP_PATH = path.join(ROOT, 'src', 'imageMap.json');
const EXTRA_PATH = path.join(ROOT, 'src', 'seedExtra.json');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

const TR = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
const slug = s => String(s).toLowerCase().replace(/[а-яё]/g, c => TR[c] ?? '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const key = d => `${d.brand}|${d.name}|${d.flavor}`;

const sniff = buf => {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
};
async function download(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' }, redirect: 'follow' });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const ext = sniff(buf);
        if (ext && buf.length >= 10000) return { buf, ext };
      }
    } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 400));
  }
  return null;
}

// per-brand default price = first seed price for that brand, else 100
const brandPrice = {};
for (const d of SEED_DRINKS) if (d.price && brandPrice[d.brand] == null) brandPrice[d.brand] = d.price;

async function main() {
  const data = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
  const seen = new Set(SEED_DRINKS.map(key));
  const extra = [];
  const pairs = [];
  let dupes = 0;

  for (const brandRes of data) {
    for (const it of brandRes.items || []) {
      const name = String(it.name || '').trim();
      const flavor = String(it.flavor || '').trim();
      if (!name) continue;
      const brand = brandRes.brand;
      const k = `${brand}|${name}|${flavor}`;
      if (seen.has(k)) { dupes++; continue; }
      seen.add(k);
      const id = slug(`${name}-${flavor}`);
      extra.push({
        brand,
        collection: it.collection ? String(it.collection).slice(0, 40) : null,
        name,
        flavor,
        flavorTag: tagOf(`${name} ${flavor}`),
        category: 'energy',
        volume: null,
        price: brandPrice[brand] || 100,
        description: '',
        image: null,
      });
      if (it.imageUrl) pairs.push({ id, url: it.imageUrl });
    }
  }

  // download images
  const map = JSON.parse(await fs.readFile(MAP_PATH, 'utf8').catch(() => '{}'));
  let ok = 0, fail = 0;
  for (const p of pairs) {
    const r = await download(p.url);
    if (!r) { console.log(`✗ ${p.id}`); fail++; continue; }
    await fs.writeFile(path.join(IMAGES_DIR, `${p.id}.${r.ext}`), r.buf);
    if (r.ext !== 'jpg') await fs.rm(path.join(IMAGES_DIR, `${p.id}.jpg`)).catch(() => {});
    map[p.id] = `/images/${p.id}.${r.ext}`;
    ok++;
    console.log(`✓ ${p.id} (${Math.round(r.buf.length / 1024)}kb)`);
  }

  await fs.writeFile(EXTRA_PATH, JSON.stringify(extra, null, 2) + '\n');
  await fs.writeFile(MAP_PATH, JSON.stringify(map, null, 2) + '\n');
  console.log(`\n=== +${extra.length} новых SKU (${dupes} дублей пропущено), фото: ${ok} ок / ${fail} мимо ===`);
}

main().catch(e => { console.error(e); process.exit(1); });
