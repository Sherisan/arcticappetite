// Turns the Figma exports in art/ into the game's components and assets.
//   node tools/import-art.mjs
// Files are recognised by their top-level layer name (Figma names exports by id), so re-exporting
// from Figma and re-running this is all an art update needs. Creatures need "tail", "body" and
// "flipper" layers; the ice shard a "core" layer; the background the six named layers.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ART = path.join(ROOT, 'art');
const SRC = path.join(ROOT, 'src');

/** Top-level layer name → what it becomes. wag = default swim-cycle ms (smaller creatures beat faster). */
const CREATURES = {
  'Krill':            { file: 'fish/KrillFish.tsx',         name: 'KrillFish',     wag: 360,  doc: 'TINY tier — krill. The ambient "food" swarm; also the level-0 legend entry.' },
  'Penguin':          { file: 'fish/PenguinFish.tsx',       name: 'PenguinFish',   wag: 520,  doc: 'SMALL tier — penguin, the player\'s starting form at 1.00x.' },
  'Seal':             { file: 'fish/SealFish.tsx',          name: 'SealFish',      wag: 700,  doc: 'MEDIUM tier — seal.' },
  'Polar Bear':       { file: 'fish/PolarBearFish.tsx',     name: 'PolarBearFish', wag: 900,  doc: 'LARGE tier — polar bear, swimming with its front paw paddling.' },
  'Orca':             { file: 'fish/OrcaFish.tsx',          name: 'OrcaFish',      wag: 1100, doc: 'PREDATOR tier — orca.' },
  'Ice Leviathan':    { file: 'fish/LeviathanFish.tsx',     name: 'LeviathanFish', wag: 1300, doc: 'MYTHIC tier — the Ice Leviathan.' },
  'Narwhal':          { file: 'creatures/Narwhal.tsx',      name: 'Narwhal',       wag: 1200, doc: 'Ambient decoration — narwhal.' },
  'Beluga':           { file: 'creatures/Beluga.tsx',       name: 'Beluga',        wag: 1400, doc: 'Ambient decoration — beluga.' },
  'Arctic Jellyfish': { file: 'creatures/Jellyfish.tsx',    name: 'Jellyfish',     wag: 900,  doc: 'Ambient decoration — arctic jellyfish, tentacles trailing.' },
};
const BACKGROUND_LAYERS = ['sky-glow', 'light-rays', 'ice-ceiling', 'far-seabed', 'near-seabed', 'particles'];

// ── SVG helpers ──────────────────────────────────────────────────────

/** The full `<g id="…">…</g>` element for an id, matching nested groups. */
function groupById(svg, id) {
  const open = svg.indexOf(`<g id="${id}"`);
  if (open < 0) return null;
  let depth = 0;
  const re = /<g\b[^>]*?(\/?)>|<\/g>/g;
  re.lastIndex = open;
  for (let m; (m = re.exec(svg)); ) {
    if (m[0] === '</g>') depth--;
    else if (!m[1]) depth++;
    if (depth === 0) return svg.slice(open, re.lastIndex);
  }
  throw new Error(`Unbalanced <g> for "${id}"`);
}

const rootId = (svg) => /<svg[^>]*>\s*<g id="([^"]+)"/.exec(svg)?.[1];
const defsOf = (svg) => /<defs>[\s\S]*<\/defs>/.exec(svg)?.[0] ?? '';

/** Rough bounding box of every path in a fragment (Figma exports absolute M/L/C/Q/H/V/Z). */
function bbox(fragment) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = (x, y) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  for (const [, d] of fragment.matchAll(/\sd="([^"]+)"/g)) {
    let x = 0, y = 0;
    for (const [, cmd, args] of d.matchAll(/([MLCQHVZ])([^MLCQHVZ]*)/gi)) {
      const n = (args.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number);
      const c = cmd.toUpperCase();
      if (c === 'H') n.forEach((v) => add((x = v), y));
      else if (c === 'V') n.forEach((v) => add(x, (y = v)));
      else for (let i = 0; i + 1 < n.length; i += 2) add((x = n[i]), (y = n[i + 1]));
    }
  }
  return { minX, minY, maxX, maxY };
}

/** SVG markup → JSX: camelCase attributes, ids made unique per instance via `${u}`, unused ids dropped. */
/** Ids the file actually references — the only ones worth keeping. */
const referencedIds = (svg) => new Set([...svg.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map((m) => m[1] ?? m[2]));

function toJsx(markup, classes, used) {
  return markup
    .replace(/<g id="([^"]+)"/g, (all, id) => (classes[id] ? `<g ${classes[id]}` : all))
    .replace(/\sid="([^"]+)"/g, (all, id) => (used.has(id) ? ` id={\`${id}\${u}\`}` : ''))
    .replace(/\s([a-zA-Z:-]+)="url\(#([^)]+)\)"/g, (_, a, id) => ` ${a}={\`url(#${id}\${u})\`}`)
    .replace(/\s(?:xlink:)?href="#([^"]+)"/g, (_, id) => ` href={\`#${id}\${u}\`}`)
    .replace(/\sxmlns(:xlink)?="[^"]*"/g, '')
    .replace(/\s([a-z]+(?:-[a-z]+)+)=/g, (_, a) => ` ${a.replace(/-([a-z])/g, (__, c) => c.toUpperCase())}=`);
}

