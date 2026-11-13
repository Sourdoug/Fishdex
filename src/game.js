// Logique pure du jeu (aucune dépendance à Discord) : facile à tester.
const { RARITIES, FISH, FISH_BY_ID } = require('./data/fish');
const { CATEGORIES, BAITS, ITEMS } = require('./data/shop');

const STARTING_COINS = 50;
const MAX_CATCH_CHANCE = 0.98;

function createPlayer(id) {
  return {
    id,
    coins: STARTING_COINS,
    equipment: { canne: 0, moulinet: 0, ligne: 0, bourriche: 0 },
    baits: Object.fromEntries(BAITS.map((b) => [b.id, 0])),
    inventory: [], // [{ fishId, kg }]
    lastCast: 0,
    stats: { casts: 0, caught: 0, lineBreaks: 0, earned: 0, biggest: null },
  };
}

// Complète un joueur chargé depuis une ancienne sauvegarde.
function normalizePlayer(player) {
  const fresh = createPlayer(player.id);
  return {
    ...fresh,
    ...player,
    equipment: { ...fresh.equipment, ...player.equipment },
    baits: { ...fresh.baits, ...player.baits },
    stats: { ...fresh.stats, ...player.stats },
  };
}

function getGear(player) {
  const gear = {};
  for (const [category, cat] of Object.entries(CATEGORIES)) {
    gear[category] = cat.tiers[player.equipment[category]];
  }
  return gear;
}

function bestBait(player) {
  // BAITS est trié du moins bon au meilleur
  for (let i = BAITS.length - 1; i >= 0; i--) {
    if ((player.baits[BAITS[i].id] || 0) > 0) return BAITS[i];
  }
  return null;
}

// ---------- Marché ----------

// Hash déterministe (FNV-1a) -> nombre dans [0, 1)
function hash01(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0x100000000;
}

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10); // AAAA-MM-JJ (UTC)
}

// Cours du jour : multiplicateur entre 0.80 et 1.30, identique pour tous les joueurs ce jour-là.
function marketMultiplier(fishId, date = new Date()) {
  const r = hash01(`${dayKey(date)}:${fishId}`);
  return Math.round((0.8 + r * 0.5) * 100) / 100;
}

function averageKg(fish) {
  return (fish.minKg + fish.maxKg) / 2;
}

// Prix de revente d'un poisson précis.
function fishValue(fish, kg, multiplier = 1) {
  const value = fish.basePrice * (kg / averageKg(fish)) * multiplier;
  return Math.max(1, Math.round(value));
}

// ---------- Pêche ----------

function rarityWeights(luck) {
  const weights = {};
  for (const [key, r] of Object.entries(RARITIES)) {
    // La chance favorise les raretés élevées et réduit les déchets.
    weights[key] = r.tier < 0 ? r.weight / (1 + luck) : r.weight * Math.pow(1 + luck, r.tier);
  }
  return weights;
}

function pickWeighted(entries, rng) {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = rng() * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll < 0) return key;
  }
  return entries[entries.length - 1][0];
}

function rollFish(luck, rng) {
  const rarity = pickWeighted(Object.entries(rarityWeights(luck)), rng);
  const pool = FISH.filter((f) => f.rarity === rarity);
  const fish = pool[Math.floor(rng() * pool.length)];
  // Les petits spécimens sont plus fréquents que les gros.
  const kg = fish.minKg + (fish.maxKg - fish.minKg) * Math.pow(rng(), 2);
  return { fish, kg: Math.round(kg * 100) / 100 };
}

/**
 * Effectue un lancer.
 * Retourne { type: 'cooldown' | 'full' | 'miss' | 'break' | 'catch', ... }
 */
