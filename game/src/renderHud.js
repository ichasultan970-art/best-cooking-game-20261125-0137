// HUD renderer: top Brass Order Board, Shift Timer & score panel, Title, Pause, and Summary screens.

import { MODES, PALETTE, WORLD } from './config.js';
import { drawMiniIcon } from './foodArt.js';
import { ALL_RECIPE_LIST, getComponentSourceChain, INGREDIENTS } from './recipes.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_SUMMARY = 'summary';

function formatTimer(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getStationBadgeColor(stepKey) {
  if (stepKey === 'chop') return '#54b96b';
  if (stepKey === 'skillet') return '#ea7a36';
  if (stepKey === 'pot') return '#d44939';
  if (stepKey === 'oven') return '#c97b3e';
  return '#7a6759';
}

function drawOrderTicket(ctx, ticket, x, y, w, h, isPinned, state) {
  ctx.save();
  const urgent = ticket.remaining <= 12;
  const warn = ticket.remaining <= 22;

  // Clip shadow
  ctx.fillStyle = 'rgba(10, 6, 4, 0.38)';
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 4, w, h, 8);
  ctx.fill();

  // Ticket paper
  ctx.fillStyle = ticket.vip ? '#fff6dc' : PALETTE.creamTicket;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();

  ctx.strokeStyle = isPinned ? PALETTE.brassBright : ticket.vip ? '#d89b22' : '#c6b393';
  ctx.lineWidth = isPinned ? 3 : 1.5;
  ctx.stroke();

  // Top metallic clip tab
  ctx.fillStyle = ticket.vip ? '#d99e26' : '#807060';
  ctx.beginPath();
  ctx.roundRect(x + w / 2 - 18, y - 5, 36, 9, 4);
  ctx.fill();

  // Ticket header bar
  ctx.fillStyle = ticket.vip ? '#d48d1a' : urgent ? '#b73229' : '#3a271c';
  ctx.beginPath();
  ctx.roundRect(x + 4, y + 6, w - 8, 22, 5);
  ctx.fill();

  ctx.fillStyle = '#fff9ee';
  ctx.font = '800 10.5px "Liberation Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(ticket.vip ? `★ VIP #${ticket.number}` : `#${ticket.number}`, x + 10, y + 17.5);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffe58d';
  ctx.fillText(`$${ticket.basePrice}`, x + w - 10, y + 17.5);

  // Dish Title
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '800 11.5px "Liberation Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(ticket.name, x + 9, y + 40);

  // Check if any plate on island/pass/hands already holds components for this recipe
  const matchingPlates = [];
  if (state.chef.heldPlate) matchingPlates.push(state.chef.heldPlate);
  for (const st of state.stations) {
    if (st.plate) matchingPlates.push(st.plate);
  }
  const bestPlate = matchingPlates
    .filter((p) => p.items.every((it) => ticket.components.includes(it)))
    .sort((a, b) => b.items.length - a.items.length)[0];

  // Component icons with small prep badges
  const count = ticket.components.length;
  const spacing = count >= 4 ? 40 : 50;
  const startX = x + (w - (count - 1) * spacing) / 2;
  ticket.components.forEach((compKey, idx) => {
    const cx = startX + idx * spacing;
    const cy = y + 71;
    const plated = Boolean(bestPlate && bestPlate.items.includes(compKey));

    ctx.fillStyle = plated ? '#d9f7e3' : '#efe3cd';
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = plated ? PALETTE.emerald : '#cdb998';
    ctx.lineWidth = plated ? 2 : 1.2;
    ctx.stroke();

    drawMiniIcon(ctx, compKey, cx, cy, 22);

    // Tiny station badge dot at bottom right of icon
    const chain = getComponentSourceChain(compKey);
    const stationStep = chain[chain.length - 1];
    ctx.fillStyle = getStationBadgeColor(stationStep);
    ctx.beginPath();
    ctx.arc(cx + 12, cy + 12, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff9ee';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Countdown bar & seconds text
  const ratio = Math.max(0, Math.min(1, ticket.remaining / ticket.maxTime));
  const barColor = urgent ? PALETTE.crimson : warn ? PALETTE.amber : PALETTE.emerald;
  ctx.fillStyle = '#dfcfb4';
  ctx.beginPath();
  ctx.roundRect(x + 8, y + h - 18, w - 46, 10, 5);
  ctx.fill();

  ctx.fillStyle = barColor;
  ctx.beginPath();
  ctx.roundRect(x + 8, y + h - 18, Math.max(6, (w - 46) * ratio), 10, 5);
  ctx.fill();

  ctx.fillStyle = urgent ? PALETTE.crimson : PALETTE.ink;
  ctx.font = '800 11px "Liberation Sans", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.ceil(ticket.remaining)}s`, x + w - 9, y + h - 12.5);

  ctx.restore();
}

function drawTopOrderRail(ctx, state, audioMuted) {
  ctx.save();
  // Walnut & brass top bar
  const bg = ctx.createLinearGradient(0, 0, 0, WORLD.hudHeight);
  bg.addColorStop(0, '#2c1d15');
  bg.addColorStop(1, '#1c120d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WORLD.width, WORLD.hudHeight);

  // Hammered brass rail strip
  ctx.fillStyle = PALETTE.brassDeep;
  ctx.fillRect(0, WORLD.hudHeight - 4, WORLD.width, 4);
  ctx.fillStyle = PALETTE.brassBright;
  ctx.fillRect(14, 7, 928, 3);

  // Up to 5 order tickets
  for (let i = 0; i < state.orders.length && i < 5; i += 1) {
    const ticket = state.orders[i];
    drawOrderTicket(
      ctx,
      ticket,
      16 + i * 184,
      14,
      176,
      120,
      ticket.id === state.pinnedOrderId,
      state,
    );
  }

  if (state.orders.length === 0) {
    ctx.fillStyle = 'rgba(255, 240, 210, 0.65)';
    ctx.font = '700 15px "Liberation Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT TICKET ARRIVING...', 460, 74);
  }

  // Right-hand Shift Timer & Score Module
  const px = 954;
  const py = 10;
  const pw = 312;
  const ph = 124;

  ctx.fillStyle = '#251811';
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 10);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brassBright;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Wave pill
  ctx.fillStyle = '#472f21';
  ctx.beginPath();
  ctx.roundRect(px + 10, py + 8, 178, 22, 11);
  ctx.fill();
  ctx.fillStyle = '#ffd573';
  ctx.font = '800 10.5px "Liberation Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`WAVE ${state.waveIndex} · ${state.waveName}`, px + 99, py + 19.5);

  // Prominent Shift Timer
  const urgentClock = state.timeLeft <= 25;
  ctx.fillStyle = urgentClock ? '#ff6958' : '#fff5df';
  ctx.font = '900 38px "Liberation Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(formatTimer(state.timeLeft), px + 14, py + 62);

  // Served + Combo pills
  ctx.fillStyle = '#75e39e';
  ctx.font = '800 12px "Liberation Sans", sans-serif';
  ctx.fillText(`SERVED: ${state.servedCount}`, px + 14, py + 98);

  if (state.combo > 1) {
    ctx.fillStyle = '#ff9d3b';
    ctx.beginPath();
    ctx.roundRect(px + 104, py + 88, 76, 20, 10);
    ctx.fill();
    ctx.fillStyle = '#24150d';
    ctx.font = '900 11px "Liberation Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`×${state.combo} STREAK`, px + 142, py + 98.5);
  }

  // Cash Score box
  ctx.fillStyle = '#18100c';
  ctx.beginPath();
  ctx.roundRect(px + 196, py + 34, 106, 52, 8);
  ctx.fill();
  ctx.strokeStyle = '#5f432c';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = '#b99f83';
  ctx.font = '700 10px "Liberation Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EARNINGS', px + 249, py + 47);

  ctx.fillStyle = '#ffe169';
  ctx.font = '900 24px "Liberation Sans", sans-serif';
  ctx.fillText(`$${state.score}`, px + 249, py + 70);

  // Mute [M] and Pause [P] buttons
  const btnSpecs = [
    { x: px + 196, y: py + 94, w: 49, h: 22, label: audioMuted ? 'MUTE' : 'SFX' },
    { x: px + 253, y: py + 94, w: 49, h: 22, label: 'PAUSE' },
  ];
  for (const b of btnSpecs) {
    ctx.fillStyle = '#3d2a1f';
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#8b663f';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#f8e9d0';
    ctx.font = '800 10px "Liberation Sans", sans-serif';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 0.5);
  }

  ctx.restore();
}

