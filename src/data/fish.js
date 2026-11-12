// Catalogue des poissons.
// basePrice = prix (en pièces) d'un poisson de poids moyen.
// Le prix réel dépend du poids attrapé et du cours du marché du jour.

const RARITIES = {
  dechet:     { label: 'Déchet',     emoji: '🗑️', color: 0x7f8c8d, weight: 8,  tier: -1 },
  commun:     { label: 'Commun',     emoji: '⚪', color: 0xbdc3c7, weight: 60, tier: 0 },
  peu_commun: { label: 'Peu commun', emoji: '🟢', color: 0x2ecc71, weight: 25, tier: 1 },
  rare:       { label: 'Rare',       emoji: '🔵', color: 0x3498db, weight: 10, tier: 2 },
  epique:     { label: 'Épique',     emoji: '🟣', color: 0x9b59b6, weight: 4,  tier: 3 },
  legendaire: { label: 'Légendaire', emoji: '🟡', color: 0xf1c40f, weight: 1,  tier: 4 },
};

const FISH = [
  // Déchets
  { id: 'botte',      name: 'Vieille botte',     emoji: '🥾', rarity: 'dechet',     basePrice: 1,    minKg: 0.5, maxKg: 1.5 },
  { id: 'canette',    name: 'Canette rouillée',  emoji: '🥫', rarity: 'dechet',     basePrice: 2,    minKg: 0.1, maxKg: 0.3 },
  // Communs
  { id: 'ablette',    name: 'Ablette',           emoji: '🐟', rarity: 'commun',     basePrice: 4,    minKg: 0.05, maxKg: 0.2 },
  { id: 'gardon',     name: 'Gardon',            emoji: '🐟', rarity: 'commun',     basePrice: 6,    minKg: 0.1, maxKg: 0.6 },
  { id: 'perche',     name: 'Perche',            emoji: '🐟', rarity: 'commun',     basePrice: 10,   minKg: 0.2, maxKg: 1.5 },
  // Peu communs
  { id: 'truite',     name: 'Truite',            emoji: '🐠', rarity: 'peu_commun', basePrice: 22,   minKg: 0.5, maxKg: 3 },
  { id: 'carpe',      name: 'Carpe',             emoji: '🐠', rarity: 'peu_commun', basePrice: 28,   minKg: 2,   maxKg: 15 },
  { id: 'brochet',    name: 'Brochet',           emoji: '🐠', rarity: 'peu_commun', basePrice: 35,   minKg: 1.5, maxKg: 12 },
  // Rares
  { id: 'sandre',     name: 'Sandre',            emoji: '🐡', rarity: 'rare',       basePrice: 65,   minKg: 1,   maxKg: 8 },
  { id: 'anguille',   name: 'Anguille',          emoji: '🐍', rarity: 'rare',       basePrice: 75,   minKg: 0.5, maxKg: 4 },
  { id: 'saumon',     name: 'Saumon',            emoji: '🐡', rarity: 'rare',       basePrice: 90,   minKg: 3,   maxKg: 18 },
  // Épiques
  { id: 'silure',     name: 'Silure',            emoji: '🦈', rarity: 'epique',     basePrice: 180,  minKg: 10,  maxKg: 90 },
  { id: 'esturgeon',  name: 'Esturgeon',         emoji: '🦈', rarity: 'epique',     basePrice: 260,  minKg: 8,   maxKg: 60 },
  // Légendaires
  { id: 'carpe_koi',  name: 'Carpe koï dorée',   emoji: '✨', rarity: 'legendaire', basePrice: 900,  minKg: 4,   maxKg: 20 },
  { id: 'coelacanthe',name: 'Cœlacanthe',        emoji: '🐉', rarity: 'legendaire', basePrice: 2000, minKg: 30,  maxKg: 120 },
];

const FISH_BY_ID = Object.fromEntries(FISH.map((f) => [f.id, f]));

module.exports = { RARITIES, FISH, FISH_BY_ID };
