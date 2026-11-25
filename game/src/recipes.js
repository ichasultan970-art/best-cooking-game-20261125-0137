// Ingredients, kitchen prep transforms, combinational recipes, and mid-assembly matching helpers.

import { COOK_TIMINGS } from './config.js';

export const INGREDIENTS = {
  tomato: { key: 'tomato', name: 'Vine Tomato', short: 'TOMATO', keyHint: '1', color: '#e13f2e' },
  herbs: { key: 'herbs', name: 'Fresh Basil', short: 'HERBS', keyHint: '2', color: '#3ea44b' },
  mushroom: { key: 'mushroom', name: 'Cremini', short: 'SHROOM', keyHint: '3', color: '#9c785c' },
  salmon: { key: 'salmon', name: 'Wild Salmon', short: 'SALMON', keyHint: '4', color: '#f27c5c' },
  steak: { key: 'steak', name: 'Prime Steak', short: 'STEAK', keyHint: '5', color: '#9e2a2b' },
  dough: { key: 'dough', name: 'Artisan Dough', short: 'DOUGH', keyHint: '6', color: '#f3ddb0' },
};

export const CRATE_ORDER = ['tomato', 'herbs', 'mushroom', 'salmon', 'steak', 'dough'];

export const ITEMS = {
  tomato: { key: 'tomato', label: 'Tomato', raw: true, stationHint: 'chop' },
  herbs: { key: 'herbs', label: 'Herbs', raw: true, stationHint: 'chop' },
  mushroom: { key: 'mushroom', label: 'Mushroom', raw: true, stationHint: 'chop' },
  salmon: { key: 'salmon', label: 'Raw Salmon', raw: true, stationHint: 'skillet' },
  steak: { key: 'steak', label: 'Raw Steak', raw: true, stationHint: 'skillet' },
  dough: { key: 'dough', label: 'Raw Dough', raw: true, stationHint: 'oven' },

  diced_tomato: { key: 'diced_tomato', label: 'Diced Tomato', platedName: 'Diced Tomato', stationHint: 'chop' },
  minced_herbs: { key: 'minced_herbs', label: 'Minced Herbs', platedName: 'Herb Garnish', stationHint: 'chop' },
  sliced_mushroom: { key: 'sliced_mushroom', label: 'Sliced Shroom', platedName: 'Sliced Shroom', stationHint: 'chop' },
  seared_salmon: { key: 'seared_salmon', label: 'Seared Salmon', platedName: 'Seared Salmon', stationHint: 'skillet' },
  seared_steak: { key: 'seared_steak', label: 'Seared Steak', platedName: 'Prime Steak', stationHint: 'skillet' },
  sauteed_mushroom: { key: 'sauteed_mushroom', label: 'Glazed Shrooms', platedName: 'Glazed Shrooms', stationHint: 'skillet' },
  tomato_bisque: { key: 'tomato_bisque', label: 'Tomato Bisque', platedName: 'Tomato Bisque', stationHint: 'pot' },
  broth_noodles: { key: 'broth_noodles', label: 'Herb Noodles', platedName: 'Herb Noodles', stationHint: 'pot' },
  baked_flatbread: { key: 'baked_flatbread', label: 'Flatbread', platedName: 'Crust', stationHint: 'oven' },
  burnt: { key: 'burnt', label: 'Charred Scrap', burnt: true, stationHint: 'trash' },
};

export const TRANSFORMS = {
  chop: {
    tomato: { result: 'diced_tomato', mode: 'chop' },
    herbs: { result: 'minced_herbs', mode: 'chop' },
    mushroom: { result: 'sliced_mushroom', mode: 'chop' },
  },
  skillet: {
    salmon: { result: 'seared_salmon', duration: COOK_TIMINGS.skilletDuration, sweetSpot: true },
    steak: { result: 'seared_steak', duration: COOK_TIMINGS.skilletDuration + 0.5, sweetSpot: true },
    sliced_mushroom: { result: 'sauteed_mushroom', duration: COOK_TIMINGS.skilletDuration - 1.1, sweetSpot: true },
  },
  pot: {
    diced_tomato: { result: 'tomato_bisque', duration: COOK_TIMINGS.kettleDuration, sweetSpot: true },
    dough: { result: 'broth_noodles', duration: COOK_TIMINGS.kettleDuration - 0.4, sweetSpot: true },
  },
  oven: {
    dough: { result: 'baked_flatbread', duration: COOK_TIMINGS.ovenDuration, sweetSpot: true },
  },
};