function drawBottomLegend(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(22, 14, 10, 0.86)';
  ctx.beginPath();
  ctx.roundRect(384, WORLD.height - 24, 512, 20, 10);
  ctx.fill();
  ctx.fillStyle = '#dfd0bc';
  ctx.font = '700 10.5px "Liberation Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    'WASD / Click Station: Route  •  Space / Click: Chop, Sear & Plate  •  Shift: Dash  •  Bell: Serve',
    WORLD.width / 2,
    WORLD.height - 13.5,
  );
  ctx.restore();
}

function drawTitleOverlay(ctx, selectedModeId, bestScore) {
  ctx.save();
  ctx.fillStyle = 'rgba(18, 11, 7, 0.68)';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  const cw = 720;
  const ch = 468;
  const cx = (WORLD.width - cw) / 2;
  const cy = (WORLD.height - ch) / 2 + 12;

  ctx.fillStyle = '#241710';
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brassBright;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffd573';
  ctx.font = '800 13px "Liberation Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ORIGINAL HEARTH BISTRO KITCHEN GAME', WORLD.width / 2, cy + 36);

  // Decorative culinary icons beside title
  drawMiniIcon(ctx, 'seared_steak', cx + 112, cy + 78, 36);
  drawMiniIcon(ctx, 'baked_flatbread', cx + cw - 112, cy + 78, 36);

  ctx.fillStyle = '#fff5e0';
  ctx.font = '900 54px "Liberation Sans", sans-serif';
  ctx.fillText('EMBER & PASS', WORLD.width / 2, cy + 88);

  ctx.fillStyle = '#d8c3a5';
  ctx.font = '600 14px "Liberation Sans", sans-serif';
  ctx.fillText('Chop fresh prep, nail the golden sear sweet spot, plate dishes, and ring the pass bell.', WORLD.width / 2, cy + 126);

  // Mode selector cards
  const modes = [MODES.standard, MODES.rush];
  modes.forEach((m, idx) => {
    const mx = cx + 98 + idx * 272;
    const my = cy + 158;
    const mw = 252;
    const mh = 72;
    const active = selectedModeId === m.id;
    ctx.fillStyle = active ? '#4a311e' : '#312016';
    ctx.beginPath();
    ctx.roundRect(mx, my, mw, mh, 12);
    ctx.fill();
    ctx.strokeStyle = active ? PALETTE.brassBright : '#6e5038';
    ctx.lineWidth = active ? 2.6 : 1.4;
    ctx.stroke();

    ctx.fillStyle = active ? '#ffe285' : '#f2dfc2';
    ctx.font = '800 16px "Liberation Sans", sans-serif';
    ctx.fillText(m.label, mx + mw / 2, my + 28);
    ctx.fillStyle = '#cbb395';
    ctx.font = '600 12px "Liberation Sans", sans-serif';
    ctx.fillText(m.subtitle, mx + mw / 2, my + 50);
  });

  // Compact visual workflow strip
  ctx.fillStyle = '#1b110c';
  ctx.beginPath();
  ctx.roundRect(cx + 42, cy + 252, cw - 84, 92, 12);
  ctx.fill();

  const steps = [
    ['1. LARDER', 'WASD / Keys 1–6', '#e1573b'],
    ['2. CHOP & HEARTH', 'Space / Sweet Spot', '#f2b84b'],
    ['3. PLATE ISLAND', 'Combine Recipes', '#55c67a'],
    ['4. RING BELL', 'Serve for Combos!', '#64b8ff'],
  ];
  steps.forEach(([title, sub, col], i) => {
    const sx = cx + 124 + i * 158;
    ctx.fillStyle = col;
    ctx.font = '800 12.5px "Liberation Sans", sans-serif';
    ctx.fillText(title, sx, cy + 285);
    ctx.fillStyle = '#dfd0bc';
    ctx.font = '600 11.5px "Liberation Sans", sans-serif';
    ctx.fillText(sub, sx, cy + 312);
  });

  // Start Service button
  const bx = WORLD.width / 2 - 140;
  const by = cy + 368;
  ctx.fillStyle = PALETTE.emerald;
  ctx.beginPath();
  ctx.roundRect(bx, by, 280, 56, 28);
  ctx.fill();
  ctx.strokeStyle = '#c4ffd8';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 20px "Liberation Sans", sans-serif';
  ctx.fillText('START SERVICE  [SPACE]', WORLD.width / 2, by + 29);

  if (bestScore > 0) {
    ctx.fillStyle = '#ffd573';
    ctx.font = '800 13px "Liberation Sans", sans-serif';
    ctx.fillText(`PERSONAL BEST: $${bestScore}`, WORLD.width / 2, cy + 446);
  }
  ctx.restore();
}

