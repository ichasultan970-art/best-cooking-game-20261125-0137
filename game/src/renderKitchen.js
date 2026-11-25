// 2.5D bistro kitchen renderer: tiled floor, hearth glow, counters, stations, mid-assembly checklists, pass, and chef.

import { COOK_TIMINGS, PALETTE, WORLD } from './config.js';
import { drawIngredientItem, drawMiniIcon, drawPlatedDish } from './foodArt.js';
import { COUNTER_SURFACES, findNearestStation, hitTestStation } from './kitchenLayout.js';
import { getComponentSourceChain, getRecipeProgress, INGREDIENTS, ITEMS, RECIPES } from './recipes.js';

function drawPill(ctx, cx, cy, text, bgColor, textColor, borderColor = null, fontSize = 11) {
  ctx.save();
  ctx.font = `700 ${fontSize}px "Liberation Sans", sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + 14;
  const h = fontSize + 9;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - h / 2);
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  if (borderColor) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 0.5);
  ctx.restore();
}

function drawKitchenFloor(ctx, time) {
  const tileSize = 48;
  const startY = WORLD.hudHeight;
  ctx.save();
  ctx.fillStyle = '#211711';
  ctx.fillRect(0, startY, WORLD.width, WORLD.height - startY);

  const floorX = WORLD.floorMarginX;
  const floorY = startY + 8;
  const floorW = WORLD.width - WORLD.floorMarginX * 2;
  const floorH = WORLD.floorBottomY - floorY;

  ctx.beginPath();
  ctx.roundRect(floorX, floorY, floorW, floorH, 14);
  ctx.clip();

  for (let row = 0; row * tileSize < floorH; row += 1) {
    for (let col = 0; col * tileSize < floorW; col += 1) {
      const tx = floorX + col * tileSize;
      const ty = floorY + row * tileSize;
      ctx.fillStyle = (row + col) % 2 === 0 ? PALETTE.tileLight : PALETTE.tileWarm;
      ctx.fillRect(tx, ty, tileSize, tileSize);
      ctx.strokeStyle = 'rgba(155, 114, 82, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx + 0.5, ty + 0.5, tileSize, tileSize);
    }
  }

  // Warm ambient glow spilling from the Hearth & Skillet line
  const flicker = 0.92 + 0.08 * Math.sin(time * 6.3);
  const hearthGlow = ctx.createRadialGradient(840, 230, 30, 840, 270, 420);
  hearthGlow.addColorStop(0, `rgba(255, 126, 44, ${0.22 * flicker})`);
  hearthGlow.addColorStop(1, 'rgba(255, 126, 44, 0)');
  ctx.fillStyle = hearthGlow;
  ctx.fillRect(floorX, floorY, floorW, floorH);

  // Subtle brass heat-lamp glow over the Service Pass
  const passGlow = ctx.createRadialGradient(970, 690, 20, 970, 690, 240);
  passGlow.addColorStop(0, 'rgba(255, 204, 96, 0.22)');
  passGlow.addColorStop(1, 'rgba(255, 204, 96, 0)');
  ctx.fillStyle = passGlow;
  ctx.fillRect(floorX, floorY, floorW, floorH);

  ctx.restore();

  // Outer kitchen baseboard frame
  ctx.strokeStyle = '#533522';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(floorX, floorY, floorW, floorH, 14);
  ctx.stroke();
}

function drawCounterSurfaces(ctx) {
  for (const box of COUNTER_SURFACES) {
    ctx.save();
    // Floor shadow
    ctx.fillStyle = 'rgba(22, 12, 6, 0.28)';
    ctx.beginPath();
    ctx.roundRect(box.x - 2, box.y + 8, box.w + 4, box.h + 8, 12);
    ctx.fill();

    // 2.5D Front apron drop face
    let sideColor = PALETTE.counterWoodDark;
    let topColor = PALETTE.counterWood;
    let rimColor = '#9b633c';

    if (box.kind === 'marble') {
      sideColor = PALETTE.marbleSide;
      topColor = PALETTE.marbleTop;
      rimColor = '#ffffff';
    } else if (box.kind === 'prep_hearth') {
      sideColor = '#2b2421';
      topColor = '#6f4c34';
      rimColor = '#936a4d';
    } else if (box.kind === 'brass_pass') {
      sideColor = '#3f2a1b';
      topColor = '#4e3523';
      rimColor = PALETTE.brassBright;
    }

    ctx.fillStyle = sideColor;
    ctx.beginPath();
    ctx.roundRect(box.x, box.y + 8, box.w, box.h, 10);
    ctx.fill();

    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.w, box.h - 4, 10);
    ctx.fill();

    ctx.strokeStyle = rimColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Subtle rubber kitchen runner mats along Prep/Hearth and Service Pass
    ctx.fillStyle = 'rgba(42, 28, 20, 0.14)';
    ctx.beginPath();
    ctx.roundRect(212, 280, 990, 42, 10);
    ctx.roundRect(838, 586, 392, 42, 10);
    ctx.fill();

    // Special surface textures
    if (box.kind === 'prep_hearth') {
      // Right half is stone hearth countertop
      ctx.fillStyle = PALETTE.hearthStone;
      ctx.beginPath();
      ctx.roundRect(box.x + 306, box.y + 4, box.w - 310, box.h - 12, 8);
      ctx.fill();
    } else if (box.kind === 'marble') {
      ctx.strokeStyle = PALETTE.marbleVein;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(box.x + 28, box.y + 22);
      ctx.bezierCurveTo(box.x + 140, box.y + 52, box.x + 230, box.y + 18, box.x + 340, box.y + 72);
      ctx.moveTo(box.x + 310, box.y + 18);
      ctx.bezierCurveTo(box.x + 370, box.y + 48, box.x + 420, box.y + 34, box.x + 462, box.y + 66);
      ctx.stroke();
    } else if (box.kind === 'brass_pass') {
      // Warm brushed-steel pass inset + brass heat-lamp bar
      ctx.fillStyle = '#33251c';
      ctx.beginPath();
      ctx.roundRect(box.x + 10, box.y + 10, box.w - 20, box.h - 24, 6);
      ctx.fill();
      ctx.fillStyle = PALETTE.brassBright;
      ctx.fillRect(box.x + 16, box.y + 3, box.w - 32, 4);
    }

    ctx.restore();
  }

  // Subtle zone labels placed along counter bottom trims so mid-assembly & popup labels stay clear
  drawPill(ctx, 625, 534, 'MARBLE ASSEMBLY ISLAND', 'rgba(38, 26, 20, 0.88)', '#f6e7cc', PALETTE.brassDeep, 9.5);
  drawPill(ctx, 1034, 761, 'HEATED SERVICE PASS', 'rgba(38, 26, 20, 0.92)', PALETTE.brassBright, PALETTE.brassBright, 9.5);
}

function drawCookDial(ctx, x, y, progress, canBurn = true) {
  const radius = 19;
  const clamped = Math.min(1.0, progress);
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(24, 15, 10, 0.88)';
  ctx.beginPath();
  ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
  ctx.fill();

  // Track
  ctx.strokeStyle = '#4e3c31';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius, -Math.PI / 2, Math.PI * 1.5);
  ctx.stroke();

  // Sweet spot zone arc
  if (canBurn) {
    const ssStart = -Math.PI / 2 + COOK_TIMINGS.sweetSpotStart * Math.PI * 2;
    const ssEnd = -Math.PI / 2 + COOK_TIMINGS.sweetSpotEnd * Math.PI * 2;
    ctx.strokeStyle = 'rgba(255, 214, 72, 0.42)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, radius, ssStart, ssEnd);
    ctx.stroke();
  }

  // Active arc
  let arcColor = '#6ec6ff';
  let badgeText = `${Math.round(clamped * 100)}%`;
  if (!canBurn) {
    arcColor = PALETTE.emerald;
  } else if (progress >= COOK_TIMINGS.burnLimit) {
    arcColor = PALETTE.crimson;
    badgeText = 'BURNT';
  } else if (progress >= 1.0) {
    arcColor = '#ff7438';
    badgeText = 'HOT!';
  } else if (progress >= COOK_TIMINGS.sweetSpotStart) {
    arcColor = '#ffd54f';
    badgeText = 'SWEET';
  }

  ctx.strokeStyle = arcColor;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + clamped * Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#fff5e0';
  ctx.font = '800 9px "Liberation Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, 0, 0.5);
  ctx.restore();
}

function drawStation(ctx, station, state, time, isPinnedTarget, isHovered, isNear) {
  ctx.save();
  const { x, y } = station;

  if (isPinnedTarget) {
    const pulse = 0.55 + 0.45 * Math.sin(time * 6);
    ctx.strokeStyle = `rgba(255, 214, 92, ${0.85 * pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - station.w / 2 - 4, y - station.h / 2 - 4, station.w + 8, station.h + 8, 12);
    ctx.stroke();
  }

  if (isHovered || isNear) {
    ctx.strokeStyle = isNear ? '#fff1b8' : 'rgba(255, 240, 196, 0.65)';
    ctx.lineWidth = isNear ? 2.5 : 1.8;
    ctx.beginPath();
    ctx.roundRect(x - station.w / 2 - 2, y - station.h / 2 - 2, station.w + 4, station.h + 4, 10);
    ctx.stroke();
  }

  // Station base art
  if (station.kind === 'crate') {
    const ing = INGREDIENTS[station.ingredient];
    ctx.fillStyle = '#9c663b';
    ctx.beginPath();
    ctx.roundRect(x - 38, y - 30, 76, 56, 8);
    ctx.fill();
    ctx.fillStyle = '#603b1e';
    ctx.beginPath();
    ctx.roundRect(x - 31, y - 24, 62, 42, 6);
    ctx.fill();
    // Slatted wooden rim + stacked ingredients
    drawIngredientItem(ctx, station.ingredient, x - 9, y - 6, 0.85, { shadow: false });
    drawIngredientItem(ctx, station.ingredient, x + 9, y - 4, 0.85, { shadow: false });
    drawIngredientItem(ctx, station.ingredient, x, y + 1, 0.95);

    // Key badge [1..6]
    ctx.fillStyle = '#241812';
    ctx.beginPath();
    ctx.roundRect(x - 36, y - 29, 17, 16, 4);
    ctx.fill();
    ctx.fillStyle = PALETTE.brassBright;
    ctx.font = '800 10px "Liberation Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(station.keyHint, x - 27.5, y - 21);

    drawPill(ctx, x, y + 27, ing.short, '#241812', '#fbf3e2', ing.color, 9.5);
  } else if (station.kind === 'chop') {
    // Maple butcher block
    ctx.fillStyle = PALETTE.mapleEdge;
    ctx.beginPath();
    ctx.roundRect(x - 42, y - 27, 84, 54, 7);
    ctx.fill();
    ctx.fillStyle = PALETTE.mapleLight;
    ctx.beginPath();
    ctx.roundRect(x - 39, y - 24, 78, 46, 5);
    ctx.fill();

    if (station.cooking) {
      drawIngredientItem(ctx, station.cooking.inputKey, x - 2, y + 2, 1.05);
      // Animated steel chef knife chopping!
      const swing = Math.sin(state.chef.chopAnimTimer * 35) * 0.45;
      ctx.save();
      ctx.translate(x + 14, y - 4);
      ctx.rotate(-0.4 + swing);
      ctx.fillStyle = '#dfe5ea';
      ctx.beginPath();
      ctx.moveTo(-24, -4);
      ctx.lineTo(2, -6);
      ctx.lineTo(0, 6);
      ctx.quadraticCurveTo(-15, 7, -24, -4);
      ctx.fill();
      ctx.fillStyle = '#332118';
      ctx.fillRect(2, -5, 14, 6);
      ctx.restore();
      drawCookDial(ctx, x + 28, y - 26, station.cooking.progress, false);
    } else if (station.item) {
      drawIngredientItem(ctx, station.item, x, y, 1.15);
      drawPill(ctx, x, y + 32, 'READY', PALETTE.emerald, '#ffffff', null, 9.5);
    } else {
      // Resting knife on board
      ctx.save();
      ctx.translate(x + 18, y - 8);
      ctx.rotate(-0.35);
      ctx.fillStyle = '#cfd8df';
      ctx.fillRect(-18, -3, 18, 6);
      ctx.fillStyle = '#3e2618';
      ctx.fillRect(0, -2.5, 11, 5);
      ctx.restore();
      drawPill(ctx, x, y + 32, station.label, 'rgba(36, 24, 18, 0.8)', '#f2dfc2', null, 9);
    }
  } else if (station.kind === 'skillet') {
    const active = Boolean(station.cooking);
    // Glowing hearth grate
    const emberAlpha = active ? 0.85 + 0.15 * Math.sin(time * 9) : 0.45;
    ctx.fillStyle = `rgba(255, 102, 32, ${emberAlpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    // Copper skillet body & handle
    ctx.fillStyle = '#2d1c15';
    ctx.beginPath();
    ctx.roundRect(x + 22, y - 4, 24, 8, 4);
    ctx.fill();

    ctx.fillStyle = PALETTE.copper;
    ctx.beginPath();
    ctx.arc(x, y, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2e2a28';
    ctx.beginPath();
    ctx.arc(x, y, 21, 0, Math.PI * 2);
    ctx.fill();

    if (station.cooking) {
      const displayKey = station.cooking.burnt
        ? 'burnt'
        : station.cooking.progress >= COOK_TIMINGS.sweetSpotStart
          ? station.cooking.resultKey
          : station.cooking.inputKey;
      drawIngredientItem(ctx, displayKey, x, y, 1.0);
      drawCookDial(ctx, x + 28, y - 26, station.cooking.progress, true);
      if (
        station.cooking.progress >= COOK_TIMINGS.sweetSpotStart &&
        station.cooking.progress <= COOK_TIMINGS.sweetSpotEnd
      ) {
        drawPill(ctx, x, y + 32, 'PULL NOW!', '#ffd24c', '#241812', '#fff7d1', 9.5);
      } else if (station.cooking.progress >= COOK_TIMINGS.burnLimit) {
        drawPill(ctx, x, y + 32, 'BURNT!', PALETTE.crimson, '#ffffff', null, 9.5);
      }
    } else {
      drawPill(ctx, x, y + 32, 'SKILLET', 'rgba(36, 24, 18, 0.82)', '#f7c59f', null, 9);
    }
  } else if (station.kind === 'pot') {
    ctx.fillStyle = 'rgba(255, 110, 35, 0.55)';
    ctx.beginPath();
    ctx.arc(x, y, 29, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a3aeb8';
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = station.cooking ? '#d64527' : '#4a3d35';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    if (station.cooking) {
      const k = station.cooking.burnt ? 'burnt' : station.cooking.resultKey;
      drawIngredientItem(ctx, k, x, y, 0.92, { shadow: false });
      drawCookDial(ctx, x + 28, y - 26, station.cooking.progress, true);
    } else {
      drawPill(ctx, x, y + 32, 'KETTLE', 'rgba(36, 24, 18, 0.82)', '#f0e2ce', null, 9);
    }
  } else if (station.kind === 'oven') {
    // Brick dome hearth oven
    ctx.fillStyle = '#7c3626';
    ctx.beginPath();
    ctx.roundRect(x - 46, y - 34, 92, 68, 16);
    ctx.fill();
    ctx.strokeStyle = '#d18d66';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#1f1410';
    ctx.beginPath();
    ctx.roundRect(x - 28, y - 16, 56, 36, 12);
    ctx.fill();
    const glow = 0.72 + 0.25 * Math.sin(time * 8);
    ctx.fillStyle = `rgba(255, 122, 34, ${glow})`;
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    if (station.cooking) {
      const k = station.cooking.burnt
        ? 'burnt'
        : station.cooking.progress >= COOK_TIMINGS.sweetSpotStart
          ? station.cooking.resultKey
          : station.cooking.inputKey;
      drawIngredientItem(ctx, k, x, y + 2, 0.95);
      drawCookDial(ctx, x + 34, y - 26, station.cooking.progress, true);
    } else {
      drawPill(ctx, x, y + 32, 'HEARTH OVEN', 'rgba(36, 24, 18, 0.85)', '#ffd0a1', null, 9);
    }
  } else if (station.kind === 'plate_stack') {
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = '#dfd6c8';
      ctx.beginPath();
      ctx.arc(x, y + 4 - i * 4, 23, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y + 2 - i * 4, 21, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#c9bca8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawPill(ctx, x, y + 34, 'PLATES', '#2e2119', '#fff6e8', null, 9.5);
  } else if (station.kind === 'assembly') {
    ctx.fillStyle = 'rgba(205, 192, 174, 0.55)';
    ctx.beginPath();
    ctx.roundRect(x - 40, y - 29, 80, 58, 8);
    ctx.fill();
    ctx.strokeStyle = '#aba08f';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (station.plate) {
      drawPlatedDish(ctx, station.plate, x, y + 2, 1.04, time);
      const info = getRecipeProgress(station.plate, state.orders);
      if (info) {
        if (info.completed) {
          drawPill(ctx, x, y - 34, `${info.recipe.shortName} · DONE!`, PALETTE.emerald, '#ffffff', '#d2ffdf', 10);
        } else {
          drawPill(
            ctx,
            x,
            y - 36,
            `${info.doneCount}/${info.totalCount} · ${info.recipe.shortName}`,
            '#241812',
            '#ffe38f',
            PALETTE.brassBright,
            10,
          );
          // Show tiny ingredient pips below plate indicating missing components!
          const allComps = info.recipe.components;
          const spacing = 22;
          const startPx = x - ((allComps.length - 1) * spacing) / 2;
          allComps.forEach((compKey, idx) => {
            const px = startPx + idx * spacing;
            const py = y + 35;
            const hasIt = station.plate.items.includes(compKey);
            ctx.fillStyle = hasIt ? '#1f7a44' : '#2a1d15';
            ctx.beginPath();
            ctx.arc(px, py, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = hasIt ? '#68ee99' : '#f2c15a';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            drawMiniIcon(ctx, compKey, px, py, 14);
          });
        }
      }
    } else {
      drawPill(ctx, x, y + 34, 'ASSEMBLY', 'rgba(62, 46, 35, 0.82)', '#f7eedc', null, 9.5);
    }
  } else if (station.kind === 'staging') {
    ctx.fillStyle = 'rgba(255, 240, 214, 0.22)';
    ctx.beginPath();
    ctx.roundRect(x - 28, y - 24, 56, 48, 7);
    ctx.fill();
    if (station.plate) {
      drawPlatedDish(ctx, station.plate, x, y, 0.95, time);
    } else if (station.item) {
      drawIngredientItem(ctx, station.item, x, y, 1.0);
    } else {
      drawPill(ctx, x, y + 32, station.label, 'rgba(36, 24, 18, 0.72)', '#e5d4be', null, 9);
    }
  } else if (station.kind === 'pass') {
    // Heated brass pass pad
    ctx.fillStyle = '#5b3f2b';
    ctx.beginPath();
    ctx.roundRect(x - 42, y - 28, 84, 56, 8);
    ctx.fill();
    ctx.strokeStyle = station.plate ? '#ffd35c' : '#9c7742';
    ctx.lineWidth = station.plate ? 2.5 : 1.5;
    ctx.stroke();

    if (station.plate) {
      // Warm spotlight ring
      const glow = ctx.createRadialGradient(x, y, 8, x, y, 42);
      glow.addColorStop(0, 'rgba(255, 224, 118, 0.42)');
      glow.addColorStop(1, 'rgba(255, 224, 118, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 42, 0, Math.PI * 2);
      ctx.fill();

      drawPlatedDish(ctx, station.plate, x, y + 2, 1.08, time);
      const recipe = RECIPES[station.plate.completedRecipeId];
      drawPill(ctx, x, y - 36, 'READY TO SERVE!', PALETTE.emerald, '#ffffff', '#d8ffe4', 10);
      if (recipe) {
        drawPill(ctx, x, y + 35, recipe.shortName, '#241812', '#ffe58f', PALETTE.brassBright, 9.5);
      }
    } else {
      drawPill(ctx, x, y + 34, 'PASS WARMER', 'rgba(36, 24, 18, 0.8)', '#e8cca0', null, 9);
    }
  } else if (station.kind === 'bell') {
    const anyReady = state.stations.some((s) => s.kind === 'pass' && s.plate?.completedRecipeId);
    const bounce = state.chef.bellAnimTimer > 0 ? Math.sin(state.chef.bellAnimTimer * 28) * 3 : 0;

    if (anyReady || state.bellFlash > 0) {
      ctx.fillStyle = 'rgba(255, 214, 70, 0.32)';
      ctx.beginPath();
      ctx.arc(x, y, 36 + Math.sin(time * 8) * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wooden bell base
    ctx.fillStyle = '#331d13';
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Brass bell dome
    const bellGrad = ctx.createRadialGradient(x - 6, y - 8 + bounce, 3, x, y + bounce, 24);
    bellGrad.addColorStop(0, '#fff2b2');
    bellGrad.addColorStop(0.5, '#e8b648');
    bellGrad.addColorStop(1, '#966618');
    ctx.fillStyle = bellGrad;
    ctx.beginPath();
    ctx.arc(x, y + 5 + bounce, 20, Math.PI, 0);
    ctx.quadraticCurveTo(x + 20, y + 11 + bounce, x - 20, y + 11 + bounce);
    ctx.fill();

    // Plunger button
    ctx.fillStyle = '#ffe58f';
    ctx.beginPath();
    ctx.arc(x, y - 16 + bounce, 5, 0, Math.PI * 2);
    ctx.fill();

    drawPill(
      ctx,
      x,
      y + 34,
      anyReady ? 'SERVE NOW!' : 'BELL',
      anyReady ? PALETTE.amber : '#241812',
      anyReady ? '#241812' : '#ffe58f',
      '#ffe58f',
      10,
    );
  } else if (station.kind === 'trash') {
    ctx.fillStyle = '#40484c';
    ctx.beginPath();
    ctx.roundRect(x - 24, y - 24, 48, 48, 9);
    ctx.fill();
    ctx.fillStyle = '#252a2d';
    ctx.beginPath();
    ctx.roundRect(x - 18, y - 18, 36, 36, 6);
    ctx.fill();
    drawPill(ctx, x, y + 34, 'COMPOST [Q]', '#241812', '#c8c3bc', null, 9);
  }

  ctx.restore();
}

function drawChef(ctx, chef) {
  ctx.save();
  const bob = chef.moving ? Math.abs(Math.sin(chef.walkCycle)) * 3.5 : 0;
  const cx = chef.x;
  const cy = chef.y - bob;

  // Ground shadow
  ctx.fillStyle = 'rgba(20, 12, 8, 0.34)';
  ctx.beginPath();
  ctx.ellipse(chef.x, chef.y + 18, 19, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle facing chevron
  const dirAngle = Math.atan2(chef.facingY, chef.facingX);
  ctx.fillStyle = 'rgba(255, 224, 130, 0.5)';
  ctx.save();
  ctx.translate(chef.x + Math.cos(dirAngle) * 26, chef.y + Math.sin(dirAngle) * 26);
  ctx.rotate(dirAngle);
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -5);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Chef jacket torso
  ctx.fillStyle = '#f8f2e8';
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a2417';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Terracotta bistro neckerchief
  ctx.fillStyle = '#cf4d30';
  ctx.beginPath();
  ctx.arc(cx, cy + 4, 10, 0, Math.PI);
  ctx.fill();

  // Chef head & toque
  ctx.fillStyle = '#f2c69c';
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 12, 0, Math.PI * 2);
  ctx.fill();

  // Tall pleated toque hat
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 16, 13, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a2417';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e7dfd3';
  ctx.fillRect(cx - 10, cy - 12, 20, 4);

  // Held item / held plate rendered cleanly in front of chef
  const holdX = cx + Math.cos(dirAngle) * 24;
  const holdY = cy + Math.sin(dirAngle) * 20;
  if (chef.heldPlate) {
    drawPlatedDish(ctx, chef.heldPlate, holdX, holdY, 0.88, 0);
  } else if (chef.heldItem) {
    drawIngredientItem(ctx, chef.heldItem, holdX, holdY, 0.96);
    if (chef.heldPerfect) {
      ctx.fillStyle = '#ffd95e';
      ctx.beginPath();
      ctx.arc(holdX + 11, holdY - 11, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function getPinnedStationSet(state) {
  const set = new Set();
  const pinned = state.orders.find((o) => o.id === state.pinnedOrderId) ?? state.orders[0];
  if (!pinned) return set;

  for (const comp of pinned.components) {
    for (const stepKey of getComponentSourceChain(comp)) {
      if (INGREDIENTS[stepKey]) set.add(`crate_${stepKey}`);
      else if (stepKey === 'chop') set.add('chop_1');
      else if (stepKey === 'skillet') set.add('skillet_1');
      else if (stepKey === 'pot') set.add('pot_1');
      else if (stepKey === 'oven') set.add('oven_1');
    }
  }
  return set;
}

export function renderKitchenWorld(ctx, state, pointer, time) {
  ctx.save();
  if (state.shake > 0) {
    const mag = state.shake * 14;
    ctx.translate((Math.sin(time * 70) * mag), (Math.cos(time * 55) * mag));
  }

  drawKitchenFloor(ctx, time);
  drawCounterSurfaces(ctx);

  const hovered = pointer?.inside ? hitTestStation(pointer.x, pointer.y, state.stations) : null;
  const nearest = findNearestStation(
    state.chef.x,
    state.chef.y,
    state.chef.facingX,
    state.chef.facingY,
    state.stations,
  );
  const pinnedSet = getPinnedStationSet(state);

  // Subtle route dotted path when auto-routing via mouse click
  if (state.chef.waypoints.length > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 224, 130, 0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(state.chef.x, state.chef.y);
    for (const wp of state.chef.waypoints) ctx.lineTo(wp.x, wp.y);
    ctx.stroke();
    ctx.restore();
  }

  for (const station of state.stations) {
    drawStation(
      ctx,
      station,
      state,
      time,
      pinnedSet.has(station.id),
      hovered?.id === station.id,
      nearest?.id === station.id,
    );
  }

  drawChef(ctx, state.chef);

  // Particles
  for (const p of state.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = p.kind === 'steam' ? alpha * 0.55 : alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.kind === 'steam' ? 1.4 - alpha * 0.4 : 1), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Floating score & event popups
  for (const pop of state.popups) {
    const alpha = Math.min(1, (pop.life / pop.maxLife) * 1.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${Math.round(18 * pop.scale)}px "Liberation Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(22, 12, 6, 0.9)';
    ctx.strokeText(pop.text, pop.x, pop.y);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x, pop.y);
    ctx.restore();
  }

  // Contextual action tooltip or held-item banner
  if (state.toast) {
    drawPill(
      ctx,
      WORLD.width / 2,
      348,
      state.toast.text,
      state.toast.tone === 'warn' ? 'rgba(176, 46, 36, 0.94)' : 'rgba(36, 24, 18, 0.92)',
      '#fff8ea',
      '#ffd585',
      13,
    );
  } else if (state.chef.heldPlate) {
    const prog = getRecipeProgress(state.chef.heldPlate, state.orders);
    const label = prog?.completed
      ? `HOLDING: ${prog.recipe.shortName} (TAKE TO PASS OR BELL!)`
      : prog
        ? `HOLDING PLATE (${prog.doneCount}/${prog.totalCount} ${prog.recipe.shortName})`
        : 'HOLDING EMPTY PLATE';
    drawPill(ctx, state.chef.x, state.chef.y + 38, label, 'rgba(32, 21, 15, 0.9)', '#ffe494', PALETTE.brassBright, 10.5);
  } else if (state.chef.heldItem) {
    const name = ITEMS[state.chef.heldItem]?.label ?? state.chef.heldItem;
    const tag = state.chef.heldPerfect ? '★ PERFECT ' : '';
    drawPill(
      ctx,
      state.chef.x,
      state.chef.y + 38,
      `HOLDING: ${tag}${name.toUpperCase()}`,
      'rgba(32, 21, 15, 0.9)',
      '#fff5df',
      PALETTE.brassDeep,
      10.5,
    );
  }

  ctx.restore();
}
