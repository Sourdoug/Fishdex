// Boutique : améliorations de matériel.
// Chaque catégorie possède des niveaux ; le niveau 0 est l'équipement de départ (gratuit).

const CATEGORIES = {
  canne: {
    label: 'Canne à pêche',
    emoji: '🎣',
    description: 'Augmente la chance de touche et la chance d\'attraper des poissons rares.',
    tiers: [
      { id: 'canne_bambou',   name: 'Canne en bambou',     price: 0,     catchChance: 0.60, luck: 0 },
      { id: 'canne_fibre',    name: 'Canne en fibre',      price: 150,   catchChance: 0.70, luck: 0.15 },
      { id: 'canne_carbone',  name: 'Canne en carbone',    price: 600,   catchChance: 0.80, luck: 0.35 },
      { id: 'canne_pro',      name: 'Canne professionnelle', price: 2500, catchChance: 0.88, luck: 0.6 },
      { id: 'canne_mythique', name: 'Canne mythique',      price: 10000, catchChance: 0.95, luck: 1.0 },
    ],
  },
  moulinet: {
    label: 'Moulinet',
    emoji: '⚙️',
    description: 'Réduit le temps d\'attente entre deux lancers.',
    tiers: [
      { id: 'moulinet_basique', name: 'Moulinet basique',  price: 0,    cooldown: 30 },
      { id: 'moulinet_rapide',  name: 'Moulinet rapide',   price: 200,  cooldown: 20 },
      { id: 'moulinet_turbo',   name: 'Moulinet turbo',    price: 900,  cooldown: 12 },
      { id: 'moulinet_eclair',  name: 'Moulinet éclair',   price: 3500, cooldown: 6 },
    ],
  },
  ligne: {
    label: 'Ligne',
    emoji: '🧵',
    description: 'Poids maximal (kg) avant que la ligne ne casse.',
    tiers: [
      { id: 'ligne_nylon',     name: 'Ligne nylon',        price: 0,    maxKg: 5 },
      { id: 'ligne_tressee',   name: 'Ligne tressée',      price: 250,  maxKg: 20 },
      { id: 'ligne_fluoro',    name: 'Ligne fluorocarbone', price: 1200, maxKg: 60 },
      { id: 'ligne_titane',    name: 'Ligne en titane',    price: 5000, maxKg: 150 },
    ],
  },
  bourriche: {
    label: 'Bourriche',
    emoji: '🪣',
    description: 'Nombre de poissons que vous pouvez garder avant de devoir vendre.',
    tiers: [
      { id: 'bourriche_seau',   name: 'Petit seau',        price: 0,    capacity: 10 },
      { id: 'bourriche_panier', name: 'Panier en osier',   price: 120,  capacity: 25 },
      { id: 'bourriche_glace',  name: 'Glacière',          price: 700,  capacity: 50 },
      { id: 'bourriche_vivier', name: 'Vivier',            price: 3000, capacity: 100 },
    ],
  },
};

// Appâts : consommables (1 utilisé par lancer). Le meilleur appât possédé est utilisé en priorité.
// bite = bonus à la chance de touche, luck = bonus de rareté.
const BAITS = [
  { id: 'appat_asticots', name: 'Asticots (x10)',     emoji: '🪱', price: 30,  quantity: 10, bite: 0.10, luck: 0.05 },
  { id: 'appat_vers',     name: 'Vers de terre (x10)', emoji: '🪱', price: 90,  quantity: 10, bite: 0.15, luck: 0.20 },
  { id: 'appat_leurre',   name: 'Leurre doré (x10)',  emoji: '🌟', price: 400, quantity: 10, bite: 0.20, luck: 0.50 },
];

// Index : id d'objet -> { type, category?, level?, item }
const ITEMS = {};
for (const [category, cat] of Object.entries(CATEGORIES)) {
  cat.tiers.forEach((tier, level) => {
    ITEMS[tier.id] = { type: 'upgrade', category, level, item: tier };
  });
}
for (const bait of BAITS) {
  ITEMS[bait.id] = { type: 'bait', item: bait };
}

// Objets achetables (exclut l'équipement de départ gratuit).
const PURCHASABLE = Object.entries(ITEMS)
  .filter(([, entry]) => entry.item.price > 0)
  .map(([id, entry]) => ({ id, ...entry }));

module.exports = { CATEGORIES, BAITS, ITEMS, PURCHASABLE };