function drawPausedOverlay(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(18, 11, 7, 0.78)';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  const cw = 720;
  const ch = 468;
  const cx = (WORLD.width - cw) / 2;
  const cy = (WORLD.height - ch) / 2;

  ctx.fillStyle = '#251811';
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brassBright;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#fff5e0';
  ctx.font = '900 32px "Liberation Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SERVICE PAUSED — RECIPE BOOK', WORLD.width / 2, cy + 44);

  ALL_RECIPE_LIST.forEach((recipe, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const rx = cx + 32 + col * 336;
    const ry = cy + 78 + row * 98;
    ctx.fillStyle = '#332218';
    ctx.beginPath();
    ctx.roundRect(rx, ry, 318, 84, 10);
    ctx.fill();
    ctx.fillStyle = '#ffe182';
    ctx.font = '800 13px "Liberation Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${recipe.shortName} ($${recipe.price})`, rx + 14, ry + 22);

    recipe.components.forEach((comp, cIdx) => {
      const ix = rx + 34 + cIdx * 70;
      const iy = ry + 54;
      drawMiniIcon(ctx, comp, ix, iy, 22);
      ctx.fillStyle = '#e7d8c2';
      ctx.font = '600 9.5px "Liberation Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(comp.replace('_', ' '), ix, iy + 20);
    });
  });

  // Buttons
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.emerald;
  ctx.beginPath();
  ctx.roundRect(WORLD.width / 2 - 220, cy + 392, 200, 48, 24);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 16px "Liberation Sans", sans-serif';
  ctx.fillText('RESUME [SPACE]', WORLD.width / 2 - 120, cy + 417);

  ctx.fillStyle = '#9e4730';
  ctx.beginPath();
  ctx.roundRect(WORLD.width / 2 + 20, cy + 392, 200, 48, 24);
  ctx.fill();
  ctx.fillStyle = '#fff3e2';
  ctx.fillText('RESTART SHIFT', WORLD.width / 2 + 120, cy + 417);
  ctx.restore();
}

