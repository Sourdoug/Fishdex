// Sauvegarde simple des joueurs dans un fichier JSON.
const fs = require('node:fs');
const path = require('node:path');
const { createPlayer, normalizePlayer } = require('./game');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'players.json');

let players = {};

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    players = Object.fromEntries(Object.entries(raw).map(([id, p]) => [id, normalizePlayer(p)]));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Impossible de lire la sauvegarde :', err);
    players = {};
  }
}

function save() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(players, null, 2));
  fs.renameSync(tmp, DATA_FILE); // écriture atomique
}

function getPlayer(userId) {
  if (!players[userId]) players[userId] = createPlayer(userId);
  return players[userId];
}

function allPlayers() {
  return Object.values(players);
}

module.exports = { load, save, getPlayer, allPlayers };