export const RECIPES = {
  margherita_flatbread: {
    id: 'margherita_flatbread',
    name: 'BLISTERED FLATBREAD',
    shortName: 'FLATBREAD',
    price: 42,
    components: ['baked_flatbread', 'diced_tomato', 'minced_herbs'],
  },
  herb_salmon: {
    id: 'herb_salmon',
    name: 'HEARTH SEARED SALMON',
    shortName: 'SEARED SALMON',
    price: 54,
    components: ['seared_salmon', 'diced_tomato', 'minced_herbs'],
  },
  steak_shrooms: {
    id: 'steak_shrooms',
    name: 'PRIME STEAK & SHROOMS',
    shortName: 'STEAK & SHROOMS',
    price: 64,
    components: ['seared_steak', 'sauteed_mushroom', 'minced_herbs'],
  },
  ember_bisque: {
    id: 'ember_bisque',
    name: 'EMBER TOMATO BISQUE',
    shortName: 'TOMATO BISQUE',
    price: 52,
    components: ['tomato_bisque', 'baked_flatbread', 'minced_herbs'],
  },
  salmon_noodles: {
    id: 'salmon_noodles',
    name: 'WOODLAND SALMON BOWL',
    shortName: 'SALMON BOWL',
    price: 62,
    components: ['broth_noodles', 'seared_salmon', 'sliced_mushroom'],
  },
  hearth_feast: {
    id: 'hearth_feast',
    name: "CHEF'S HEARTH FEAST",
    shortName: 'HEARTH FEAST',
    price: 92,
    components: ['seared_steak', 'seared_salmon', 'sauteed_mushroom', 'minced_herbs'],
  },
};

export const ALL_RECIPE_LIST = Object.values(RECIPES);

export function createPlate(initialItems = [], perfectCount = 0) {
  return {
    kind: 'plate',
    items: [...initialItems],
    perfectCount,
    completedRecipeId: identifyCompletedRecipe(initialItems),
  };
}

export function isPlatableItem(itemKey) {
  return Boolean(itemKey && ALL_RECIPE_LIST.some((r) => r.components.includes(itemKey)));
}

export function canAddComponentToPlate(plateItems, itemKey) {
  if (!isPlatableItem(itemKey)) return false;
  if (plateItems.includes(itemKey)) return false;
  const candidate = [...plateItems, itemKey];
  return ALL_RECIPE_LIST.some((recipe) => candidate.every((comp) => recipe.components.includes(comp)));
}

export function identifyCompletedRecipe(plateItems) {
  for (const recipe of ALL_RECIPE_LIST) {
    if (
      recipe.components.length === plateItems.length &&
      recipe.components.every((comp) => plateItems.includes(comp))
    ) {
      return recipe.id;
    }
  }
  return null;
}

export function findCandidateRecipes(plateItems, activeOrders = []) {
  const orderIds = new Set(activeOrders.map((o) => o.recipeId));
  return ALL_RECIPE_LIST
    .filter((r) => plateItems.every((comp) => r.components.includes(comp)))
    .sort((a, b) => {
      const aOrdered = orderIds.has(a.id) ? 1 : 0;
      const bOrdered = orderIds.has(b.id) ? 1 : 0;
      if (aOrdered !== bOrdered) return bOrdered - aOrdered;
      const aDiff = a.components.length - plateItems.length;
      const bDiff = b.components.length - plateItems.length;
      return aDiff - bDiff;
    });
}

export function getRecipeProgress(plate, activeOrders = []) {
  if (!plate || plate.kind !== 'plate') return null;
  if (plate.completedRecipeId) {
    const recipe = RECIPES[plate.completedRecipeId];
    return {
      recipe,
      completed: true,
      doneCount: recipe.components.length,
      totalCount: recipe.components.length,
      missing: [],
    };
  }
  const candidates = findCandidateRecipes(plate.items, activeOrders);
  const recipe = candidates[0] ?? null;
  if (!recipe) return null;
  const missing = recipe.components.filter((c) => !plate.items.includes(c));
  return {
    recipe,
    completed: false,
    doneCount: plate.items.length,
    totalCount: recipe.components.length,
    missing,
  };
}

export function getComponentSourceChain(componentKey) {
  switch (componentKey) {
    case 'diced_tomato':
      return ['tomato', 'chop'];
    case 'minced_herbs':
      return ['herbs', 'chop'];
    case 'sliced_mushroom':
      return ['mushroom', 'chop'];
    case 'seared_salmon':
      return ['salmon', 'skillet'];
    case 'seared_steak':
      return ['steak', 'skillet'];
    case 'sauteed_mushroom':
      return ['mushroom', 'chop', 'skillet'];
    case 'tomato_bisque':
      return ['tomato', 'chop', 'pot'];
    case 'broth_noodles':
      return ['dough', 'pot'];
    case 'baked_flatbread':
      return ['dough', 'oven'];
    default:
      return [];
  }
}