function drawSummaryOverlay(ctx, summary, bestScore) {
  ctx.save();
  ctx.fillStyle = 'rgba(18, 11, 7, 0.76)';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  const cw = 620;
  const ch = 450;
  const cx = (WORLD.width - cw) / 2;
  const cy = (WORLD.height - ch) / 2 + 8;

  ctx.fillStyle = '#251811';
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brassBright;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffd573';
  ctx.font = '800 13px "Liberation Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SERVICE COMPLETE', WORLD.width / 2, cy + 34);

  // Stars
  for (let i = 0; i < 3; i += 1) {
    const sx = WORLD.width / 2 + (i - 1) * 62;
    const sy = cy + 78;
    const earned = i < summary.stars;
    ctx.fillStyle = earned ? '#ffd447' : '#4a3a2f';
    ctx.font = '900 44px "Liberation Sans", sans-serif';
    ctx.fillText('★', sx, sy);
  }

  ctx.fillStyle = '#fff5e0';
  ctx.font = '900 32px "Liberation Sans", sans-serif';
  ctx.fillText(summary.rank, WORLD.width / 2, cy + 130);

  ctx.fillStyle = '#ffe169';
  ctx.font = '900 52px "Liberation Sans", sans-serif';
  ctx.fillText(`$${summary.score}`, WORLD.width / 2, cy + 188);

  const stats = [
    ['DISHES SERVED', String(summary.servedCount)],
    ['PERFECT SEARS', String(summary.perfectDishes)],
    ['BEST STREAK', `×${summary.bestCombo}`],
    ['TIPS EARNED', `$${summary.tips}`],
    ['MISSED TICKETS', String(summary.missedCount)],
    ['PERSONAL BEST', `$${Math.max(bestScore, summary.score)}`],
  ];

  stats.forEach(([label, val], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const sx = cx + 44 + col * 182;
    const sy = cy + 230 + row * 68;
    ctx.fillStyle = '#332319';
    ctx.beginPath();
    ctx.roundRect(sx, sy, 168, 54, 10);
    ctx.fill();
    ctx.fillStyle = '#bda58a';
    ctx.font = '700 10px "Liberation Sans", sans-serif';
    ctx.fillText(label, sx + 84, sy + 18);
    ctx.fillStyle = '#fff4dd';
    ctx.font = '900 20px "Liberation Sans", sans-serif';
    ctx.fillText(val, sx + 84, sy + 39);
  });

  ctx.fillStyle = PALETTE.emerald;
  ctx.beginPath();
  ctx.roundRect(WORLD.width / 2 - 140, cy + 374, 280, 52, 26);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px "Liberation Sans", sans-serif';
  ctx.fillText('PLAY AGAIN  [SPACE]', WORLD.width / 2, cy + 401);
  ctx.restore();
}

