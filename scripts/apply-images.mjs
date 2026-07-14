// Download + validate official can renders found by the workflow, then merge
// them into src/imageMap.json (overwriting only the ids we fetched).
//   node scripts/apply-images.mjs <pairs.json>
// pairs.json = [{ id, url }, ...]

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'data', 'images');
const MAP_PATH = path.join(ROOT, 'src', 'imageMap.json');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

const sniff = buf => {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
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
    } catch {
      /* retry */
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return null;
}

async function main() {
  const pairs = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
  const map = JSON.parse(await fs.readFile(MAP_PATH, 'utf8').catch(() => '{}'));
  let ok = 0,
    fail = 0;
  for (const p of pairs) {
    if (!p.url) {
      console.log(`·  ${p.id.padEnd(44)} — нет url`);
      fail++;
      continue;
    }
    const r = await download(p.url);
    if (!r) {
      console.log(`✗  ${p.id.padEnd(44)} — не скачалось/мелкое`);
      fail++;
      continue;
    }
    const rel = `/images/${p.id}.${r.ext}`;
    await fs.writeFile(path.join(IMAGES_DIR, `${p.id}.${r.ext}`), r.buf);
    // if we wrote a non-jpg, drop a stale .jpg from a previous source
    if (r.ext !== 'jpg') await fs.rm(path.join(IMAGES_DIR, `${p.id}.jpg`)).catch(() => {});
    map[p.id] = rel;
    ok++;
    console.log(`✓  ${p.id.padEnd(44)} → ${rel} (${Math.round(r.buf.length / 1024)}kb)`);
  }
  await fs.writeFile(MAP_PATH, JSON.stringify(map, null, 2) + '\n');
  console.log(`\n=== ${ok} применено, ${fail} пропущено ===`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
