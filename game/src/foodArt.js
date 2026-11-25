// Procedural Canvas2D food illustrations: raw ingredients, prepped components, plated layers, and mini icons.

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function drawIngredientItem(ctx, itemKey, x, y, scale = 1, opts = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (opts.shadow !== false) {
    ctx.fillStyle = 'rgba(20, 12, 8, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 12, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  switch (itemKey) {
    case 'tomato': {
      ctx.fillStyle = '#d93829';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f26a55';
      ctx.beginPath();
      ctx.ellipse(-4, -5, 5, 3.2, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3c8d3c';
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 - 0.3;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(Math.cos(a) * 7, -10 + Math.sin(a) * 4);
        ctx.lineTo(Math.cos(a + 0.4) * 3, -10 + Math.sin(a + 0.4) * 2);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'diced_tomato': {
      const cubes = [
        { x: -7, y: 2, r: -0.2, c: '#d83829' },
        { x: 6, y: 3, r: 0.3, c: '#eb5240' },
        { x: 0, y: -5, r: 0.1, c: '#cb2d20' },
        { x: -2, y: 5, r: 0.4, c: '#f26452' },
      ];
      for (const cube of cubes) {
        ctx.save();
        ctx.translate(cube.x, cube.y);
        ctx.rotate(cube.r);
        ctx.fillStyle = cube.c;
        drawRoundedRect(ctx, -5, -5, 10, 10, 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,215,190,0.45)';
        ctx.fillRect(-3, -3, 3, 2);
        ctx.restore();
      }
      break;
    }

    case 'herbs': {
      const leaves = [
        { x: -6, y: 2, a: -0.6, s: 1 },
        { x: 6, y: 1, a: 0.55, s: 0.95 },
        { x: 0, y: -5, a: 0.0, s: 1.05 },
      ];
      ctx.strokeStyle = '#266931';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(0, -2);
      ctx.stroke();
      for (const l of leaves) {
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.a);
        ctx.scale(l.s, l.s);
        ctx.fillStyle = '#3da34d';
        ctx.beginPath();
        ctx.ellipse(0, 0, 6.5, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7de07c';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 7);
        ctx.lineTo(0, -7);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }

    case 'minced_herbs': {
      const specks = [
        [-8, 3, '#389947'], [7, 2, '#51be5d'], [-2, -4, '#2d7d39'],
        [3, -5, '#68d46f'], [-5, -2, '#47b053'], [4, 5, '#348d42'], [0, 2, '#5ecc68'],
      ];
      for (const [sx, sy, col] of specks) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 4.2, 2.5, sx * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'mushroom': {
      ctx.fillStyle = '#e8dcc7';
      drawRoundedRect(ctx, -4, 0, 8, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#8b684c';
      ctx.beginPath();
      ctx.ellipse(0, -3, 14, 10, 0, Math.PI, Math.PI * 2);
      ctx.quadraticCurveTo(14, 3, 0, 3);
      ctx.quadraticCurveTo(-14, 3, -14, -3);
      ctx.fill();
      ctx.fillStyle = '#b48f6e';
      ctx.beginPath();
      ctx.ellipse(-4, -7, 5, 2.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'sliced_mushroom': {
      for (const offset of [-6, 0, 6]) {
        ctx.save();
        ctx.translate(offset, offset === 0 ? -3 : 2);
        ctx.rotate(offset * 0.06);
        ctx.fillStyle = '#dfd0b8';
        ctx.fillRect(-3, 0, 6, 8);
        ctx.fillStyle = '#8f6b4e';
        ctx.beginPath();
        ctx.arc(0, 0, 8, Math.PI, 0);
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 'sauteed_mushroom': {
      for (const [ox, oy, rot] of [[-6, 3, -0.3], [5, 2, 0.35], [0, -4, 0.1]]) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(rot);
        ctx.fillStyle = '#6f4729';
        ctx.beginPath();
        ctx.arc(0, 0, 8.5, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#c58c4d';
        ctx.fillRect(-3, 0, 6, 6);
        ctx.fillStyle = 'rgba(255,220,140,0.5)';
        ctx.beginPath();
        ctx.arc(-3, -4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 'salmon': {
      ctx.save();
      ctx.rotate(-0.2);
      ctx.fillStyle = '#f27858';
      drawRoundedRect(ctx, -15, -8, 30, 16, 6);
      ctx.fill();
      ctx.strokeStyle = '#ffd5c2';
      ctx.lineWidth = 2;
      for (let xPos = -9; xPos <= 9; xPos += 6) {
        ctx.beginPath();
        ctx.moveTo(xPos, -6);
        ctx.lineTo(xPos + 3, 6);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'seared_salmon': {
      ctx.save();
      ctx.rotate(-0.18);
      ctx.fillStyle = '#e5683d';
      drawRoundedRect(ctx, -16, -9, 32, 18, 6);
      ctx.fill();
      ctx.fillStyle = '#f8986b';
      drawRoundedRect(ctx, -13, -7, 26, 7, 4);
      ctx.fill();
      ctx.strokeStyle = '#5f2511';
      ctx.lineWidth = 2.2;
      for (let gx = -9; gx <= 9; gx += 6) {
        ctx.beginPath();
        ctx.moveTo(gx, -7);
        ctx.lineTo(gx + 4, 7);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'steak': {
      ctx.fillStyle = '#9b2428';
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 11, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f2cbd0';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-8, -3);
      ctx.quadraticCurveTo(0, 2, 9, -4);
      ctx.stroke();
      break;
    }

    case 'seared_steak': {
      ctx.fillStyle = '#5b2b1d';
      ctx.beginPath();
      ctx.ellipse(0, 1, 16, 12, -0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#793b27';
      ctx.beginPath();
      ctx.ellipse(0, -1, 14, 10, -0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2d110a';
      ctx.lineWidth = 2.2;
      for (let g = -8; g <= 8; g += 6) {
        ctx.beginPath();
        ctx.moveTo(g - 3, -8);
        ctx.lineTo(g + 3, 7);
        ctx.stroke();
      }
      // Melting herb butter pat on top
      ctx.fillStyle = '#ffe585';
      drawRoundedRect(ctx, -5, -5, 10, 8, 2);
      ctx.fill();
      break;
    }

    case 'dough': {
      ctx.fillStyle = '#eed7ab';
      ctx.beginPath();
      ctx.ellipse(0, 2, 15, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f9ebd0';
      ctx.beginPath();
      ctx.ellipse(-3, -2, 9, 5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'baked_flatbread': {
      ctx.fillStyle = '#d39246';
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eebb72';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6f3e19';
      for (const [bx, by] of [[-11, -5], [10, 4], [-5, 7], [8, -6]]) {
        ctx.beginPath();
        ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'tomato_bisque': {
      ctx.fillStyle = '#f3ece0';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d93c23';
      ctx.beginPath();
      ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff5dc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0.2, Math.PI * 1.55);
      ctx.stroke();
      break;
    }

    case 'broth_noodles': {
      ctx.fillStyle = '#2d3740';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d58c38';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffe59c';
      ctx.lineWidth = 2;
      for (let ny = -5; ny <= 5; ny += 4) {
        ctx.beginPath();
        ctx.moveTo(-8, ny);
        ctx.quadraticCurveTo(0, ny + 3, 8, ny - 1);
        ctx.stroke();
      }
      break;
    }

    case 'burnt': {
      ctx.fillStyle = '#2a2422';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 10, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff6d42';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-6, -3);
      ctx.lineTo(5, 4);
      ctx.moveTo(-4, 4);
      ctx.lineTo(6, -3);
      ctx.stroke();
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

export function drawPlatedDish(ctx, plate, x, y, scale = 1, time = 0) {
  if (!plate) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Drop shadow
  ctx.fillStyle = 'rgba(18, 10, 6, 0.34)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 27, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outer porcelain rim
  ctx.fillStyle = plate.completedRecipeId ? '#fffdf8' : '#f4eee4';
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = plate.completedRecipeId ? '#e3b254' : '#d0c4b4';
  ctx.lineWidth = plate.completedRecipeId ? 2.4 : 1.6;
  ctx.stroke();

  // Inner well
  ctx.fillStyle = '#ebe3d5';
  ctx.beginPath();
  ctx.arc(0, 0, 18.5, 0, Math.PI * 2);
  ctx.fill();

  // Draw plated ingredients in layered culinary order
  const orderPriority = [
    'baked_flatbread',
    'broth_noodles',
    'tomato_bisque',
    'seared_steak',
    'seared_salmon',
    'sauteed_mushroom',
    'sliced_mushroom',
    'diced_tomato',
    'minced_herbs',
  ];
  const sorted = [...plate.items].sort((a, b) => orderPriority.indexOf(a) - orderPriority.indexOf(b));

  const offsets = {
    baked_flatbread: [0, 0, 1.05],
    broth_noodles: [0, 0, 1.08],
    tomato_bisque: [-4, 1, 0.95],
    seared_steak: [-2, 1, 0.95],
    seared_salmon: [2, 0, 0.95],
    sauteed_mushroom: [7, -4, 0.78],
    sliced_mushroom: [7, -4, 0.78],
    diced_tomato: [-6, -5, 0.78],
    minced_herbs: [0, -2, 0.9],
  };

  for (const key of sorted) {
    const [ox, oy, s] = offsets[key] ?? [0, 0, 0.8];
    const adjustedX = sorted.includes('tomato_bisque') && key === 'baked_flatbread' ? 9 : ox;
    const adjustedS = sorted.includes('tomato_bisque') && key === 'baked_flatbread' ? 0.68 : s;
    drawIngredientItem(ctx, key, adjustedX, oy, adjustedS, { shadow: false });
  }

  // Golden star shimmer for perfect sear or completed dish
  if (plate.completedRecipeId) {
    const pulse = 0.65 + 0.35 * Math.sin(time * 5);
    ctx.fillStyle = `rgba(255, 224, 112, ${0.45 * pulse})`;
    ctx.beginPath();
    ctx.arc(-14, -14, 3.5, 0, Math.PI * 2);
    ctx.arc(15, -11, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawMiniIcon(ctx, key, x, y, size = 18) {
  const scale = size / 26;
  drawIngredientItem(ctx, key, x, y, scale, { shadow: false });
}
