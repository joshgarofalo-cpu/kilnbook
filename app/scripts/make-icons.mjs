// Draws the Home Screen icons (a white "K" on cobalt) as PNG files in public/.
// iPhone needs PNG icons; it ignores SVG. Run with: npm run icons
// No image libraries needed: it builds the PNG bytes directly.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x23, 0x47, 0xa6];
const FG = [0xff, 0xff, 0xff];

// The K, as three thick line segments on a 0..1 canvas. Kept inside the middle
// 60% so it survives Android's "maskable" circle crop.
const STROKE = 0.075;
const SEGMENTS = [
  [0.36, 0.28, 0.36, 0.72], // upright
  [0.39, 0.53, 0.64, 0.28], // upper arm
  [0.46, 0.46, 0.66, 0.72], // lower leg
];

function distToSegment(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function draw(size) {
  const SS = 4; // 4x4 samples per pixel for smooth edges
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // PNG row filter: none
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = (x + (sx + 0.5) / SS) / size, py = (y + (sy + 0.5) / SS) / size;
        if (SEGMENTS.some((s) => distToSegment(px, py, s) <= STROKE / 2)) hits++;
      }
      const a = hits / (SS * SS);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(BG[c] + (FG[c] - BG[c]) * a);
    }
  }
  return png(size, raw);
}

function png(size, raw) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
}

for (const size of [180, 192, 512]) {
  writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), draw(size));
  console.log(`public/icon-${size}.png`);
}