export function hitTestHudButtons(worldX, worldY, screen, modeId) {
  if (screen === SCREEN_PLAY) {
    const px = 954;
    const py = 10;
    if (worldX >= px + 196 && worldX <= px + 245 && worldY >= py + 94 && worldY <= py + 116) {
      return 'toggle_mute';
    }
    if (worldX >= px + 253 && worldX <= px + 302 && worldY >= py + 94 && worldY <= py + 116) {
      return 'toggle_pause';
    }
  } else if (screen === SCREEN_TITLE) {
    const cx = (WORLD.width - 720) / 2;
    const cy = (WORLD.height - 468) / 2 + 12;
    if (worldY >= cy + 158 && worldY <= cy + 230) {
      if (worldX >= cx + 98 && worldX <= cx + 350) return 'mode_standard';
      if (worldX >= cx + 370 && worldX <= cx + 622) return 'mode_rush';
    }
    if (
      worldX >= WORLD.width / 2 - 140 &&
      worldX <= WORLD.width / 2 + 140 &&
      worldY >= cy + 368 &&
      worldY <= cy + 424
    ) {
      return 'start_service';
    }
  } else if (screen === SCREEN_PAUSED) {
    const cy = (WORLD.height - 468) / 2;
    if (worldY >= cy + 392 && worldY <= cy + 440) {
      if (worldX >= WORLD.width / 2 - 220 && worldX <= WORLD.width / 2 - 20) return 'resume';
      if (worldX >= WORLD.width / 2 + 20 && worldX <= WORLD.width / 2 + 220) return 'restart';
    }
  } else if (screen === SCREEN_SUMMARY) {
    const cy = (WORLD.height - 450) / 2 + 8;
    if (
      worldX >= WORLD.width / 2 - 140 &&
      worldX <= WORLD.width / 2 + 140 &&
      worldY >= cy + 374 &&
      worldY <= cy + 426
    ) {
      return 'play_again';
    }
  }
  return null;
}

export function renderHudAndOverlays(ctx, state, screen, modeId, bestScore, audioMuted, summary) {
  drawTopOrderRail(ctx, state, audioMuted);
  if (screen === SCREEN_PLAY) {
    drawBottomLegend(ctx);
  } else if (screen === SCREEN_TITLE) {
    drawTitleOverlay(ctx, modeId, bestScore);
  } else if (screen === SCREEN_PAUSED) {
    drawPausedOverlay(ctx);
  } else if (screen === SCREEN_SUMMARY) {
    drawSummaryOverlay(ctx, summary, bestScore);
  }
}