function cast(player, now = Date.now(), rng = Math.random) {
  const gear = getGear(player);

  const cooldownMs = gear.moulinet.cooldown * 1000;
  const elapsed = now - player.lastCast;
  if (elapsed < cooldownMs) {
    return { type: 'cooldown', remaining: Math.ceil((cooldownMs - elapsed) / 1000) };
  }
  if (player.inventory.length >= gear.bourriche.capacity) {
    return { type: 'full', capacity: gear.bourriche.capacity };
  }

  player.lastCast = now;
  player.stats.casts++;

  const bait = bestBait(player);
  if (bait) player.baits[bait.id]--;
  const luck = gear.canne.luck + (bait ? bait.luck : 0);
  const catchChance = Math.min(MAX_CATCH_CHANCE, gear.canne.catchChance + (bait ? bait.bite : 0));

  if (rng() > catchChance) {
    return { type: 'miss', bait };
  }

  const { fish, kg } = rollFish(luck, rng);

  if (kg > gear.ligne.maxKg) {
    player.stats.lineBreaks++;
    return { type: 'break', fish, kg, maxKg: gear.ligne.maxKg, bait };
  }

  player.inventory.push({ fishId: fish.id, kg });
  player.stats.caught++;
  const b = player.stats.biggest;
  if (fish.rarity !== 'dechet' && (!b || kg > b.kg)) {
    player.stats.biggest = { fishId: fish.id, kg };
  }
  return { type: 'catch', fish, kg, value: fishValue(fish, kg, marketMultiplier(fish.id)), bait };
}

// ---------- Vente ----------

/**
 * Vend les poissons de l'inventaire. fishId = null pour tout vendre.
 * Retourne { count, total, lines: [{ fish, count, total }] }
 */
function sell(player, fishId = null, date = new Date()) {
  const keep = [];
  const byFish = new Map();
  for (const entry of player.inventory) {
    if (fishId && entry.fishId !== fishId) {
      keep.push(entry);
      continue;
    }
    const fish = FISH_BY_ID[entry.fishId];
    if (!fish) continue; // poisson retiré du catalogue : ignoré
    const value = fishValue(fish, entry.kg, marketMultiplier(fish.id, date));
    const line = byFish.get(fish.id) || { fish, count: 0, total: 0 };
    line.count++;
    line.total += value;
    byFish.set(fish.id, line);
  }
  const lines = [...byFish.values()].sort((a, b) => b.total - a.total);
  const total = lines.reduce((s, l) => s + l.total, 0);
  const count = lines.reduce((s, l) => s + l.count, 0);

  player.inventory = keep;
  player.coins += total;
  player.stats.earned += total;
  return { count, total, lines };
}

// Valeur estimée de l'inventaire au cours du jour.
function inventoryValue(player, date = new Date()) {
  return player.inventory.reduce((s, e) => {
    const fish = FISH_BY_ID[e.fishId];
    return fish ? s + fishValue(fish, e.kg, marketMultiplier(fish.id, date)) : s;
  }, 0);
}

// ---------- Achat ----------

/**
 * Achète un objet de la boutique.
 * Retourne { ok: true, entry } ou { ok: false, error }
 */
/**
 * Ajoute (ou retire si négatif) des pièces. Le solde ne descend jamais sous 0.
 * Retourne le montant réellement appliqué.
 */
function addCoins(player, amount) {
  const before = player.coins;
  player.coins = Math.max(0, player.coins + Math.trunc(amount));
  return player.coins - before;
}

function buy(player, itemId) {
  const entry = ITEMS[itemId];
  if (!entry || entry.item.price <= 0) {
    return { ok: false, error: 'Cet objet n\'existe pas dans la boutique.' };
  }

  if (entry.type === 'upgrade') {
    const current = player.equipment[entry.category];
    if (current >= entry.level) {
      return { ok: false, error: `Vous possédez déjà un équipement égal ou meilleur (${getGear(player)[entry.category].name}).` };
    }
  }

  if (player.coins < entry.item.price) {
    return { ok: false, error: `Il vous manque **${entry.item.price - player.coins}** 🪙 pour acheter ${entry.item.name}.` };
  }

  player.coins -= entry.item.price;
  if (entry.type === 'upgrade') {
    player.equipment[entry.category] = entry.level;
  } else {
    player.baits[entry.item.id] = (player.baits[entry.item.id] || 0) + entry.item.quantity;
  }
  return { ok: true, entry };
}

module.exports = {
  STARTING_COINS,
  createPlayer,
  normalizePlayer,
  getGear,
  bestBait,
  marketMultiplier,
  fishValue,
  rarityWeights,
  rollFish,
  cast,
  sell,
  inventoryValue,
  buy,
  addCoins,
};
