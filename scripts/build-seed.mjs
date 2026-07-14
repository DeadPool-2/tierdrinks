// Resolve the full catalog (seedData + seedExtra + imageMap, with supersede)
// into a flat data/seed.json that the PHP backend loads. Run on the dev box.
//   node scripts/build-seed.mjs

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_DRINKS, BRAND_COLORS } from '../src/seedData.js';
import { tagOf } from '../src/flavors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const TR = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
const slug = s => String(s).toLowerCase().replace(/[а-яё]/g, c => TR[c] ?? '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const readJson = async (p, fb) => {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); } catch { return fb; }
};

const main = async () => {
  const imageMap = await readJson(path.join(ROOT, 'src', 'imageMap.json'), {});
  const extra = await readJson(path.join(ROOT, 'src', 'seedExtra.json'), []);
  const extraBrands = new Set(extra.map(d => d.brand));
  const seedList = [...SEED_DRINKS.filter(d => !extraBrands.has(d.brand)), ...extra];
  const ts = new Date().toISOString();

  const drinks = seedList.map(s => {
    const id = slug(`${s.name}-${s.flavor}`);
    const price = s.price ?? null;
    return {
      id,
      brand: s.brand,
      collection: s.collection ?? null,
      name: s.name,
      flavor: s.flavor,
      flavorTag: s.flavorTag || tagOf(`${s.name} ${s.flavor}`),
      category: s.category || 'energy',
      volume: s.volume ?? null,
      price,
      description: s.description || '',
      image: imageMap[id] ?? s.image ?? null,
      priceHistory: price != null ? [{ price, ts, user: 'seed' }] : [],
    };
  });

  const out = { drinks, brandColors: BRAND_COLORS };
  await fs.writeFile(path.join(ROOT, 'data', 'seed.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`seed.json: ${drinks.length} drinks, ${drinks.filter(d => d.image).length} с фото`);
};

main().catch(e => { console.error(e); process.exit(1); });
