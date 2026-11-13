const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('../src/game');
const { FISH_BY_ID } = require('../src/data/fish');

// Générateur pseudo-aléatoire qui renvoie une suite de valeurs fixées.
const seq = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

test('un nouveau joueur commence avec 50 pièces et le matériel de base', () => {
  const p = game.createPlayer('1');
  assert.equal(p.coins, 50);
  assert.equal(game.getGear(p).canne.name, 'Canne en bambou');
  assert.equal(p.inventory.length, 0);
});

test('le cours du marché est stable sur une journée et compris entre 0.8 et 1.3', () => {
  const d = new Date('2026-11-12T10:00:00Z');
  const m = game.marketMultiplier('carpe', d);
  assert.equal(m, game.marketMultiplier('carpe', new Date('2026-11-12T23:00:00Z')));
  assert.ok(m >= 0.8 && m <= 1.3);
});

test('le prix dépend du poids', () => {
  const carpe = FISH_BY_ID.carpe;
  assert.ok(game.fishValue(carpe, 14) > game.fishValue(carpe, 3));
  assert.equal(game.fishValue(carpe, (carpe.minKg + carpe.maxKg) / 2), carpe.basePrice);
});

test('le temps de recharge empêche de relancer trop vite', () => {
  const p = game.createPlayer('1');
  game.cast(p, 1_000_000, seq(0.1));
  const res = game.cast(p, 1_005_000, seq(0.1));
  assert.equal(res.type, 'cooldown');
  assert.equal(res.remaining, 25);
});

test('un lancer raté ne donne pas de poisson', () => {
  const p = game.createPlayer('1');
  const res = game.cast(p, 1_000_000, seq(0.99)); // > 0.60 de chance de touche
  assert.equal(res.type, 'miss');
  assert.equal(p.inventory.length, 0);
});

test('une prise ajoute le poisson à la bourriche', () => {
  const p = game.createPlayer('1');
  const res = game.cast(p, 1_000_000, seq(0.1, 0.5, 0, 0));
  assert.equal(res.type, 'catch');
  assert.equal(p.inventory.length, 1);
  assert.equal(p.stats.caught, 1);
});

test('la ligne casse si le poisson est trop lourd', () => {
  const p = game.createPlayer('1');
  // touche, rareté épique (rng proche de 1 en évitant légendaire), plus lourd possible
  const res = game.cast(p, 1_000_000, seq(0.1, 0.985, 0, 0.99));
  assert.equal(res.type, 'break');
  assert.equal(p.inventory.length, 0);
  assert.equal(p.stats.lineBreaks, 1);
});

test('la bourriche pleine empêche de pêcher', () => {
  const p = game.createPlayer('1');
  p.inventory = Array.from({ length: 10 }, () => ({ fishId: 'gardon', kg: 0.3 }));
  assert.equal(game.cast(p, 1_000_000).type, 'full');
});

test('vendre un type de poisson ne vend que celui-là', () => {
  const p = game.createPlayer('1');
  p.inventory = [
    { fishId: 'gardon', kg: 0.3 },
    { fishId: 'carpe', kg: 8 },
    { fishId: 'gardon', kg: 0.5 },
  ];
  const d = new Date('2026-11-12T12:00:00Z');
  const res = game.sell(p, 'gardon', d);
  assert.equal(res.count, 2);
  assert.equal(p.inventory.length, 1);
  assert.equal(p.coins, 50 + res.total);
});

test('tout vendre vide la bourriche', () => {
  const p = game.createPlayer('1');
  p.inventory = [{ fishId: 'saumon', kg: 10 }, { fishId: 'perche', kg: 1 }];
  const res = game.sell(p);
  assert.equal(res.count, 2);
  assert.equal(p.inventory.length, 0);
  assert.ok(res.total > 0);
});

test('acheter une amélioration', () => {
  const p = game.createPlayer('1');
  p.coins = 1000;
  assert.ok(game.buy(p, 'canne_fibre').ok);
  assert.equal(p.coins, 850);
  assert.equal(game.getGear(p).canne.name, 'Canne en fibre');
  // impossible de racheter un niveau inférieur ou égal
  assert.equal(game.buy(p, 'canne_fibre').ok, false);
});

test('impossible d\'acheter sans assez de pièces', () => {
  const p = game.createPlayer('1');
  const res = game.buy(p, 'canne_mythique');
  assert.equal(res.ok, false);
  assert.equal(p.coins, 50);
});

test('les appâts sont achetés par lot et consommés à chaque lancer', () => {
  const p = game.createPlayer('1');
  assert.ok(game.buy(p, 'appat_asticots').ok);
  assert.equal(p.baits.appat_asticots, 10);
  game.cast(p, 1_000_000, seq(0.99));
  assert.equal(p.baits.appat_asticots, 9);
});

test('la chance augmente la probabilité des poissons rares', () => {
  const low = game.rarityWeights(0);
  const high = game.rarityWeights(1);
  const share = (w) => w.legendaire / Object.values(w).reduce((a, b) => a + b, 0);
  assert.ok(share(high) > share(low) * 5);
});

test('les asticots augmentent la chance de touche', () => {
  // canne en bambou : 60 % de touche, 70 % avec des asticots
  const sans = game.createPlayer('1');
  assert.equal(game.cast(sans, 1_000_000, seq(0.65, 0.5, 0, 0)).type, 'miss');

  const avec = game.createPlayer('2');
  avec.baits.appat_asticots = 1;
  assert.equal(game.cast(avec, 1_000_000, seq(0.65, 0.5, 0, 0)).type, 'catch');
  assert.equal(avec.baits.appat_asticots, 0);
});

test('la chance de touche est plafonnée à 98 %', () => {
  const p = game.createPlayer('1');
  p.equipment.canne = 4; // 95 %
  p.baits.appat_leurre = 1; // +20 %
  assert.equal(game.cast(p, 1_000_000, seq(0.985)).type, 'miss');
});

test('les légendaires restent rares même avec le meilleur matériel', () => {
  const w = game.rarityWeights(1.5); // canne mythique + leurre doré
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  assert.ok(w.legendaire / total < 0.04);
});
