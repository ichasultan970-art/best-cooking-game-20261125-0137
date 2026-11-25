// Game entrypoint: canvas DPR scaling, fixed 60 Hz simulation loop, audio feedback, and ?shot= staging.

import { createAudioEngine } from './audio.js';
import { BEST_SCORE_KEY, MODES, STEP, WORLD } from './config.js';
import { createInputController } from './input.js';
import { renderHudAndOverlays, hitTestHudButtons, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_SUMMARY, SCREEN_TITLE } from './renderHud.js';
import { renderKitchenWorld } from './renderKitchen.js';
import { stageShotScene } from './shots.js';
import { createSimulation } from './simulation.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('kitchen-canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('aria-status');

function announce(message) {
  if (statusEl) statusEl.textContent = message;
}

function readBestScore() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch {
    // Ignore storage denial in private contexts
  }
}

function resizeCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.floor(window.innerWidth * dpr));
  const h = Math.max(1, Math.floor(window.innerHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { dpr, w, h };
}

function drawFrame(state, screen, modeId, bestScore, audioMuted, summary, pointer, time) {
  const { w, h } = resizeCanvas();
  const scale = Math.min(w / WORLD.width, h / WORLD.height);
  const drawW = WORLD.width * scale;
  const drawH = WORLD.height * scale;
  const offsetX = (w - drawW) / 2;
  const offsetY = (h - drawH) / 2;

  ctx.save();
  ctx.fillStyle = '#17110d';
  ctx.fillRect(0, 0, w, h);
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  renderKitchenWorld(ctx, state, pointer, time);
  renderHudAndOverlays(ctx, state, screen, modeId, bestScore, audioMuted, summary);
  ctx.restore();
}

function runShotMode(name) {
  const sim = createSimulation(seed, 'standard');
  const staged = stageShotScene(name, sim);
  let frames = 0;

  function renderOnce() {
    drawFrame(
      sim.state,
      staged.screen,
      sim.state.modeId,
      staged.bestScore,
      false,
      staged.summary,
      null,
      staged.time,
    );
    frames += 1;
    if (frames < 2) requestAnimationFrame(renderOnce);
    else window.__shotReady = true;
  }
  requestAnimationFrame(renderOnce);
}

function runInteractiveGame() {
  const audio = createAudioEngine();
  const input = createInputController(canvas, () => audio.unlock());
  let modeId = 'standard';
  let screen = SCREEN_TITLE;
  let bestScore = readBestScore();
  let summary = null;
  let sim = createSimulation(seed, modeId);

  window.__debugGame = () => ({
    screen,
    modeId,
    score: sim.state.score,
    timeLeft: sim.state.timeLeft,
    servedCount: sim.state.servedCount,
    chef: {
      x: sim.state.chef.x,
      y: sim.state.chef.y,
      heldItem: sim.state.chef.heldItem,
      heldPlate: sim.state.chef.heldPlate,
      waypoints: sim.state.chef.waypoints,
      pendingStationId: sim.state.chef.pendingStationId,
    },
    chop1: {
      item: sim.getStation('chop_1')?.item,
      cooking: sim.getStation('chop_1')?.cooking,
    },
    orders: sim.state.orders.map((o) => ({ number: o.number, recipeId: o.recipeId, remaining: o.remaining })),
  });

  function startService() {
    sim.reset(modeId, seed + Math.floor(Math.random() * 10000));
    summary = null;
    screen = SCREEN_PLAY;
    audio.playOrderTicket();
    announce(`Ember and Pass service started. ${MODES[modeId].label}.`);
  }

  function handleSimulationEvents(events) {
    for (const ev of events) {
      if (ev.type === 'sfx_chop') audio.playChop();
      else if (ev.type === 'sfx_pickup') audio.playPickup();
      else if (ev.type === 'sfx_plate') audio.playPlateClink();
      else if (ev.type === 'sfx_sear') audio.playSearStart();
      else if (ev.type === 'sfx_sweet') audio.playSweetSpotChime();
      else if (ev.type === 'sfx_serve') {
        audio.playBellServe();
        announce(`Served ${ev.settlement.ticket.shortName ?? ev.settlement.ticket.name}. Score ${sim.state.score}.`);
      } else if (ev.type === 'sfx_dash') audio.playDash();
      else if (ev.type === 'sfx_error') audio.playErrorBuzz();
      else if (ev.type === 'order_new') audio.playOrderTicket();
      else if (ev.type === 'shift_complete') {
        summary = sim.computeSummary();
        screen = SCREEN_SUMMARY;
        if (sim.state.score > bestScore) {
          bestScore = sim.state.score;
          saveBestScore(bestScore);
        }
        audio.playShiftComplete();
        announce(`Service complete. Score ${summary.score} dollars. Rank ${summary.rank}.`);
      }
    }
  }

  let accumulator = 0;
  let lastNow = performance.now();
  let totalTime = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.25, (now - lastNow) / 1000);
    lastNow = now;
    totalTime += dt;

    const actions = input.takeActions();
    const clicks = input.takeClicks();

    for (const act of actions) {
      if (act === 'mute') {
        const muted = audio.toggleMute();
        announce(muted ? 'Sound muted.' : 'Sound enabled.');
      } else if (act === 'pause') {
        if (screen === SCREEN_PLAY) {
          screen = SCREEN_PAUSED;
          announce('Service paused.');
        } else if (screen === SCREEN_PAUSED) {
          screen = SCREEN_PLAY;
          announce('Service resumed.');
        }
      } else if (act === 'confirm' || (act === 'interact' && screen !== SCREEN_PLAY)) {
        if (screen === SCREEN_TITLE || screen === SCREEN_SUMMARY) startService();
        else if (screen === SCREEN_PAUSED) {
          screen = SCREEN_PLAY;
          announce('Service resumed.');
        }
      }
    }

    for (const click of clicks) {
      const btn = hitTestHudButtons(click.x, click.y, screen, modeId);
      if (btn === 'mode_standard') modeId = 'standard';
      else if (btn === 'mode_rush') modeId = 'rush';
      else if (btn === 'start_service' || btn === 'play_again' || btn === 'restart') startService();
      else if (btn === 'resume') screen = SCREEN_PLAY;
      else if (btn === 'toggle_pause') screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
      else if (btn === 'toggle_mute') audio.toggleMute();
      else if (screen === SCREEN_PLAY) {
        const clickEvents = [];
        sim.handleCanvasClick(click.x, click.y, clickEvents);
        handleSimulationEvents(clickEvents);
      }
    }

    if (screen === SCREEN_PLAY) {
      accumulator += dt;
      let passedActions = actions;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        const events = sim.step(STEP, input.getMoveVector(), passedActions, input.isInteractHeld());
        passedActions = [];
        handleSimulationEvents(events);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }

    drawFrame(
      sim.state,
      screen,
      modeId,
      bestScore,
      audio.isMuted(),
      summary,
      input.getPointer(),
      totalTime,
    );
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Service paused.');
    }
  });

  window.addEventListener('resize', resizeCanvas);
  announce('Ember and Pass ready. Press Space or click Start Service.');
  requestAnimationFrame(frame);
}

if (shotName) runShotMode(shotName);
else runInteractiveGame();
