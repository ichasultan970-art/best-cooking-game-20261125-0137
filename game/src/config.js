// Game constants, timing curves, wave progression, and bistro palette for Ember & Pass.

export const WORLD = {
  width: 1280,
  height: 800,
  hudHeight: 144,
  floorMarginX: 22,
  floorBottomY: 774,
};

export const STEP = 1 / 60;
export const BEST_SCORE_KEY = 'ember_and_pass_best_score_v1';

export const MODES = {
  standard: {
    id: 'standard',
    label: 'BISTRO SHIFT',
    durationSec: 180,
    subtitle: '3:00 Full Service',
  },
  rush: {
    id: 'rush',
    label: 'DINNER RUSH',
    durationSec: 120,
    subtitle: '2:00 Fast Tempo',
  },
};

export const CHEF_CONFIG = {
  radius: 20,
  walkSpeed: 292,
  dashSpeed: 640,
  dashDuration: 0.16,
  dashCooldown: 0.9,
  interactRadius: 102,
};

export const COOK_TIMINGS = {
  chopTapProgress: 0.28,
  chopHoldRate: 0.92,
  skilletDuration: 5.4,
  kettleDuration: 6.2,
  ovenDuration: 5.0,
  sweetSpotStart: 0.72,
  sweetSpotEnd: 0.98,
  burnLimit: 1.38,
  perfectBonus: 15,
};

export const WAVES = [
  {
    id: 1,
    name: 'WARM-UP SERVICE',
    minElapsedSec: 0,
    maxOrders: 3,
    spawnIntervalSec: 10.5,
    ticketLifetimeSec: 52,
    vipChance: 0.0,
    recipePool: ['margherita_flatbread', 'herb_salmon', 'steak_shrooms'],
  },
  {
    id: 2,
    name: 'DINNER RUSH',
    minElapsedSec: 50,
    maxOrders: 4,
    spawnIntervalSec: 8.2,
    ticketLifetimeSec: 46,
    vipChance: 0.22,
    recipePool: ['margherita_flatbread', 'herb_salmon', 'steak_shrooms', 'ember_bisque', 'salmon_noodles'],
  },
  {
    id: 3,
    name: 'PEAK SERVICE',
    minElapsedSec: 112,
    maxOrders: 5,
    spawnIntervalSec: 6.8,
    ticketLifetimeSec: 42,
    vipChance: 0.34,
    recipePool: [
      'margherita_flatbread',
      'herb_salmon',
      'steak_shrooms',
      'ember_bisque',
      'salmon_noodles',
      'hearth_feast',
    ],
  },
];

export const PALETTE = {
  bgDark: '#17110d',
  walnutDark: '#261a14',
  walnutMid: '#3c281d',
  brassBright: '#e3b254',
  brassDeep: '#9e7023',
  creamTicket: '#fbf3e2',
  creamLine: '#dfd1b6',
  tileLight: '#eedbc0',
  tileWarm: '#dfbea0',
  tileGrout: '#c5a182',
  counterWood: '#7a4b2c',
  counterWoodDark: '#55321c',
  mapleLight: '#dca76b',
  mapleEdge: '#b77f46',
  marbleTop: '#f3ede3',
  marbleVein: '#d6cdc0',
  marbleSide: '#bdb2a3',
  hearthStone: '#3b3735',
  hearthGlow: '#ff6f28',
  copper: '#c96c3a',
  copperHighlight: '#f09a64',
  emerald: '#2fb869',
  amber: '#ef9c24',
  crimson: '#d94136',
  ink: '#241812',
  inkMuted: '#655144',
};
