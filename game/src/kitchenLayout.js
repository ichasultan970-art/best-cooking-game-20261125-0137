// Spatial kitchen floorplan, stations, counter collision boxes, and island-aware click routing.

import { CHEF_CONFIG, WORLD } from './config.js';
import { CRATE_ORDER, INGREDIENTS } from './recipes.js';

export const COUNTER_SURFACES = [
  { id: 'larder', x: 28, y: 162, w: 126, h: 562, kind: 'wood', label: 'COLD LARDER' },
  { id: 'prep_hearth', x: 214, y: 162, w: 1034, h: 108, kind: 'prep_hearth', label: 'PREP & HEARTH' },
  { id: 'island', x: 382, y: 414, w: 486, h: 112, kind: 'marble', label: 'ASSEMBLY ISLAND' },
  { id: 'utility', x: 214, y: 646, w: 180, h: 112, kind: 'wood', label: 'PREP & COMPOST' },
  { id: 'pass_counter', x: 822, y: 646, w: 426, h: 112, kind: 'brass_pass', label: 'SERVICE PASS' },
];

export function createKitchenStations() {
  const stations = [];

  CRATE_ORDER.forEach((ingKey, idx) => {
    const ing = INGREDIENTS[ingKey];
    const cy = 216 + idx * 90;
    stations.push({
      id: `crate_${ingKey}`,
      kind: 'crate',
      ingredient: ingKey,
      label: ing.short,
      keyHint: ing.keyHint,
      x: 91,
      y: cy,
      w: 94,
      h: 74,
      approach: { x: 184, y: cy },
      facing: { x: -1, y: 0 },
      item: null,
      plate: null,
      cooking: null,
      flash: 0,
    });
  });

  const topLine = [
    { id: 'chop_1', kind: 'chop', label: 'CHOP 1', x: 274, y: 216, w: 116, h: 82 },
    { id: 'chop_2', kind: 'chop', label: 'CHOP 2', x: 420, y: 216, w: 116, h: 82 },
    { id: 'skillet_1', kind: 'skillet', label: 'SKILLET 1', x: 594, y: 216, w: 116, h: 82 },
    { id: 'skillet_2', kind: 'skillet', label: 'SKILLET 2', x: 752, y: 216, w: 116, h: 82 },
    { id: 'pot_1', kind: 'pot', label: 'KETTLE', x: 938, y: 216, w: 116, h: 82 },
    { id: 'oven_1', kind: 'oven', label: 'HEARTH OVEN', x: 1126, y: 216, w: 132, h: 86 },
  ];

  for (const s of topLine) {
    stations.push({
      ...s,
      approach: { x: s.x, y: 306 },
      facing: { x: 0, y: -1 },
      item: null,
      plate: null,
      cooking: null,
      flash: 0,
    });
  }

  const islandLine = [
    { id: 'plate_stack', kind: 'plate_stack', label: 'PLATES', x: 436, y: 470, w: 84, h: 84, approach: { x: 436, y: 376 }, facing: { x: 0, y: 1 } },
    { id: 'assembly_1', kind: 'assembly', label: 'PLATE 1', x: 562, y: 470, w: 116, h: 88, approach: { x: 562, y: 376 }, facing: { x: 0, y: 1 } },
    { id: 'assembly_2', kind: 'assembly', label: 'PLATE 2', x: 698, y: 470, w: 116, h: 88, approach: { x: 698, y: 376 }, facing: { x: 0, y: 1 } },
    { id: 'staging_1', kind: 'staging', label: 'HOLD', x: 816, y: 470, w: 80, h: 82, approach: { x: 816, y: 376 }, facing: { x: 0, y: 1 } },
  ];

  for (const s of islandLine) {
    stations.push({
      ...s,
      item: null,
      plate: null,
      cooking: null,
      flash: 0,
    });
  }

  const bottomLine = [
    { id: 'trash', kind: 'trash', label: 'COMPOST', x: 236, y: 702, w: 86, h: 84, approach: { x: 236, y: 608 }, facing: { x: 0, y: 1 } },
    { id: 'staging_2', kind: 'staging', label: 'PREP MAT', x: 334, y: 702, w: 84, h: 84, approach: { x: 334, y: 608 }, facing: { x: 0, y: 1 } },
    { id: 'pass_1', kind: 'pass', label: 'PASS 1', x: 896, y: 702, w: 116, h: 88, approach: { x: 896, y: 608 }, facing: { x: 0, y: 1 } },
    { id: 'pass_2', kind: 'pass', label: 'PASS 2', x: 1036, y: 702, w: 116, h: 88, approach: { x: 1036, y: 608 }, facing: { x: 0, y: 1 } },
    { id: 'service_bell', kind: 'bell', label: 'SERVE!', x: 1178, y: 702, w: 96, h: 86, approach: { x: 1178, y: 608 }, facing: { x: 0, y: 1 } },
  ];

  for (const s of bottomLine) {
    stations.push({
      ...s,
      item: null,
      plate: null,
      cooking: null,
      flash: 0,
    });
  }

  return stations;
}

