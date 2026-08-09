import type { DungeonLevel, Direction, DungeonTile, Vec2 } from '../core/types';

// Blickrichtungsvektoren: 0=Nord(-y), 1=Ost(+x), 2=Süd(+y), 3=West(-x)
const DIR_VECTORS: Vec2[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

function rightOf(dir: Direction): Direction {
  return ((dir + 1) % 4) as Direction;
}
function behind(dir: Direction): Direction {
  return ((dir + 2) % 4) as Direction;
}
function leftOf(dir: Direction): Direction {
  return ((dir + 3) % 4) as Direction;
}

function stepFrom(pos: Vec2, dir: Direction): Vec2 {
  const v = DIR_VECTORS[dir];
  return { x: pos.x + v.x, y: pos.y + v.y };
}

function tileAt(level: DungeonLevel, pos: Vec2): DungeonTile | undefined {
  return level.tiles[pos.y]?.[pos.x];
}

function wallBetween(level: DungeonLevel, from: Vec2, dir: Direction): boolean {
  const tile = tileAt(level, from);
  if (!tile || tile.type === 'wall') return true;
  if (dir === 0) return tile.wallsN;
  if (dir === 1) return tile.wallsE;
  if (dir === 2) return tile.wallsS;
  return tile.wallsW;
}

function isOpen(level: DungeonLevel, pos: Vec2): boolean {
  const tile = tileAt(level, pos);
  return !!tile && tile.type !== 'wall';
}

/** Deterministisches Pseudo-Rauschen aus Koordinaten, für konsistente Steinmuster/Fackelplatzierung. */
function tileNoise(x: number, y: number, salt = 0): number {
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

/**
 * Zeichnet eine stimmungsvolle Ego-Perspektive im Stil klassischer Dungeon-Crawler:
 * Sichttiefe mit perspektivisch verkleinerten, strukturierten Wandsegmenten, Fackeln,
 * Steintextur und Türen.
 */
export function renderViewport(ctx: CanvasRenderingContext2D, level: DungeonLevel, pos: Vec2, facing: Direction) {
  const { width: cw, height: ch } = ctx.canvas;
  const time = performance.now() / 1000;
  const theme = level.themeColor || '#5a4a34';

  // Wand- und Bodenfarben deutlich unterscheidbar halten und leicht mit der Kampagnenfarbe einfärben.
  const wallFrontBase = mixHex('#6a5540', theme, 0.35);
  const wallLeftBase = mixHex('#4a3524', theme, 0.3);
  const wallRightBase = mixHex('#3a2a1a', theme, 0.3);
  const floorTop = mixHex('#3a4a48', theme, 0.2);
  const floorBottom = '#0a1210';

  ctx.fillStyle = '#050302';
  ctx.fillRect(0, 0, cw, ch);

  // Boden & Decke — bewusst kühler/grüner als die warmen Wände, damit sich der Boden klar abhebt.
  const horizon = ch * 0.5;
  const floorGrad = ctx.createLinearGradient(0, horizon, 0, ch);
  floorGrad.addColorStop(0, floorTop);
  floorGrad.addColorStop(1, floorBottom);
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, horizon, cw, ch - horizon);
  drawFlagstones(ctx, cw, horizon, ch);

  const ceilGrad = ctx.createLinearGradient(0, 0, 0, horizon);
  ceilGrad.addColorStop(0, '#020202');
  ceilGrad.addColorStop(1, '#160f09');
  ctx.fillStyle = ceilGrad;
  ctx.fillRect(0, 0, cw, horizon);
  drawCeilingBeams(ctx, cw, horizon);

  const depth = 5; // Sichtweite in Zellen
  const cx = cw / 2;

  // Von hinten nach vorne zeichnen; Türen und Wände blockieren die Sichtachse.
  let cell = pos;
  const cellsAhead: Vec2[] = [pos];
  for (let d = 1; d <= depth; d++) {
    if (wallBetween(level, cell, facing)) break;
    const prevTile = tileAt(level, cell);
    if (prevTile?.type === 'door' && !(cell.x === pos.x && cell.y === pos.y)) break;
    cell = stepFrom(cell, facing);
    cellsAhead.push(cell);
    if (tileAt(level, cell)?.type === 'door') break;
  }

  const scaleAt = (d: number) => 1 / (d + 1); // d=0 -> aktuelle Zelle
  const boxAt = (d: number) => {
    const s = scaleAt(d);
    const w = cw * 0.95 * s;
    const h = ch * 0.9 * s;
    return { left: cx - w / 2, right: cx + w / 2, top: (ch - h) / 2, bottom: (ch + h) / 2, w, h };
  };

  const torches: { x: number; y: number; r: number; alpha: number }[] = [];

  for (let d = depth; d >= 0; d--) {
    const here = cellsAhead[d];
    if (!here) continue;
    const box = boxAt(d);
    const nextBox = boxAt(d + 1);

    // Bodendekoration und Truhen auf dieser Zelle andeuten
    const decoAt = level.decorations.find((dec) => dec.position.x === here.x && dec.position.y === here.y);
    if (decoAt) drawFloorDecoration(ctx, box, decoAt.kind, d);
    const chestAt = level.chestSpawns.find((c) => !c.opened && c.position.x === here.x && c.position.y === here.y);
    if (chestAt) drawChest(ctx, box, d);

    const leftBlocked = wallBetween(level, here, leftOf(facing));
    const rightBlocked = wallBetween(level, here, rightOf(facing));
    const hereDoor = tileAt(level, here)?.type === 'door' && d > 0;

    if (leftBlocked) {
      ctx.fillStyle = shadeFor(d, wallLeftBase);
      drawWallQuad(ctx, nextBox.left, nextBox.top, nextBox.bottom, box.left, box.top, box.bottom, d);
      if (tileNoise(here.x, here.y, 1) > 0.66) {
        const tx = box.left + (box.left - nextBox.left) * 0.2;
        const ty = (box.top + box.bottom) / 2;
        drawTorch(ctx, tx, ty, box.h * 0.22, d, time);
        torches.push({ x: tx, y: ty, r: box.h * 0.35, alpha: 1 / (d + 1) });
      }
    }
    if (rightBlocked) {
      ctx.fillStyle = shadeFor(d, wallRightBase);
      drawWallQuad(ctx, nextBox.right, nextBox.top, nextBox.bottom, box.right, box.top, box.bottom, d);
      if (tileNoise(here.x, here.y, 2) > 0.66) {
        const tx = box.right + (box.right - nextBox.right) * 0.2;
        const ty = (box.top + box.bottom) / 2;
        drawTorch(ctx, tx, ty, box.h * 0.22, d, time);
        torches.push({ x: tx, y: ty, r: box.h * 0.35, alpha: 1 / (d + 1) });
      }
    }

    const frontBlocked = !hereDoor && wallBetween(level, here, facing);
    if (hereDoor) {
      const doorTile = tileAt(level, here);
      drawDoor(ctx, box, d, !!doorTile?.doorLocked);
    } else if (frontBlocked || (d === 0 && cellsAhead.length === 1)) {
      ctx.fillStyle = shadeFor(d, wallFrontBase);
      ctx.fillRect(box.left, box.top, box.w, box.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeRect(box.left, box.top, box.w, box.h);
      drawStoneBricks(ctx, box.left, box.top, box.w, box.h, here.x, here.y);
      if (tileNoise(here.x, here.y, 3) > 0.45) {
        const tx = box.left + box.w / 2;
        const ty = box.top + box.h * 0.32;
        drawTorch(ctx, tx, ty, box.h * 0.2, d, time);
        torches.push({ x: tx, y: ty, r: box.h * 0.4, alpha: 1 / (d + 1) });
      }
    }
  }

  // Fackelglühen additiv über die Szene legen (mit leichtem Flackern)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const glow of torches) {
    const flicker = 0.75 + 0.25 * Math.sin(time * 6 + glow.x * 0.05) * Math.sin(time * 3.3 + glow.y * 0.07);
    const g = ctx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, glow.r);
    g.addColorStop(0, `rgba(255,150,50,${0.35 * glow.alpha * flicker})`);
    g.addColorStop(1, 'rgba(255,150,50,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(glow.x, glow.y, glow.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Vignette
  const vignette = ctx.createRadialGradient(cx, ch * 0.5, ch * 0.25, cx, ch * 0.5, ch * 0.8);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, cw, ch);

  // Treppen-Hinweis auf aktuellem Feld
  const currentTile = tileAt(level, pos);
  if (currentTile?.type === 'stairsDown') {
    ctx.fillStyle = '#c9a24b';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 6;
    ctx.fillText('▼ Treppe nach unten', cx, ch - 20);
    ctx.shadowBlur = 0;
  } else if (currentTile?.type === 'door' && currentTile.doorLocked) {
    ctx.fillStyle = '#e0a848';
    ctx.font = 'bold 18px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 6;
    ctx.fillText('🔒 Verschlossene Tür', cx, ch - 20);
    ctx.shadowBlur = 0;
  }
}

function drawWallQuad(
  ctx: CanvasRenderingContext2D,
  farX: number, farTop: number, farBottom: number,
  nearX: number, nearTop: number, nearBottom: number,
  depth: number
) {
  ctx.beginPath();
  ctx.moveTo(farX, farTop);
  ctx.lineTo(nearX, nearTop);
  ctx.lineTo(nearX, nearBottom);
  ctx.lineTo(farX, farBottom);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.stroke();

  // Grobe Steinfugen auf der Seitenwand andeuten
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = shadeFor(depth + 1, '#000000');
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  const rows = 5;
  for (let i = 1; i < rows; i++) {
    const t = i / rows;
    const y1 = farTop + (farBottom - farTop) * t;
    const y2 = nearTop + (nearBottom - nearTop) * t;
    ctx.beginPath();
    ctx.moveTo(farX, y1);
    ctx.lineTo(nearX, y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Moosflecken und Risse für mehr Textur
  const minX = Math.min(farX, nearX);
  const maxX = Math.max(farX, nearX);
  const minY = Math.min(farTop, nearTop);
  const maxY = Math.max(farBottom, nearBottom);
  for (let i = 0; i < 3; i++) {
    const n = tileNoise(farX + i * 7, farTop + depth, 41 + i);
    if (n > 0.72) {
      const mx = minX + (maxX - minX) * tileNoise(i, depth, 43);
      const my = minY + (maxY - minY) * tileNoise(i, depth, 47);
      ctx.fillStyle = `rgba(60,110,60,${0.15 + (n - 0.72) * 0.6})`;
      ctx.beginPath();
      ctx.ellipse(mx, my, (maxX - minX) * 0.12, (maxY - minY) * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function shadeFor(depth: number, hex: string): string {
  const factor = Math.max(0.22, 1 - depth * 0.2);
  const n = parseInt(hex.slice(1), 16);
  const r = Math.floor(((n >> 16) & 255) * factor);
  const g = Math.floor(((n >> 8) & 255) * factor);
  const b = Math.floor((n & 255) * factor);
  return `rgb(${r},${g},${b})`;
}

function drawStoneBricks(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tx: number, ty: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const rows = 5;
  const rowH = h / rows;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = Math.max(1, w * 0.008);

  for (let r = 0; r < rows; r++) {
    const ry = y + r * rowH;
    const offset = r % 2 === 0 ? 0 : w * 0.08;
    const brickW = w * (0.16 + tileNoise(tx, ty + r, 5) * 0.03);
    ctx.beginPath();
    ctx.moveTo(x, ry);
    ctx.lineTo(x + w, ry);
    ctx.stroke();
    for (let bx = x - offset; bx < x + w; bx += brickW) {
      ctx.beginPath();
      ctx.moveTo(bx, ry);
      ctx.lineTo(bx, ry + rowH);
      ctx.stroke();
    }
    // Farbvariation, Bevel-Kanten und Moos je Stein für plastischeren Eindruck
    for (let bx = x - offset, i = 0; bx < x + w; bx += brickW, i++) {
      const n = tileNoise(tx + bx * 0.01, ty + r + i * 0.3, 7);
      if (n > 0.82) {
        ctx.fillStyle = `rgba(0,0,0,${0.15 + n * 0.15})`;
        ctx.fillRect(bx, ry, brickW, rowH);
      } else if (n < 0.1) {
        ctx.fillStyle = `rgba(255,240,220,${0.05})`;
        ctx.fillRect(bx, ry, brickW, rowH);
      }
      // Bevel: helle Oberkante, dunkle Unterkante je Stein (pseudo-3D-Relief)
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(bx, ry, brickW, Math.max(1, rowH * 0.12));
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(bx, ry + rowH - Math.max(1, rowH * 0.12), brickW, Math.max(1, rowH * 0.12));
      // Moos auf manchen Steinen
      const mossN = tileNoise(tx + bx * 0.02, ty - r, 13);
      if (mossN > 0.87) {
        ctx.fillStyle = `rgba(60,110,60,${0.25 + (mossN - 0.87) * 2})`;
        ctx.beginPath();
        ctx.ellipse(bx + brickW * 0.5, ry + rowH * 0.7, brickW * 0.4, rowH * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Risse: dünne, unregelmäßige Linien über mehrere Steinreihen
  if (tileNoise(tx, ty, 17) > 0.6) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = Math.max(1, w * 0.004);
    const startX = x + w * (0.2 + tileNoise(tx, ty, 19) * 0.6);
    let cxp = startX;
    let cyp = y;
    ctx.beginPath();
    ctx.moveTo(cxp, cyp);
    for (let s = 1; s <= 6; s++) {
      cxp += (tileNoise(tx + s, ty, 23) - 0.5) * w * 0.12;
      cyp = y + (h / 6) * s;
      ctx.lineTo(cxp, cyp);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawFlagstones(ctx: CanvasRenderingContext2D, cw: number, horizon: number, ch: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizon, cw, ch - horizon);
  ctx.clip();

  const rows = 10;
  const rowYs: number[] = [horizon];
  for (let i = 1; i <= rows; i++) {
    const t = i / rows;
    rowYs.push(horizon + (ch - horizon) * (t * t));
  }

  // Fliesen-Farbvarianz und Moosflecken je Reihe/Spalte
  const cols = 8;
  for (let r = 0; r < rows; r++) {
    const y0 = rowYs[r];
    const y1 = rowYs[r + 1];
    const colW = cw / cols;
    for (let c = 0; c < cols; c++) {
      const n = tileNoise(c, r, 31);
      if (n > 0.8) {
        ctx.fillStyle = `rgba(70,110,80,${0.12 + (n - 0.8) * 0.6})`;
        ctx.fillRect(c * colW, y0, colW, y1 - y0);
      } else if (n < 0.08) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(c * colW, y0, colW, y1 - y0);
      }
    }
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  for (const y of rowYs) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cw, y);
    ctx.stroke();
  }
  // Ein paar vertikale Fugen für Fliesenraster
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  for (let c = 1; c < cols; c++) {
    const x = (cw / cols) * c;
    ctx.beginPath();
    ctx.moveTo(x, horizon);
    ctx.lineTo(x, ch);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCeilingBeams(ctx: CanvasRenderingContext2D, cw: number, horizon: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = Math.max(2, cw * 0.012);
  const beams = 5;
  const cx = cw / 2;
  for (let i = 0; i <= beams; i++) {
    const t = i / beams - 0.5;
    ctx.beginPath();
    ctx.moveTo(cx + t * cw * 1.6, 0);
    ctx.lineTo(cx + t * cw * 0.3, horizon);
    ctx.stroke();
  }
  ctx.restore();
}

interface Box {
  left: number; right: number; top: number; bottom: number; w: number; h: number;
}

function drawDoor(ctx: CanvasRenderingContext2D, box: Box, depth: number, locked: boolean) {
  const frameColor = shadeFor(depth, '#4a3524');
  ctx.fillStyle = frameColor;
  ctx.fillRect(box.left, box.top, box.w, box.h);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeRect(box.left, box.top, box.w, box.h);
  drawStoneBricks(ctx, box.left, box.top, box.w, box.h, box.left, box.top);

  // Türblatt mittig, mit Bogenrahmen
  const doorW = box.w * 0.6;
  const doorH = box.h * 0.85;
  const doorX = box.left + (box.w - doorW) / 2;
  const doorY = box.bottom - doorH;

  ctx.fillStyle = shadeFor(depth, locked ? '#3a2418' : '#5a3f22');
  ctx.fillRect(doorX, doorY, doorW, doorH);
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = Math.max(1, box.w * 0.01);
  ctx.strokeRect(doorX, doorY, doorW, doorH);

  // Holzplanken
  ctx.save();
  ctx.beginPath();
  ctx.rect(doorX, doorY, doorW, doorH);
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  const planks = 4;
  for (let i = 1; i < planks; i++) {
    const px = doorX + (doorW / planks) * i;
    ctx.beginPath();
    ctx.moveTo(px, doorY);
    ctx.lineTo(px, doorY + doorH);
    ctx.stroke();
  }
  // Eisenbeschläge
  ctx.strokeStyle = shadeFor(depth, '#8a8a90');
  ctx.lineWidth = Math.max(1, box.w * 0.015);
  ctx.beginPath();
  ctx.moveTo(doorX, doorY + doorH * 0.3);
  ctx.lineTo(doorX + doorW, doorY + doorH * 0.3);
  ctx.moveTo(doorX, doorY + doorH * 0.7);
  ctx.lineTo(doorX + doorW, doorY + doorH * 0.7);
  ctx.stroke();
  ctx.restore();

  if (locked) {
    const lockR = box.w * 0.045;
    const lockX = doorX + doorW / 2;
    const lockY = doorY + doorH * 0.5;
    ctx.fillStyle = shadeFor(depth, '#c9a24b');
    ctx.beginPath();
    ctx.arc(lockX, lockY, lockR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(lockX - lockR * 0.35, lockY, lockR * 0.7, lockR * 1.4);
  }
}

/** Zeichnet eine Fackel mit Wandhalterung, deren Flamme mit der Zeit flackert. */
function drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, depth: number, time: number) {
  const flicker = 0.7 + 0.3 * Math.sin(time * 9 + x * 0.1);
  ctx.save();
  // Wandhalterung
  ctx.fillStyle = shadeFor(depth, '#2a1c10');
  ctx.fillRect(x - size * 0.08, y - size * 0.1, size * 0.16, size * 0.7);
  ctx.fillStyle = shadeFor(depth, '#3a3a3a');
  ctx.fillRect(x - size * 0.22, y - size * 0.15, size * 0.44, size * 0.12);
  // Flamme
  const flameH = size * (0.7 + flicker * 0.25);
  const grad = ctx.createRadialGradient(x, y - size * 0.5, 0, x, y - size * 0.5, flameH);
  grad.addColorStop(0, `rgba(255,235,150,${0.95})`);
  grad.addColorStop(0.5, `rgba(255,150,40,${0.85})`);
  grad.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.15);
  ctx.quadraticCurveTo(x + size * 0.32 * flicker, y - flameH * 0.5, x, y - size * 0.15 - flameH);
  ctx.quadraticCurveTo(x - size * 0.32 * flicker, y - flameH * 0.5, x, y - size * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Zeichnet ein Boden-Dekorationsobjekt (Skelett, Brunnen, Trümmer, Spinnweben, Knochen). */
function drawFloorDecoration(ctx: CanvasRenderingContext2D, box: Box, kind: string, depth: number) {
  const cx = box.left + box.w / 2;
  const cy = box.bottom - box.h * 0.08;
  const s = box.h * 0.28;
  ctx.save();

  if (kind === 'well') {
    ctx.fillStyle = shadeFor(depth, '#6a6a70');
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 0.7, s * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shadeFor(depth, '#0a1a2a');
    ctx.beginPath();
    ctx.ellipse(cx, cy - s * 0.05, s * 0.5, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.stroke();
  } else if (kind === 'skeleton') {
    ctx.strokeStyle = shadeFor(depth, '#d8d0b8');
    ctx.lineWidth = Math.max(1, s * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.5, cy);
    ctx.lineTo(cx + s * 0.5, cy - s * 0.06);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - s * 0.55, cy - s * 0.02, s * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = shadeFor(depth, '#d8d0b8');
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.1, cy - s * 0.2);
    ctx.lineTo(cx - s * 0.1, cy + s * 0.15);
    ctx.moveTo(cx + s * 0.15, cy - s * 0.22);
    ctx.lineTo(cx + s * 0.15, cy + s * 0.1);
    ctx.stroke();
  } else if (kind === 'bones') {
    ctx.strokeStyle = shadeFor(depth, '#c8c0a8');
    ctx.lineWidth = Math.max(1, s * 0.1);
    for (let i = 0; i < 3; i++) {
      const ox = (i - 1) * s * 0.35;
      ctx.beginPath();
      ctx.moveTo(cx + ox - s * 0.15, cy + s * 0.1);
      ctx.lineTo(cx + ox + s * 0.15, cy - s * 0.1);
      ctx.stroke();
    }
  } else if (kind === 'web') {
    ctx.strokeStyle = 'rgba(220,220,230,0.35)';
    ctx.lineWidth = 1;
    const wx = box.left + box.w * 0.08;
    const wy = box.top + box.h * 0.1;
    const wr = s * 0.9;
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI / 2 / 4) * i;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr);
      ctx.stroke();
    }
    for (let r = wr * 0.35; r < wr; r += wr * 0.3) {
      ctx.beginPath();
      ctx.arc(wx, wy, r, 0, Math.PI / 2);
      ctx.stroke();
    }
  } else {
    // rubble
    ctx.fillStyle = shadeFor(depth, '#5a5a5a');
    for (let i = 0; i < 4; i++) {
      const ox = (tileNoise(i, depth, 9) - 0.5) * s;
      const oy = tileNoise(i, depth, 11) * s * 0.2;
      ctx.beginPath();
      ctx.arc(cx + ox, cy - oy, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Zeichnet eine Schatztruhe am Boden. */
function drawChest(ctx: CanvasRenderingContext2D, box: Box, depth: number) {
  const w = box.h * 0.42;
  const h = box.h * 0.26;
  const x = box.left + box.w / 2 - w / 2;
  const y = box.bottom - h * 1.15;
  ctx.save();
  ctx.fillStyle = shadeFor(depth, '#6a4a24');
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = shadeFor(depth, '#8a6a34');
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y, w / 2, h * 0.35, 0, Math.PI, 0);
  ctx.fill();
  ctx.strokeRect(x, y - h * 0.35, w, h * 0.35);
  ctx.strokeStyle = shadeFor(depth, '#e0b84a');
  ctx.lineWidth = Math.max(1, w * 0.05);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y - h * 0.35);
  ctx.lineTo(x + w / 2, y + h);
  ctx.stroke();
  ctx.fillStyle = shadeFor(depth, '#e0b84a');
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h * 0.35, w * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function renderMinimap(ctx: CanvasRenderingContext2D, level: DungeonLevel, pos: Vec2, facing: Direction) {
  const { width: cw, height: ch } = ctx.canvas;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, cw, ch);

  const cellSize = Math.min(cw, ch) / Math.max(level.width, level.height);
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      const tile = level.tiles[y][x];
      if (!tile.discovered) continue;
      let color = '#8a7550';
      if (tile.type === 'wall') color = '#221a10';
      else if (tile.type === 'stairsDown') color = '#c9a24b';
      else if (tile.type === 'door') color = tile.doorLocked ? '#c04a3a' : '#a87840';
      ctx.fillStyle = color;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize - 0.5, cellSize - 0.5);
    }
  }

  // Unentdeckte Truhen auf bereits erkundetem Boden markieren
  for (const chest of level.chestSpawns) {
    if (chest.opened) continue;
    const tile = level.tiles[chest.position.y]?.[chest.position.x];
    if (!tile?.discovered) continue;
    ctx.fillStyle = '#e0b84a';
    ctx.fillRect(chest.position.x * cellSize + cellSize * 0.2, chest.position.y * cellSize + cellSize * 0.2, cellSize * 0.6, cellSize * 0.6);
  }

  // Spieler-Position
  ctx.fillStyle = '#e33';
  ctx.beginPath();
  ctx.arc(pos.x * cellSize + cellSize / 2, pos.y * cellSize + cellSize / 2, cellSize * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Blickrichtung
  const v = DIR_VECTORS[facing];
  ctx.strokeStyle = '#e33';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pos.x * cellSize + cellSize / 2, pos.y * cellSize + cellSize / 2);
  ctx.lineTo(pos.x * cellSize + cellSize / 2 + v.x * cellSize, pos.y * cellSize + cellSize / 2 + v.y * cellSize);
  ctx.stroke();
}

export function discoverAround(level: DungeonLevel, pos: Vec2, radius = 1) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const t = level.tiles[pos.y + dy]?.[pos.x + dx];
      if (t) t.discovered = true;
    }
  }
}

export function movePosition(pos: Vec2, facing: Direction, delta: 'forward' | 'backward' | 'left' | 'right'): Vec2 {
  let dir = facing;
  if (delta === 'backward') dir = behind(facing);
  else if (delta === 'left') dir = leftOf(facing);
  else if (delta === 'right') dir = rightOf(facing);
  return stepFrom(pos, dir);
}

export function canMove(level: DungeonLevel, pos: Vec2, facing: Direction, delta: 'forward' | 'backward' | 'left' | 'right'): boolean {
  let dir = facing;
  if (delta === 'backward') dir = behind(facing);
  else if (delta === 'left') dir = leftOf(facing);
  else if (delta === 'right') dir = rightOf(facing);
  if (wallBetween(level, pos, dir)) return false;
  const target = stepFrom(pos, dir);
  return isOpen(level, target);
}

export function turnLeft(facing: Direction): Direction {
  return leftOf(facing);
}
export function turnRight(facing: Direction): Direction {
  return rightOf(facing);
}
