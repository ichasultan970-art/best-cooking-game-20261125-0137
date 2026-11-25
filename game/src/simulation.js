// Core fixed-timestep kitchen simulation: chef movement, click-routing, cooking stations, plating, and scoring.

import { CHEF_CONFIG, COOK_TIMINGS, MODES, WORLD } from './config.js';
import {
  computeRouteWaypoints,
  createKitchenStations,
  findNearestStation,
  hitTestStation,
  resolveChefCollision,
} from './kitchenLayout.js';
import { createOrderDirector, createRng } from './orders.js';
import {
  canAddComponentToPlate,
  createPlate,
  identifyCompletedRecipe,
  INGREDIENTS,
  isPlatableItem,
  ITEMS,
  RECIPES,
  TRANSFORMS,
} from './recipes.js';

export function createSimulation(seed = 7, modeId = 'standard') {
  const rng = createRng(seed);
  const director = createOrderDirector(rng);

  const state = {
    seed,
    modeId,
    durationSec: MODES[modeId]?.durationSec ?? MODES.standard.durationSec,
    elapsed: 0,
    timeLeft: MODES[modeId]?.durationSec ?? MODES.standard.durationSec,
    waveIndex: 1,
    waveName: 'WARM-UP SERVICE',
    score: 0,
    tips: 0,
    combo: 0,
    bestCombo: 0,
    servedCount: 0,
    perfectDishes: 0,
    missedCount: 0,
    servedHistory: [],
    orders: [],
    pinnedOrderId: null,
    stations: createKitchenStations(),
    chef: {
      x: 620,
      y: 344,
      facingX: 0,
      facingY: 1,
      walkCycle: 0,
      moving: false,
      dashTimer: 0,
      dashCooldown: 0,
      chopAnimTimer: 0,
      bellAnimTimer: 0,
      heldItem: null,
      heldPerfect: false,
      heldPlate: null,
      waypoints: [],
      pendingStationId: null,
      interactHoldCooldown: 0,
    },
    particles: [],
    popups: [],
    toast: null,
    shake: 0,
    bellFlash: 0,
    finished: false,
  };

  function getStation(id) {
    return state.stations.find((s) => s.id === id) ?? null;
  }

  function showToast(text, tone = 'info', duration = 1.6) {
    state.toast = { text, tone, timer: duration, maxDuration: duration };
  }

  function spawnPopup(x, y, text, color = '#fff5d6', scale = 1.0) {
    state.popups.push({
      x,
      y,
      vy: -42,
      text,
      color,
      scale,
      life: 1.5,
      maxLife: 1.5,
    });
  }

  function spawnParticle(kind, x, y, vx, vy, color, size, life) {
    if (state.particles.length >= 220) state.particles.shift();
    state.particles.push({ kind, x, y, vx, vy, color, size, life, maxLife: life });
  }

  function spawnChopBurst(x, y, itemKey) {
    const colorMap = {
      tomato: '#e54837',
      herbs: '#44b456',
      mushroom: '#b59272',
    };
    const color = colorMap[itemKey] ?? '#e8c488';
    for (let i = 0; i < 9; i += 1) {
      const ang = rng() * Math.PI * 2;
      const spd = 45 + rng() * 95;
      spawnParticle('bit', x, y - 6, Math.cos(ang) * spd, Math.sin(ang) * spd - 30, color, 3 + rng() * 3, 0.42);
    }
  }

  function spawnServeBurst(x, y) {
    const palette = ['#ffd45a', '#fff4cc', '#ff8c42', '#4fe38c'];
    for (let i = 0; i < 18; i += 1) {
      const ang = (i / 18) * Math.PI * 2 + rng() * 0.2;
      const spd = 75 + rng() * 110;
      spawnParticle(
        'sparkle',
        x,
        y - 12,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd - 45,
        palette[i % palette.length],
        4 + rng() * 3,
        0.75,
      );
    }
  }

  function reset(newModeId = state.modeId, newSeed = state.seed) {
    state.modeId = newModeId;
    state.seed = newSeed;
    state.durationSec = MODES[newModeId]?.durationSec ?? MODES.standard.durationSec;
    state.elapsed = 0;
    state.timeLeft = state.durationSec;
    state.waveIndex = 1;
    state.waveName = 'WARM-UP SERVICE';
    state.score = 0;
    state.tips = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.servedCount = 0;
    state.perfectDishes = 0;
    state.missedCount = 0;
    state.servedHistory = [];
    state.orders = [];
    state.stations = createKitchenStations();
    state.chef = {
      x: 620,
      y: 344,
      facingX: 0,
      facingY: 1,
      walkCycle: 0,
      moving: false,
      dashTimer: 0,
      dashCooldown: 0,
      chopAnimTimer: 0,
      bellAnimTimer: 0,
      heldItem: null,
      heldPerfect: false,
      heldPlate: null,
      waypoints: [],
      pendingStationId: null,
      interactHoldCooldown: 0,
    };
    state.particles = [];
    state.popups = [];
    state.toast = null;
    state.shake = 0;
    state.bellFlash = 0;
    state.finished = false;
    director.seedInitialOrders(state);
    state.pinnedOrderId = state.orders[0]?.id ?? null;
  }

  function tryServePlate(plate, originStation, events) {
    if (!plate || !plate.completedRecipeId) return false;
    const settlement = director.settleServedPlate(plate, state);
    if (!settlement.matched) {
      const recipeName = RECIPES[plate.completedRecipeId]?.shortName ?? 'DISH';
      showToast(`No open ticket for ${recipeName}!`, 'warn');
      events.push({ type: 'sfx_error' });
      return false;
    }

    const popX = originStation ? originStation.x : state.chef.x;
    const popY = originStation ? originStation.y - 24 : state.chef.y - 36;
    const perfectTag = plate.perfectCount > 0 ? ' PERFECT!' : '';
    const streakTag = settlement.combo > 1 ? ` ×${settlement.combo}` : '';
    spawnPopup(popX, popY, `+$${settlement.totalEarned}${perfectTag}${streakTag}`, '#ffe27a', 1.24);
    spawnServeBurst(popX, popY);
    state.bellFlash = 0.65;
    state.chef.bellAnimTimer = 0.35;
    events.push({ type: 'sfx_serve', settlement });
    return true;
  }

  function clearHeld() {
    state.chef.heldItem = null;
    state.chef.heldPerfect = false;
    state.chef.heldPlate = null;
  }

  function interactWithStation(station, events) {
    if (!station) return false;
    const chef = state.chef;
    station.flash = 0.25;

    // 1. Ingredient crates
    if (station.kind === 'crate') {
      if (!chef.heldItem && !chef.heldPlate) {
        chef.heldItem = station.ingredient;
        chef.heldPerfect = false;
        events.push({ type: 'sfx_pickup' });
        return true;
      }
      if (chef.heldItem === station.ingredient) {
        return true;
      }
      showToast('Hands full — place item or press Q to discard', 'warn');
      events.push({ type: 'sfx_error' });
      return false;
    }

    // 2. Plate stack
    if (station.kind === 'plate_stack') {
      if (!chef.heldItem && !chef.heldPlate) {
        chef.heldPlate = createPlate();
        events.push({ type: 'sfx_plate' });
        return true;
      }
      if (chef.heldItem && isPlatableItem(chef.heldItem)) {
        const plate = createPlate([chef.heldItem], chef.heldPerfect ? 1 : 0);
        clearHeld();
        chef.heldPlate = plate;
        events.push({ type: 'sfx_plate' });
        return true;
      }
      if (chef.heldPlate && chef.heldPlate.items.length === 0) {
        clearHeld();
        events.push({ type: 'sfx_plate' });
        return true;
      }
      showToast('Take a clean plate when hands are free or holding prepped food', 'info');
      return false;
    }

    // 3. Chopping board
    if (station.kind === 'chop') {
      if (!station.item && !station.cooking) {
        const xform = chef.heldItem ? TRANSFORMS.chop[chef.heldItem] : null;
        if (xform) {
          station.cooking = {
            inputKey: chef.heldItem,
            resultKey: xform.result,
            progress: COOK_TIMINGS.chopTapProgress * 0.65,
            mode: 'chop',
            sweetSpotTriggered: false,
            burnt: false,
          };
          clearHeld();
          chef.chopAnimTimer = 0.16;
          spawnChopBurst(station.x, station.y, station.cooking.inputKey);
          events.push({ type: 'sfx_chop' });
          return true;
        }
        if (chef.heldItem) {
          showToast(`${ITEMS[chef.heldItem]?.label ?? 'Item'} goes on Hearth or Plate`, 'warn');
          events.push({ type: 'sfx_error' });
        }
        return false;
      }

      if (station.cooking) {
        station.cooking.progress = Math.min(1, station.cooking.progress + COOK_TIMINGS.chopTapProgress);
        chef.chopAnimTimer = 0.16;
        spawnChopBurst(station.x, station.y, station.cooking.inputKey);
        events.push({ type: 'sfx_chop' });
        if (station.cooking.progress >= 1) {
          station.item = station.cooking.resultKey;
          station.itemPerfect = false;
          station.cooking = null;
          spawnPopup(station.x, station.y - 24, 'CHOPPED!', '#b8f49d', 0.95);
        }
        return true;
      }

      if (station.item) {
        if (!chef.heldItem && !chef.heldPlate) {
          chef.heldItem = station.item;
          chef.heldPerfect = false;
          station.item = null;
          events.push({ type: 'sfx_pickup' });
          return true;
        }
        if (chef.heldPlate && canAddComponentToPlate(chef.heldPlate.items, station.item)) {
          chef.heldPlate.items.push(station.item);
          chef.heldPlate.completedRecipeId = identifyCompletedRecipe(chef.heldPlate.items);
          station.item = null;
          events.push({ type: 'sfx_plate' });
          return true;
        }
      }
      return false;
    }

    // 4. Heated stations: skillet, pot, oven
    if (station.kind === 'skillet' || station.kind === 'pot' || station.kind === 'oven') {
      const table = TRANSFORMS[station.kind];
      if (!station.cooking && !station.item) {
        const xform = chef.heldItem ? table[chef.heldItem] : null;
        if (xform) {
          station.cooking = {
            inputKey: chef.heldItem,
            resultKey: xform.result,
            progress: 0,
            duration: xform.duration,
            sweetSpot: xform.sweetSpot,
            sweetSpotChimed: false,
            burnt: false,
          };
          clearHeld();
          events.push({ type: 'sfx_sear' });
          return true;
        }
        if (chef.heldItem) {
          const needed = ITEMS[chef.heldItem]?.stationHint;
          if (needed === 'chop') showToast('Chop this on a Maple Board first!', 'warn');
          else showToast(`Cannot cook ${ITEMS[chef.heldItem]?.label ?? 'item'} here`, 'warn');
          events.push({ type: 'sfx_error' });
        }
        return false;
      }

      if (station.cooking) {
        const prog = station.cooking.progress;
        if (prog < COOK_TIMINGS.sweetSpotStart) {
          showToast('Still cooking — wait for the golden Sweet Spot!', 'info', 1.1);
          return false;
        }

        const isBurnt = prog >= COOK_TIMINGS.burnLimit;
        const isSweet =
          !isBurnt && prog >= COOK_TIMINGS.sweetSpotStart && prog <= COOK_TIMINGS.sweetSpotEnd;
        const pulledKey = isBurnt ? 'burnt' : station.cooking.resultKey;

        if (!chef.heldItem && !chef.heldPlate) {
          chef.heldItem = pulledKey;
          chef.heldPerfect = isSweet;
          station.cooking = null;
          if (isSweet) {
            spawnPopup(station.x, station.y - 26, 'PERFECT SEAR!', '#ffe26a', 1.05);
            events.push({ type: 'sfx_sweet' });
          } else if (isBurnt) {
            spawnPopup(station.x, station.y - 26, 'BURNT!', '#ff7666', 1.0);
            events.push({ type: 'sfx_error' });
          } else {
            events.push({ type: 'sfx_pickup' });
          }
          return true;
        }

        if (!isBurnt && chef.heldPlate && canAddComponentToPlate(chef.heldPlate.items, pulledKey)) {
          chef.heldPlate.items.push(pulledKey);
          if (isSweet) chef.heldPlate.perfectCount += 1;
          chef.heldPlate.completedRecipeId = identifyCompletedRecipe(chef.heldPlate.items);
          station.cooking = null;
          if (isSweet) {
            spawnPopup(station.x, station.y - 26, 'PERFECT + PLATED!', '#ffe26a', 1.08);
            events.push({ type: 'sfx_sweet' });
          } else {
            events.push({ type: 'sfx_plate' });
          }
          return true;
        }

        showToast(isBurnt ? 'Empty hands to clear burnt pan!' : 'Hands full!', 'warn');
        events.push({ type: 'sfx_error' });
        return false;
      }
    }

    // 5. Assembly mats & staging spots
    if (station.kind === 'assembly' || station.kind === 'staging') {
      if (station.kind === 'assembly') {
        if (!station.plate) {
          if (chef.heldPlate) {
            station.plate = chef.heldPlate;
            clearHeld();
            events.push({ type: 'sfx_plate' });
            return true;
          }
          if (chef.heldItem && isPlatableItem(chef.heldItem)) {
            station.plate = createPlate([chef.heldItem], chef.heldPerfect ? 1 : 0);
            clearHeld();
            events.push({ type: 'sfx_plate' });
            return true;
          }
          if (chef.heldItem) {
            showToast('Prep raw ingredients before plating!', 'warn');
            events.push({ type: 'sfx_error' });
          }
          return false;
        }

        // Assembly already has a plate
        if (chef.heldItem && canAddComponentToPlate(station.plate.items, chef.heldItem)) {
          station.plate.items.push(chef.heldItem);
          if (chef.heldPerfect) station.plate.perfectCount += 1;
          station.plate.completedRecipeId = identifyCompletedRecipe(station.plate.items);
          clearHeld();
          events.push({ type: 'sfx_plate' });
          if (station.plate.completedRecipeId) {
            const recipeName = RECIPES[station.plate.completedRecipeId].shortName;
            spawnPopup(station.x, station.y - 28, `${recipeName} READY!`, '#8ff0a4', 1.05);
          }
          return true;
        }
        if (chef.heldItem) {
          showToast(
            ITEMS[chef.heldItem]?.raw ? 'Cook or chop that ingredient first!' : 'Does not pair with this plate',
            'warn',
          );
          events.push({ type: 'sfx_error' });
          return false;
        }
        if (!chef.heldPlate) {
          chef.heldPlate = station.plate;
          station.plate = null;
          events.push({ type: 'sfx_pickup' });
          return true;
        }
        return false;
      }

      // Staging counter holds either a single item or a plate
      if (!station.item && !station.plate) {
        if (chef.heldPlate) {
          station.plate = chef.heldPlate;
          clearHeld();
          events.push({ type: 'sfx_plate' });
          return true;
        }
        if (chef.heldItem) {
          station.item = chef.heldItem;
          station.itemPerfect = chef.heldPerfect;
          clearHeld();
          events.push({ type: 'sfx_pickup' });
          return true;
        }
        return false;
      }
      if (station.plate && chef.heldItem && canAddComponentToPlate(station.plate.items, chef.heldItem)) {
        station.plate.items.push(chef.heldItem);
        if (chef.heldPerfect) station.plate.perfectCount += 1;
        station.plate.completedRecipeId = identifyCompletedRecipe(station.plate.items);
        clearHeld();
        events.push({ type: 'sfx_plate' });
        return true;
      }
      if (!chef.heldItem && !chef.heldPlate) {
        if (station.plate) {
          chef.heldPlate = station.plate;
          station.plate = null;
        } else if (station.item) {
          chef.heldItem = station.item;
          chef.heldPerfect = Boolean(station.itemPerfect);
          station.item = null;
          station.itemPerfect = false;
        }
        events.push({ type: 'sfx_pickup' });
        return true;
      }
      return false;
    }

    // 6. Heated Service Pass Warmers
    if (station.kind === 'pass') {
      if (!station.plate) {
        if (chef.heldPlate && chef.heldPlate.completedRecipeId) {
          station.plate = chef.heldPlate;
          clearHeld();
          events.push({ type: 'sfx_plate' });
          spawnPopup(station.x, station.y - 28, 'ON THE PASS!', '#ffe58f', 1.0);
          return true;
        }
        if (chef.heldPlate && !chef.heldPlate.completedRecipeId) {
          showToast('Finish all dish ingredients before placing on the Pass!', 'warn');
          events.push({ type: 'sfx_error' });
          return false;
        }
        return false;
      }

      if (!chef.heldItem && !chef.heldPlate) {
        // Clicking/interacting directly with a ready plate on Pass tries to serve it or pick it up
        if (tryServePlate(station.plate, station, events)) {
          station.plate = null;
          return true;
        }
        chef.heldPlate = station.plate;
        station.plate = null;
        events.push({ type: 'sfx_pickup' });
        return true;
      }
      return false;
    }

    // 7. Brass Service Bell
    if (station.kind === 'bell') {
      let servedAny = false;
      if (chef.heldPlate && chef.heldPlate.completedRecipeId) {
        if (tryServePlate(chef.heldPlate, station, events)) {
          clearHeld();
          servedAny = true;
        }
      }
      for (const passId of ['pass_1', 'pass_2']) {
        const passStation = getStation(passId);
        if (passStation?.plate?.completedRecipeId) {
          if (tryServePlate(passStation.plate, passStation, events)) {
            passStation.plate = null;
            servedAny = true;
          }
        }
      }
      if (!servedAny) {
        state.bellFlash = 0.25;
        chef.bellAnimTimer = 0.22;
        showToast('Bring a completed dish to the Pass or Bell to serve!', 'info');
      }
      return servedAny;
    }

    // 8. Compost bin
    if (station.kind === 'trash') {
      if (chef.heldItem || chef.heldPlate) {
        clearHeld();
        spawnPopup(station.x, station.y - 20, 'CLEARED', '#c5b8a8', 0.85);
        events.push({ type: 'sfx_pickup' });
        return true;
      }
      return false;
    }

    return false;
  }

  function routeToStation(stationId) {
    const station = getStation(stationId);
    if (!station) return;
    state.chef.waypoints = computeRouteWaypoints(
      state.chef.x,
      state.chef.y,
      station.approach.x,
      station.approach.y,
    );
    state.chef.pendingStationId = station.id;
  }

  function handleCanvasClick(worldX, worldY, events) {
    if (worldY <= WORLD.hudHeight) {
      // Check ticket rail clicks (x: 16..944)
      const ticketIdx = Math.floor((worldX - 16) / 184);
      if (ticketIdx >= 0 && ticketIdx < state.orders.length) {
        state.pinnedOrderId = state.orders[ticketIdx].id;
        events.push({ type: 'sfx_pickup' });
        return true;
      }
      return false;
    }

    const clickedStation = hitTestStation(worldX, worldY, state.stations);
    if (clickedStation) {
      const approachDist = Math.hypot(
        clickedStation.approach.x - state.chef.x,
        clickedStation.approach.y - state.chef.y,
      );
      if (approachDist <= 38) {
        state.chef.facingX = clickedStation.facing.x;
        state.chef.facingY = clickedStation.facing.y;
        state.chef.waypoints = [];
        state.chef.pendingStationId = null;
        interactWithStation(clickedStation, events);
      } else {
        routeToStation(clickedStation.id);
      }
      return true;
    }

    // Click open floor to walk directly there
    state.chef.waypoints = computeRouteWaypoints(state.chef.x, state.chef.y, worldX, worldY);
    state.chef.pendingStationId = null;
    return true;
  }

  function stepCookingStations(dt, events) {
    for (const st of state.stations) {
      if (st.flash > 0) st.flash = Math.max(0, st.flash - dt);
      if (!st.cooking) continue;

      if (st.kind === 'skillet' || st.kind === 'pot' || st.kind === 'oven') {
        const prev = st.cooking.progress;
        st.cooking.progress = Math.min(COOK_TIMINGS.burnLimit + 0.08, prev + dt / st.cooking.duration);

        if (prev < COOK_TIMINGS.sweetSpotStart && st.cooking.progress >= COOK_TIMINGS.sweetSpotStart) {
          st.cooking.sweetSpotChimed = true;
          events.push({ type: 'sfx_sweet' });
        }
        if (prev < COOK_TIMINGS.burnLimit && st.cooking.progress >= COOK_TIMINGS.burnLimit) {
          st.cooking.burnt = true;
          events.push({ type: 'sfx_error' });
        }

        // Ambient steam / sizzle / smoke particles
        if (rng() < dt * (st.cooking.progress >= 1 ? 14 : 6)) {
          const isDanger = st.cooking.progress >= 1.02;
          spawnParticle(
            isDanger ? 'smoke' : 'steam',
            st.x + (rng() - 0.5) * 24,
            st.y - 18,
            (rng() - 0.5) * 14,
            -26 - rng() * 18,
            isDanger ? '#3e3835' : '#fff8ed',
            isDanger ? 7 + rng() * 5 : 4 + rng() * 4,
            isDanger ? 0.75 : 0.65,
          );
        }
      }
    }

    // Gentle heat-lamp steam on ready plates resting on the Pass Warmers
    for (const passId of ['pass_1', 'pass_2']) {
      const pass = getStation(passId);
      if (pass?.plate && rng() < dt * 4.5) {
        spawnParticle(
          'steam',
          pass.x + (rng() - 0.5) * 26,
          pass.y - 16,
          (rng() - 0.5) * 10,
          -22 - rng() * 12,
          '#fff6e5',
          4 + rng() * 3,
          0.7,
        );
      }
    }
  }

  function stepChefMovement(dt, moveVec, isInteractHeld, events) {
    const chef = state.chef;
    if (chef.dashCooldown > 0) chef.dashCooldown = Math.max(0, chef.dashCooldown - dt);
    if (chef.dashTimer > 0) chef.dashTimer = Math.max(0, chef.dashTimer - dt);
    if (chef.chopAnimTimer > 0) chef.chopAnimTimer = Math.max(0, chef.chopAnimTimer - dt);
    if (chef.bellAnimTimer > 0) chef.bellAnimTimer = Math.max(0, chef.bellAnimTimer - dt);
    if (chef.interactHoldCooldown > 0) chef.interactHoldCooldown = Math.max(0, chef.interactHoldCooldown - dt);

    let vx = moveVec.x;
    let vy = moveVec.y;
    const manualInput = Math.hypot(vx, vy) > 0.05;

    if (manualInput) {
      chef.waypoints = [];
      chef.pendingStationId = null;
    } else if (chef.waypoints.length > 0) {
      const target = chef.waypoints[0];
      const dx = target.x - chef.x;
      const dy = target.y - chef.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 10) {
        chef.waypoints.shift();
        if (chef.waypoints.length === 0 && chef.pendingStationId) {
          const dest = getStation(chef.pendingStationId);
          chef.pendingStationId = null;
          if (dest) {
            chef.facingX = dest.facing.x;
            chef.facingY = dest.facing.y;
            interactWithStation(dest, events);
          }
        }
      } else {
        vx = dx / dist;
        vy = dy / dist;
      }
    }

    const moving = Math.hypot(vx, vy) > 0.05;
    chef.moving = moving;
    if (moving) {
      const len = Math.hypot(vx, vy);
      chef.facingX = vx / len;
      chef.facingY = vy / len;
      chef.walkCycle += dt * (chef.dashTimer > 0 ? 18 : 11);
    }

    const speed = chef.dashTimer > 0 ? CHEF_CONFIG.dashSpeed : CHEF_CONFIG.walkSpeed;
    const activeDirX = moving ? chef.facingX : 0;
    const activeDirY = moving ? chef.facingY : 0;

    if (chef.dashTimer > 0 && rng() < dt * 32) {
      spawnParticle('dust', chef.x, chef.y + 14, (rng() - 0.5) * 20, -10, '#f3dfbe', 5, 0.28);
    }

    const resolved = resolveChefCollision(
      chef.x + activeDirX * speed * dt,
      chef.y + activeDirY * speed * dt,
      CHEF_CONFIG.radius,
    );
    chef.x = resolved.x;
    chef.y = resolved.y;

    // Continuous chopping when holding Space/E near an active chopping board
    if (isInteractHeld && chef.interactHoldCooldown <= 0) {
      const near = findNearestStation(chef.x, chef.y, chef.facingX, chef.facingY, state.stations);
      if (near && near.kind === 'chop' && near.cooking) {
        near.cooking.progress = Math.min(1, near.cooking.progress + COOK_TIMINGS.chopHoldRate * 0.14);
        chef.chopAnimTimer = 0.14;
        chef.interactHoldCooldown = 0.14;
        spawnChopBurst(near.x, near.y, near.cooking.inputKey);
        events.push({ type: 'sfx_chop' });
        if (near.cooking.progress >= 1) {
          near.item = near.cooking.resultKey;
          near.cooking = null;
          spawnPopup(near.x, near.y - 24, 'CHOPPED!', '#b8f49d', 0.95);
        }
      }
    }
  }

  function stepEffects(dt) {
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
    if (state.bellFlash > 0) state.bellFlash = Math.max(0, state.bellFlash - dt);
    if (state.toast) {
      state.toast.timer -= dt;
      if (state.toast.timer <= 0) state.toast = null;
    }

    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'bit' || p.kind === 'sparkle') {
        p.vy += 170 * dt;
      }
    }

    for (let i = state.popups.length - 1; i >= 0; i -= 1) {
      const pop = state.popups[i];
      pop.life -= dt;
      if (pop.life <= 0) {
        state.popups.splice(i, 1);
        continue;
      }
      pop.y += pop.vy * dt;
      pop.vy *= 0.94;
    }
  }

  function step(dt, moveVec = { x: 0, y: 0 }, actions = [], isInteractHeld = false) {
    const events = [];
    if (state.finished) return events;

    state.elapsed += dt;
    state.timeLeft = Math.max(0, state.durationSec - state.elapsed);

    for (const action of actions) {
      if (action === 'interact') {
        const near = findNearestStation(
          state.chef.x,
          state.chef.y,
          state.chef.facingX,
          state.chef.facingY,
          state.stations,
        );
        interactWithStation(near, events);
      } else if (action === 'dash') {
        if (state.chef.dashCooldown <= 0) {
          state.chef.dashTimer = CHEF_CONFIG.dashDuration;
          state.chef.dashCooldown = CHEF_CONFIG.dashCooldown;
          events.push({ type: 'sfx_dash' });
        }
      } else if (action === 'drop') {
        if (state.chef.heldItem || state.chef.heldPlate) {
          clearHeld();
          showToast('Discarded held item', 'info', 1.0);
          events.push({ type: 'sfx_pickup' });
        }
      } else if (action.startsWith('crate_')) {
        const idx = Number(action.slice(6)) - 1;
        const crateKeys = Object.keys(INGREDIENTS);
        if (crateKeys[idx]) routeToStation(`crate_${crateKeys[idx]}`);
      }
    }

    stepChefMovement(dt, moveVec, isInteractHeld, events);
    stepCookingStations(dt, events);
    director.stepOrders(dt, state, events);
    stepEffects(dt);

    for (const ev of events) {
      if (ev.type === 'order_expired') {
        state.shake = 0.28;
        spawnPopup(320, 174, `MISSED #${ev.ticket.number}`, '#ff7063', 1.0);
      }
    }

    if (state.timeLeft <= 0) {
      state.finished = true;
      events.push({ type: 'shift_complete' });
    }

    return events;
  }

  function computeSummary() {
    const targetThree = state.modeId === 'rush' ? 360 : 480;
    const targetTwo = state.modeId === 'rush' ? 210 : 280;
    const targetOne = state.modeId === 'rush' ? 100 : 120;
    let stars = 0;
    if (state.score >= targetThree) stars = 3;
    else if (state.score >= targetTwo) stars = 2;
    else if (state.score >= targetOne) stars = 1;

    let rank = 'PREP APPRENTICE';
    if (stars === 3 && state.score >= targetThree + 140) rank = 'EXECUTIVE CHEF';
    else if (stars === 3) rank = 'HEAD CHEF';
    else if (stars === 2) rank = 'SOUS CHEF';
    else if (stars === 1) rank = 'LINE COOK';

    return {
      score: state.score,
      tips: state.tips,
      servedCount: state.servedCount,
      perfectDishes: state.perfectDishes,
      missedCount: state.missedCount,
      bestCombo: state.bestCombo,
      stars,
      rank,
    };
  }

  reset(modeId, seed);

  return {
    state,
    director,
    getStation,
    reset,
    step,
    handleCanvasClick,
    interactWithStation,
    routeToStation,
    spawnPopup,
    spawnChopBurst,
    spawnServeBurst,
    computeSummary,
  };
}
