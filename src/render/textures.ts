/**
 * Erzeugt kleine, nahtlos kachelbare Texturbilder (Wand, Boden, Decke) einmalig
 * auf Offscreen-Canvases. Diese werden im Viewport als CanvasPattern wiederholt,
 * sodass sich Wände und Böden aus vielen kleinen "Bildziegeln" zusammensetzen,
 * statt live pro Frame gezeichnet zu werden — schneller und realistischer.
 */

const TILE_SIZE = 128;

function noise2(x: number, y: number, salt = 0): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function mixHex(a: string, b: string, t: number): string {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const ar = (na >> 16) & 255, ag = (na >> 8) & 255, ab = na & 255;
  const br = (nb >> 16) & 255, bg = (nb >> 8) & 255, bb = nb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b2).toString(16).slice(1)}`;
}

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

/** Baut eine Kachel aus 4 kleinen Steinblöcken (2x2), jeder mit eigener Farbvariation, Fugen, Bevel, gelegentlich Moos/Riss. */
function buildStoneTile(baseHex: string): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE_SIZE);
  const blocks = 4; // 4x4 kleine Steine pro Kachel
  const bw = TILE_SIZE / blocks;

  for (let ry = 0; ry < blocks; ry++) {
    for (let rx = 0; rx < blocks; rx++) {
      const n = noise2(rx, ry, 3);
      const shade = 0.82 + n * 0.36;
      const [r, g, b] = hexToRgb(baseHex);
      ctx.fillStyle = `rgb(${Math.min(255, r * shade) | 0},${Math.min(255, g * shade) | 0},${Math.min(255, b * shade) | 0})`;
      const x = rx * bw;
      const y = ry * bw;
      ctx.fillRect(x, y, bw, bw);

      // Bevel: helle Oberkante / dunkle Unterkante für plastisches Relief
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(x, y, bw, Math.max(1, bw * 0.14));
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x, y + bw - Math.max(1, bw * 0.14), bw, Math.max(1, bw * 0.14));
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(x + bw - Math.max(1, bw * 0.08), y, Math.max(1, bw * 0.08), bw);

      // Fuge
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = Math.max(1, bw * 0.03);
      ctx.strokeRect(x, y, bw, bw);

      // Moos gelegentlich
      const mossN = noise2(rx, ry, 13);
      if (mossN > 0.8) {
        ctx.fillStyle = `rgba(58,104,58,${0.2 + (mossN - 0.8) * 2})`;
        ctx.beginPath();
        ctx.ellipse(x + bw * 0.5, y + bw * 0.72, bw * 0.4, bw * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Riss gelegentlich
      if (noise2(rx, ry, 19) > 0.85) {
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + bw * 0.2, y);
        ctx.lineTo(x + bw * 0.5, y + bw * 0.5);
        ctx.lineTo(x + bw * 0.35, y + bw);
        ctx.stroke();
      }
    }
  }
  return canvas;
}

/** Baut eine Bodenkachel aus 3x3 Fliesen mit Fugen, Farbvarianz und gelegentlichem Moos/Rissen. */
function buildFloorTile(baseHex: string): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE_SIZE);
  const tiles = 3;
  const tw = TILE_SIZE / tiles;
  const [r, g, b] = hexToRgb(baseHex);

  for (let ry = 0; ry < tiles; ry++) {
    for (let rx = 0; rx < tiles; rx++) {
      const n = noise2(rx + 50, ry + 50, 7);
      const shade = 0.78 + n * 0.4;
      ctx.fillStyle = `rgb(${Math.min(255, r * shade) | 0},${Math.min(255, g * shade) | 0},${Math.min(255, b * shade) | 0})`;
      const x = rx * tw;
      const y = ry * tw;
      ctx.fillRect(x, y, tw, tw);

      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x, y, tw, Math.max(1, tw * 0.1));
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x, y + tw - Math.max(1, tw * 0.1), tw, Math.max(1, tw * 0.1));

      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = Math.max(1, tw * 0.035);
      ctx.strokeRect(x, y, tw, tw);

      const mossN = noise2(rx + 50, ry + 50, 23);
      if (mossN > 0.78) {
        ctx.fillStyle = `rgba(50,90,60,${0.18 + (mossN - 0.78) * 1.8})`;
        ctx.beginPath();
        ctx.ellipse(x + tw * 0.5, y + tw * 0.5, tw * 0.42, tw * 0.3, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (noise2(rx + 50, ry + 50, 29) > 0.88) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(x + tw * (0.3 + noise2(rx, ry, 31) * 0.4), y + tw * (0.3 + noise2(rx, ry, 37) * 0.4), tw * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  return canvas;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const wallCache = new Map<string, HTMLCanvasElement>();
const floorCache = new Map<string, HTMLCanvasElement>();
const ceilingCache = new Map<string, HTMLCanvasElement>();

export function getWallTile(theme: string): HTMLCanvasElement {
  let tile = wallCache.get(theme);
  if (!tile) {
    tile = buildStoneTile(mixHex('#8a7355', theme, 0.4));
    wallCache.set(theme, tile);
  }
  return tile;
}

export function getFloorTile(theme: string): HTMLCanvasElement {
  let tile = floorCache.get(theme);
  if (!tile) {
    tile = buildFloorTile(mixHex('#4a6a5c', theme, 0.25));
    floorCache.set(theme, tile);
  }
  return tile;
}

export function getCeilingTile(theme: string): HTMLCanvasElement {
  let tile = ceilingCache.get(theme);
  if (!tile) {
    tile = buildStoneTile(mixHex('#3a2e22', theme, 0.3));
    ceilingCache.set(theme, tile);
  }
  return tile;
}

export const TEXTURE_TILE_SIZE = TILE_SIZE;
