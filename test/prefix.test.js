const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');

// Sauvegarde isolée pour ne pas toucher aux vraies données.
process.env.DATA_FILE = path.join(os.tmpdir(), `fishdex-test-${process.pid}.json`);

const { handleMessage, findFish, findItem } = require('../src/prefix');
const storage = require('../src/storage');

// Faux message Discord : enregistre la réponse envoyée.
function fakeMessage(content, userId = 'u1') {
  const msg = {
    content,
    author: { id: userId, bot: false, username: 'testeur', displayAvatarURL: () => '' },
    mentions: { users: { first: () => undefined } },
    client: {},
    replies: [],
    reply: async (payload) => msg.replies.push(payload),
  };
  return msg;
}

test('trouve un poisson par code, par nom avec accents ou par début de nom', () => {
  assert.equal(findFish('carpe').id, 'carpe');
  assert.equal(findFish('Carpe koï').id, 'carpe_koi');
  assert.equal(findFish('cœlacanthe').id, 'coelacanthe');
  assert.equal(findFish('esturg').id, 'esturgeon');
  assert.equal(findFish('xyz'), null);
});

test('trouve un objet par code ou par nom', () => {
  assert.equal(findItem('canne_fibre').id, 'canne_fibre');
  assert.equal(findItem('Canne en fibre').id, 'canne_fibre');
  assert.equal(findItem('leurre').id, 'appat_leurre');
  assert.equal(findItem('canne'), null); // ambigu
});

test('!pecher répond et ignore les messages sans préfixe ou de bots', async () => {
  const m = fakeMessage('!pecher');
  await handleMessage(m);
  assert.equal(m.replies.length, 1);
  assert.equal(m.replies[0].flags, undefined);

  const plain = fakeMessage('pecher');
  await handleMessage(plain);
  assert.equal(plain.replies.length, 0);

  const bot = fakeMessage('!pecher');
  bot.author.bot = true;
  await handleMessage(bot);
  assert.equal(bot.replies.length, 0);
});

test('une commande inconnue est ignorée', async () => {
  const m = fakeMessage('!play musique');
  await handleMessage(m);
  assert.equal(m.replies.length, 0);
});

test('!acheter puis !vendre modifient le joueur', async () => {
  const player = storage.getPlayer('u2');
  player.coins = 200;
  await handleMessage(fakeMessage('!acheter canne en fibre', 'u2'));
  assert.equal(player.equipment.canne, 1);
  assert.equal(player.coins, 50);

  player.inventory = [{ fishId: 'carpe', kg: 8 }, { fishId: 'gardon', kg: 0.3 }];
  await handleMessage(fakeMessage('!vendre carpe', 'u2'));
  assert.equal(player.inventory.length, 1);
  await handleMessage(fakeMessage('!vendre', 'u2'));
  assert.equal(player.inventory.length, 0);
});

test('!aide liste les commandes', async () => {
  const m = fakeMessage('!aide');
  await handleMessage(m);
  assert.match(m.replies[0].embeds[0].data.description, /!pecher/);
});