export function resolveChefCollision(nextX, nextY, radius = CHEF_CONFIG.radius) {
  let x = Math.max(WORLD.floorMarginX + radius, Math.min(WORLD.width - WORLD.floorMarginX - radius, nextX));
  let y = Math.max(WORLD.hudHeight + radius + 8, Math.min(WORLD.floorBottomY - radius, nextY));

  for (const box of COUNTER_SURFACES) {
    const closestX = Math.max(box.x, Math.min(x, box.x + box.w));
    const closestY = Math.max(box.y, Math.min(y, box.y + box.h));
    const dx = x - closestX;
    const dy = y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < radius * radius) {
      if (distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        x += (dx / dist) * push;
        y += (dy / dist) * push;
      } else {
        const leftPen = x - box.x;
        const rightPen = box.x + box.w - x;
        const topPen = y - box.y;
        const bottomPen = box.y + box.h - y;
        const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
        if (minPen === topPen) y = box.y - radius;
        else if (minPen === bottomPen) y = box.y + box.h + radius;
        else if (minPen === leftPen) x = box.x - radius;
        else x = box.x + box.w + radius;
      }
    }
  }
  return { x, y };
}

export function hitTestStation(worldX, worldY, stations) {
  for (const s of stations) {
    const pad = 8;
    if (
      worldX >= s.x - s.w / 2 - pad &&
      worldX <= s.x + s.w / 2 + pad &&
      worldY >= s.y - s.h / 2 - pad &&
      worldY <= s.y + s.h / 2 + pad
    ) {
      return s;
    }
  }
  return null;
}

export function findNearestStation(chefX, chefY, facingX, facingY, stations) {
  let best = null;
  let bestScore = Infinity;
  const maxDist = CHEF_CONFIG.interactRadius;

  for (const s of stations) {
    const dx = s.x - chefX;
    const dy = s.y - chefY;
    const dist = Math.hypot(dx, dy);
    if (dist > maxDist) continue;
    const dot = dist > 1 ? (dx / dist) * facingX + (dy / dist) * facingY : 1;
    const score = dist - dot * 22;
    if (score < bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

export function computeRouteWaypoints(startX, startY, targetX, targetY) {
  const islandTop = 382;
  const islandBottom = 556;
  const islandLeft = 352;
  const islandRight = 898;

  // Clear corner around left larder / top prep counter junction
  if (startX < 204 && startY < 285 && targetX > 210) {
    const rest = computeRouteWaypoints(184, 306, targetX, targetY);
    return [{ x: 184, y: 306 }, ...rest];
  }
  if (targetX < 204 && targetY < 285 && startX > 210) {
    return [{ x: 184, y: 306 }, { x: targetX, y: targetY }];
  }

  const crossesVertically =
    (startY < islandTop && targetY > islandBottom) || (startY > islandBottom && targetY < islandTop);
  const overlapsX =
    Math.min(startX, targetX) < islandRight && Math.max(startX, targetX) > islandLeft;

  if (crossesVertically && overlapsX) {
    const goLeft = startX + targetX < islandLeft + islandRight;
    const detourX = goLeft ? 286 : 936;
    const midY = 470;
    return [
      { x: detourX, y: startY < islandTop ? 350 : 582 },
      { x: detourX, y: midY },
      { x: targetX, y: targetY },
    ];
  }
  return [{ x: targetX, y: targetY }];
}
