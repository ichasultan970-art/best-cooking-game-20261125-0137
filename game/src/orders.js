// Seeded RNG, wave schedule, active order tickets, rush urgency, and scoring payouts.

import { COOK_TIMINGS, WAVES } from './config.js';
import { RECIPES } from './recipes.js';

export function createRng(seed) {
  let state = (seed >>> 0) || 1;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getActiveWave(elapsedSec, durationSec = 180) {
  const timeScale = Math.max(0.5, durationSec / 180);
  let current = WAVES[0];
  for (const wave of WAVES) {
    if (elapsedSec >= wave.minElapsedSec * timeScale) current = wave;
  }
  return current;
}

export function createOrderDirector(rng) {
  let nextTicketNumber = 101;
  let spawnTimer = 1.5;

  function pickRecipeId(wave, existingOrders) {
    const pool = wave.recipePool;
    const counts = new Map();
    for (const o of existingOrders) counts.set(o.recipeId, (counts.get(o.recipeId) ?? 0) + 1);
    const fresh = pool.filter((id) => (counts.get(id) ?? 0) === 0);
    const list = fresh.length > 0 ? fresh : pool;
    const idx = Math.floor(rng() * list.length);
    return list[idx];
  }

  function spawnOrder(state, forceRecipeId = null, forceVip = null) {
    const wave = getActiveWave(state.elapsed, state.durationSec);
    if (state.orders.length >= 5) return null;
    const recipeId = forceRecipeId ?? pickRecipeId(wave, state.orders);
    const recipe = RECIPES[recipeId];
    const vip = forceVip !== null ? forceVip : rng() < wave.vipChance;
    const maxTime = vip ? Math.max(30, wave.ticketLifetimeSec - 8) : wave.ticketLifetimeSec;

    const ticket = {
      id: `ord_${nextTicketNumber}`,
      number: nextTicketNumber++,
      recipeId,
      name: recipe.shortName,
      fullName: recipe.name,
      components: [...recipe.components],
      basePrice: recipe.price,
      vip,
      maxTime,
      remaining: maxTime,
      spawnAge: 0,
      urgentWarningPlayed: false,
    };
    state.orders.push(ticket);
    return ticket;
  }

  function seedInitialOrders(state) {
    spawnOrder(state, 'margherita_flatbread', false);
    spawnOrder(state, 'herb_salmon', false);
    spawnOrder(state, 'steak_shrooms', false);
    spawnTimer = 6.5;
  }

  function stepOrders(dt, state, events) {
    const wave = getActiveWave(state.elapsed, state.durationSec);
    state.waveIndex = wave.id;
    state.waveName = wave.name;

    const expired = [];
    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const ticket = state.orders[i];
      ticket.spawnAge += dt;
      ticket.remaining = Math.max(0, ticket.remaining - dt);
      if (ticket.remaining <= 0) {
        state.orders.splice(i, 1);
        expired.push(ticket);
      }
    }

    if (expired.length > 0) {
      state.combo = 0;
      state.missedCount += expired.length;
      if (state.pinnedOrderId && expired.some((t) => t.id === state.pinnedOrderId)) {
        state.pinnedOrderId = state.orders[0]?.id ?? null;
      }
      for (const ticket of expired) {
        events.push({ type: 'order_expired', ticket });
      }
    }

    spawnTimer -= dt;
    if (state.orders.length === 0) {
      spawnTimer = Math.min(spawnTimer, 0.8);
    }
    if (spawnTimer <= 0 && state.orders.length < wave.maxOrders) {
      const created = spawnOrder(state);
      if (created) events.push({ type: 'order_new', ticket: created });
      spawnTimer = wave.spawnIntervalSec * (0.85 + rng() * 0.3);
    } else if (spawnTimer <= 0) {
      spawnTimer = 2.2;
    }
  }

  function settleServedPlate(plate, state) {
    const matching = state.orders
      .filter((o) => o.recipeId === plate.completedRecipeId)
      .sort((a, b) => a.remaining - b.remaining);

    if (matching.length === 0) {
      return { matched: false };
    }

    const ticket = matching[0];
    const idx = state.orders.findIndex((o) => o.id === ticket.id);
    if (idx !== -1) state.orders.splice(idx, 1);
    if (state.pinnedOrderId === ticket.id) {
      state.pinnedOrderId = state.orders[0]?.id ?? null;
    }

    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.servedCount += 1;

    const ratio = ticket.remaining / ticket.maxTime;
    const speedTip = Math.round(ticket.basePrice * (0.12 + 0.28 * ratio));
    const perfectBonus = (plate.perfectCount ?? 0) * COOK_TIMINGS.perfectBonus;
    const vipBonus = ticket.vip ? Math.round(ticket.basePrice * 0.45) : 0;
    const streakBonus = state.combo > 1 ? Math.min(40, (state.combo - 1) * 8) : 0;
    const totalEarned = ticket.basePrice + speedTip + perfectBonus + vipBonus + streakBonus;

    state.score += totalEarned;
    state.tips += speedTip + perfectBonus + vipBonus + streakBonus;
    if ((plate.perfectCount ?? 0) > 0) state.perfectDishes += 1;
    state.servedHistory.push({
      recipeId: ticket.recipeId,
      earned: totalEarned,
      perfect: (plate.perfectCount ?? 0) > 0,
      vip: ticket.vip,
    });

    return {
      matched: true,
      ticket,
      totalEarned,
      speedTip,
      perfectBonus,
      vipBonus,
      streakBonus,
      combo: state.combo,
    };
  }

  return {
    spawnOrder,
    seedInitialOrders,
    stepOrders,
    settleServedPlate,
  };
}
