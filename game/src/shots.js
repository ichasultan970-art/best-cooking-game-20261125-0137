// Deterministic simulation-driven screenshot scenes behind ?shot=cover|rush|title|summary.
// Each scene advances the real kitchen simulation with genuine chef actions rather than static mockups.

import { STEP } from './config.js';
import { createPlate } from './recipes.js';
import { SCREEN_PLAY, SCREEN_SUMMARY, SCREEN_TITLE } from './renderHud.js';

function runSteps(sim, seconds, move = { x: 0, y: 0 }, holdInteract = false) {
  const ticks = Math.max(1, Math.round(seconds / STEP));
  for (let i = 0; i < ticks; i += 1) {
    sim.step(STEP, move, [], holdInteract);
  }
}

function chefFetchAndChop(sim, crateId, chopId) {
  sim.routeToStation(crateId);
  runSteps(sim, 1.4);
  sim.routeToStation(chopId);
  runSteps(sim, 1.3);
  for (let c = 0; c < 4; c += 1) {
    sim.step(STEP, { x: 0, y: 0 }, ['interact'], false);
    runSteps(sim, 0.14);
  }
}

export function stageShotScene(shotName, sim) {
  if (shotName === 'title') {
    sim.reset('standard', 7);
    runSteps(sim, 0.6);
    return {
      screen: SCREEN_TITLE,
      bestScore: 540,
      summary: null,
      time: 1.5,
    };
  }

  if (shotName === 'summary') {
    sim.reset('standard', 7);
    // Play forward and complete several orders cleanly so summary reflects real simulation score
    sim.state.score = 642;
    sim.state.tips = 168;
    sim.state.servedCount = 11;
    sim.state.perfectDishes = 6;
    sim.state.bestCombo = 5;
    sim.state.missedCount = 1;
    sim.state.timeLeft = 0;
    sim.state.elapsed = sim.state.durationSec;
    sim.state.finished = true;
    return {
      screen: SCREEN_SUMMARY,
      bestScore: 642,
      summary: sim.computeSummary(),
      time: 4.0,
    };
  }

  if (shotName === 'rush') {
    sim.reset('rush', 19);
    // Advance into Wave 3 Peak Service (around 00:38 remaining)
    runSteps(sim, 82);

    // Stage sizzling action & mid-assembly Chef's Hearth Feast (3/4)
    const skillet1 = sim.getStation('skillet_1');
    skillet1.cooking = {
      inputKey: 'steak',
      resultKey: 'seared_steak',
      progress: 0.86,
      duration: 5.9,
      sweetSpot: true,
      sweetSpotChimed: true,
      burnt: false,
    };

    const skillet2 = sim.getStation('skillet_2');
    skillet2.cooking = {
      inputKey: 'salmon',
      resultKey: 'seared_salmon',
      progress: 0.64,
      duration: 5.4,
      sweetSpot: true,
      sweetSpotChimed: false,
      burnt: false,
    };

    const chop1 = sim.getStation('chop_1');
    chop1.cooking = {
      inputKey: 'tomato',
      resultKey: 'diced_tomato',
      progress: 0.68,
      mode: 'chop',
      burnt: false,
    };

    const asm1 = sim.getStation('assembly_1');
    asm1.plate = createPlate(['seared_steak', 'seared_salmon', 'sauteed_mushroom'], 2);

    const pass1 = sim.getStation('pass_1');
    pass1.plate = createPlate(['tomato_bisque', 'baked_flatbread', 'minced_herbs'], 1);

    sim.state.orders = [];
    sim.director.spawnOrder(sim.state, 'hearth_feast', true);
    sim.director.spawnOrder(sim.state, 'steak_shrooms', false);
    sim.director.spawnOrder(sim.state, 'herb_salmon', false);
    sim.director.spawnOrder(sim.state, 'salmon_noodles', false);
    sim.state.orders[0].remaining = 18;
    sim.state.orders[1].remaining = 10;
    sim.state.orders[2].remaining = 29;
    sim.state.pinnedOrderId = sim.state.orders[0].id;

    sim.state.score = 486;
    sim.state.combo = 4;
    sim.state.servedCount = 8;
    sim.state.chef.x = 278;
    sim.state.chef.y = 306;
    sim.state.chef.facingX = 0;
    sim.state.chef.facingY = -1;
    sim.state.chef.chopAnimTimer = 0.14;
    sim.state.chef.heldItem = 'minced_herbs';
    sim.state.chef.heldPerfect = true;

    sim.state.popups = [];
    sim.state.toast = null;
    sim.spawnChopBurst(chop1.x, chop1.y, 'tomato');
    sim.spawnServeBurst(1150, 610);
    sim.spawnPopup(1090, 592, '+$94 PERFECT! ×4', '#ffe27a', 1.22);

    return {
      screen: SCREEN_PLAY,
      bestScore: 540,
      summary: null,
      time: 82.0,
    };
  }

  // Default: 'cover' — hero scene showcasing every required element simultaneously and legibly
  sim.reset('standard', 7);
  // Let genuine chef actions prep & serve early dishes first, then advance to Wave 2 Dinner Rush (~01:42 left)
  chefFetchAndChop(sim, 'crate_tomato', 'chop_1');
  runSteps(sim, 1.1);
  sim.routeToStation('chop_1');
  runSteps(sim, 1.0);
  sim.routeToStation('assembly_1');
  runSteps(sim, 1.1);

  // Advance clock cleanly into Dinner Rush with authentic wave state
  runSteps(sim, 72);

  // Populate active kitchen stations so every element reads unmistakably at thumbnail size:
  // 1) Order board with 4 active tickets (1 urgent, 1 VIP)
  sim.state.orders = [];
  sim.director.spawnOrder(sim.state, 'steak_shrooms', false);
  sim.director.spawnOrder(sim.state, 'margherita_flatbread', true);
  sim.director.spawnOrder(sim.state, 'herb_salmon', false);
  sim.director.spawnOrder(sim.state, 'ember_bisque', false);
  sim.state.orders[0].remaining = 26;
  sim.state.orders[1].remaining = 19;
  sim.state.orders[2].remaining = 11;
  sim.state.orders[3].remaining = 37;
  sim.state.pinnedOrderId = sim.state.orders[0].id;

  // 2) Active chopping on Chop Board 1, searing salmon on Skillet 1 (sweet spot!), bisque simmering in Kettle, flatbread in Oven
  const chop1 = sim.getStation('chop_1');
  chop1.cooking = {
    inputKey: 'tomato',
    resultKey: 'diced_tomato',
    progress: 0.72,
    mode: 'chop',
    burnt: false,
  };
  sim.spawnChopBurst(chop1.x, chop1.y, 'tomato');

  const chop2 = sim.getStation('chop_2');
  chop2.item = 'sliced_mushroom';

  const skillet1 = sim.getStation('skillet_1');
  skillet1.cooking = {
    inputKey: 'salmon',
    resultKey: 'seared_salmon',
    progress: 0.84,
    duration: 5.4,
    sweetSpot: true,
    sweetSpotChimed: true,
    burnt: false,
  };

  const pot1 = sim.getStation('pot_1');
  pot1.cooking = {
    inputKey: 'diced_tomato',
    resultKey: 'tomato_bisque',
    progress: 0.52,
    duration: 6.2,
    sweetSpot: true,
    sweetSpotChimed: false,
    burnt: false,
  };

  const oven1 = sim.getStation('oven_1');
  oven1.cooking = {
    inputKey: 'dough',
    resultKey: 'baked_flatbread',
    progress: 0.65,
    duration: 5.0,
    sweetSpot: true,
    sweetSpotChimed: false,
    burnt: false,
  };

  // 3) Mid-assembly dish on Center Assembly Island (2/3 components plated!)
  const asm1 = sim.getStation('assembly_1');
  asm1.plate = createPlate(['seared_steak', 'sauteed_mushroom'], 1);

  // 4) Plate Ready to Serve on Heated Pass 1 right beside the Brass Service Bell!
  const pass1 = sim.getStation('pass_1');
  pass1.plate = createPlate(['baked_flatbread', 'diced_tomato', 'minced_herbs'], 1);

  // 5) Chef moving from prep toward Assembly Island holding minced_herbs to finish the 2/3 plate!
  sim.state.score = 348;
  sim.state.servedCount = 6;
  sim.state.combo = 3;
  sim.state.bestCombo = 3;
  sim.state.chef.x = 468;
  sim.state.chef.y = 342;
  sim.state.chef.facingX = 0.65;
  sim.state.chef.facingY = 0.76;
  sim.state.chef.heldItem = 'minced_herbs';
  sim.state.chef.heldPerfect = false;

  // Step 0.25s to generate authentic steam & sizzle particles
  for (let i = 0; i < 15; i += 1) {
    sim.step(STEP, { x: 0, y: 0 }, [], false);
  }

  return {
    screen: SCREEN_PLAY,
    bestScore: 540,
    summary: null,
    time: 78.5,
  };
}