const r = (v) => Math.round(v);

function creatureComponent(svg, spec, label) {
  const tail = bbox(groupById(svg, 'tail'));
  const flip = bbox(groupById(svg, 'flipper'));
  // Tail swings from where it meets the body (its right edge); the flipper from its top, near the front.
  const tailOrigin = `${r(tail.maxX)}px ${r((tail.minY + tail.maxY) / 2)}px`;
  const flipOrigin = `${r(flip.minX + (flip.maxX - flip.minX) * 0.65)}px ${r(flip.minY + 4)}px`;
  const viewBox = /viewBox="([^"]+)"/.exec(svg)[1];
  const used = referencedIds(svg);
  const body = toJsx(groupById(svg, label), {
    [label]: 'className="f-glide"',
    tail: `className="f-tail" style={{ transformOrigin: '${tailOrigin}' }}`,
    flipper: `className="f-pect" style={{ transformOrigin: '${flipOrigin}' }}`,
  }, used);
  return `// Generated by tools/import-art.mjs from the Figma export — re-run it instead of editing by hand.
import { useId } from 'react';
import { fishWrapperProps, type FishProps } from '${spec.file.startsWith('fish/') ? '.' : '../fish'}/FishProps';

/** ${spec.doc} */
export function ${spec.name}(props: FishProps) {
  const u = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <div {...fishWrapperProps(props, ${spec.wag})}>
      <svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" aria-label="${label}">
        ${toJsx(defsOf(svg), {}, used)}
        ${body}
      </svg>
    </div>
  );
}
`;
}

function mineComponent(svg, label) {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)[1];
  const used = referencedIds(svg);
  const body = toJsx(groupById(svg, label), { core: 'className="mine-light"' }, used);
  return `// Generated by tools/import-art.mjs from the Figma export — re-run it instead of editing by hand.
import { useId } from 'react';

/** Ice-shard hazard swimmer — touching it shatters the player's creature. The red core blinks. */
export function Mine({ width = 46 }: { width?: number }) {
  const u = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <svg viewBox="${viewBox}" width={width} className="mine" aria-label="ice shard">
      ${toJsx(defsOf(svg), {}, used)}
      ${body}
    </svg>
  );
}
`;
}

// ── Run ──────────────────────────────────────────────────────────────

const write = (rel, text) => {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
  console.log('  wrote', rel);
};

const files = fs.readdirSync(ART, { recursive: true }).filter((f) => f.endsWith('.svg')).map((f) => path.join(ART, f));
const found = new Set();
for (const file of files) {
  const svg = fs.readFileSync(file, 'utf8');
  const label = rootId(svg);
  found.add(label);
  if (CREATURES[label]) {
    write(path.join('src/components', CREATURES[label].file), creatureComponent(svg, CREATURES[label], label));
  } else if (label === 'Ice shard') {
    write('src/components/Mine.tsx', mineComponent(svg, label));
  } else if (label === 'Shatter') {
    fs.copyFileSync(file, path.join(SRC, 'assets/shatter.svg'));
    console.log('  wrote src/assets/shatter.svg');
  } else if (label === 'Background') {
    // One file per layer so each can move on its own; every file keeps the full <defs> and the frame clip.
    const open = /<svg[^>]*>/.exec(svg)[0];
    const frame = /<g id="Background"( clip-path="[^"]*")?/.exec(svg)[1] ?? '';
    for (const layer of BACKGROUND_LAYERS) {
      const g = groupById(svg, layer);
      if (!g) throw new Error(`Background is missing the "${layer}" layer`);
      write(`src/assets/bg/${layer}.svg`, `${open}\n<g${frame}>${g}</g>\n${defsOf(svg)}\n</svg>\n`);
    }
  } else if (label === 'ARCTIC APPETITE') {
    write('public/logo.svg', svg);
  } else if (label === 'App icon') {
    write('public/icon.svg', svg);
  } else if (label === 'Lobby thumbnail') {
    write('public/thumbnail.svg', svg);
  } else {
    console.warn(`  skipped ${path.relative(ROOT, file)} (top layer "${label}" isn't one the game uses)`);
  }
}
const missing = [...Object.keys(CREATURES), 'Ice shard', 'Shatter', 'Background'].filter((k) => !found.has(k));
if (missing.length) console.warn('  missing from art/:', missing.join(', '));
