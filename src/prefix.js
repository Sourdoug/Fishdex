// Commandes avec préfixe dans le chat (ex. « !pecher »).
// Elles réutilisent les mêmes réponses que les commandes slash.
const { EmbedBuilder } = require('discord.js');
const { FISH } = require('./data/fish');
const { PURCHASABLE } = require('./data/shop');
const { handlers } = require('./commands');

const PREFIX = process.env.PREFIX || '!';

// « Carpe koï » -> « carpe_koi »
const normalize = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .trim()
    .replace(/[\s-]+/g, '_');

/** Trouve un élément par code ou par nom ; sinon par début de code/nom s'il n'y a qu'un seul résultat. */
function findByText(list, text, getName) {
  const q = normalize(text);
  if (!q) return null;
  const exact = list.find((x) => x.id === q || normalize(getName(x)) === q);
  if (exact) return exact;
  const partial = list.filter((x) => x.id.includes(q) || normalize(getName(x)).includes(q));
  return partial.length === 1 ? partial[0] : null;
}

const findFish = (text) => findByText(FISH, text, (f) => f.name);
const findItem = (text) => findByText(PURCHASABLE, text, (p) => p.item.name.replace(/ \(x\d+\)/, ''));

function helpEmbed() {
  const p = PREFIX;
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0x1abc9c)
        .setTitle('🎣 Commandes du jeu de pêche')
        .setDescription(
          [
            `\`${p}pecher\` (ou \`${p}p\`) — lancer sa ligne`,
            `\`${p}inventaire\` (ou \`${p}inv\`) — voir sa bourriche`,
            `\`${p}vendre\` — tout vendre · \`${p}vendre carpe\` — vendre un type de poisson`,
            `\`${p}prix\` — prix des poissons aujourd'hui`,
            `\`${p}boutique\` — matériel et appâts`,
            `\`${p}acheter <code>\` — ex. \`${p}acheter canne_fibre\``,
            `\`${p}profil\` ou \`${p}profil @joueur\` — profil de pêcheur`,
            `\`${p}classement\` (ou \`${p}top\`) — les plus riches`,
          ].join('\n'),
        ),
    ],
  };
}

// Les messages « éphémères » n'existent pas hors commandes slash : on retire ce drapeau.
const toMessage = ({ flags, ...payload }) => ({ ...payload, allowedMentions: { repliedUser: false } });

async function handleMessage(message) {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const [rawName, ...args] = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const name = normalize(rawName || '');
  const rest = args.join(' ');
  const user = message.author;
  let reply;

  switch (name) {
    case 'pecher':
    case 'peche':
    case 'p':
      reply = handlers.cast(user);
      break;
    case 'inventaire':
    case 'inv':
      reply = handlers.inventory(user);
      break;
    case 'vendre':
    case 'v': {
      if (!rest || normalize(rest) === 'tout') {
        reply = handlers.sell(user, null);
      } else {
        const fish = findFish(rest);
        reply = fish
          ? handlers.sell(user, fish.id)
          : { content: `❓ Poisson inconnu : « ${rest} ». Voir \`${PREFIX}prix\` pour la liste.` };
      }
      break;
    }
    case 'prix':
      reply = handlers.prices();
      break;
    case 'boutique':
    case 'shop':
      reply = handlers.shop(user);
      break;
    case 'acheter': {
      const item = rest && findItem(rest);
      reply = item
        ? handlers.buy(user, item.id)
        : { content: `❓ Objet inconnu${rest ? ` : « ${rest} »` : ''}. Utilisez le code affiché dans \`${PREFIX}boutique\`, ex. \`${PREFIX}acheter canne_fibre\`.` };
      break;
    }
    case 'profil':
      reply = handlers.profile(message.mentions.users.first() ?? user);
      break;
    case 'classement':
    case 'top':
      reply = await handlers.leaderboard(message.client);
      break;
    case 'aide':
    case 'help':
      reply = helpEmbed();
      break;
    default:
      return; // commande inconnue : on ignore (évite de répondre aux autres bots à préfixe !)
  }

  await message.reply(toMessage(reply));
}

module.exports = { PREFIX, handleMessage, findFish, findItem };
