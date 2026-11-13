// Définition des commandes slash et de leurs réponses Discord.
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { RARITIES, FISH, FISH_BY_ID } = require('./data/fish');
const { CATEGORIES, BAITS, PURCHASABLE } = require('./data/shop');
const game = require('./game');
const storage = require('./storage');

const COIN = '🪙';
const fmt = (n) => n.toLocaleString('fr-FR');
const kgFmt = (kg) => `${kg.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`;
const fishLabel = (fish) => `${fish.emoji} ${fish.name}`;

// ---------- Définitions ----------

const definitions = [
  new SlashCommandBuilder().setName('pecher').setDescription('Lancer votre ligne 🎣'),
  new SlashCommandBuilder().setName('inventaire').setDescription('Voir les poissons dans votre bourriche'),
  new SlashCommandBuilder()
    .setName('vendre')
    .setDescription('Vendre vos poissons au cours du jour')
    .addStringOption((o) =>
      o
        .setName('poisson')
        .setDescription('Type de poisson à vendre (vide = tout vendre)')
        .addChoices(...FISH.map((f) => ({ name: f.name, value: f.id }))),
    ),
  new SlashCommandBuilder().setName('prix').setDescription('Voir le prix de chaque poisson aujourd\'hui'),
  new SlashCommandBuilder().setName('boutique').setDescription('Voir le matériel et les appâts à vendre'),
  new SlashCommandBuilder()
    .setName('acheter')
    .setDescription('Acheter une amélioration ou des appâts')
    .addStringOption((o) =>
      o
        .setName('objet')
        .setDescription('Objet à acheter')
        .setRequired(true)
        .addChoices(...PURCHASABLE.map((p) => ({ name: `${p.item.name} — ${p.item.price} pièces`, value: p.id }))),
    ),
  new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Voir votre profil de pêcheur (ou celui d\'un autre joueur)')
    .addUserOption((o) => o.setName('joueur').setDescription('Joueur à consulter')),
  new SlashCommandBuilder().setName('classement').setDescription('Les pêcheurs les plus riches'),
];

// ---------- Composants ----------

function actionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cast').setLabel('Relancer').setEmoji('🎣').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('sell_all').setLabel('Tout vendre').setEmoji('💰').setStyle(ButtonStyle.Success),
  );
}

const ephemeral = (content) => ({ content, flags: MessageFlags.Ephemeral });

// ---------- Handlers ----------

function handleCast(user) {
  const player = storage.getPlayer(user.id);
  const res = game.cast(player);
  if (res.type === 'cooldown') {
    return ephemeral(`⏳ Votre ligne n'est pas encore prête. Réessayez dans **${res.remaining} s**.`);
  }
  if (res.type === 'full') {
    return {
      ...ephemeral(`🪣 Votre bourriche est pleine (${res.capacity} poissons) ! Vendez avec \`!vendre\` ou améliorez-la dans la \`!boutique\`.`),
      components: [actionRow()],
    };
  }
  storage.save();

  const embed = new EmbedBuilder().setAuthor({ name: `${user.displayName ?? user.username} pêche…` });
  const baitNote = res.bait ? `\n-# Appât utilisé : ${res.bait.emoji} ${res.bait.name.replace(/ \(x\d+\)/, '')}` : '';

  if (res.type === 'miss') {
    embed.setColor(0x95a5a6).setDescription(`🌊 Rien n'a mordu cette fois…${baitNote}`);
  } else if (res.type === 'break') {
    const r = RARITIES[res.fish.rarity];
    embed
      .setColor(0xe74c3c)
      .setDescription(
        `💥 **Votre ligne a cassé !**\nUn(e) ${fishLabel(res.fish)} de **${kgFmt(res.kg)}** (${r.label}) s'est échappé(e).\n` +
          `Votre ligne ne supporte que ${res.maxKg} kg — achetez une meilleure ligne dans la \`!boutique\`.${baitNote}`,
      );
  } else {
    const r = RARITIES[res.fish.rarity];
    embed
      .setColor(r.color)
      .setTitle(`${res.fish.emoji} ${res.fish.name} !`)
      .setDescription(
        `${r.emoji} **${r.label}** · ${kgFmt(res.kg)}\nValeur au cours du jour : **${fmt(res.value)}** ${COIN}${baitNote}`,
      );
  }
  const gear = game.getGear(player);
  embed.setFooter({ text: `Bourriche : ${player.inventory.length}/${gear.bourriche.capacity} · Solde : ${fmt(player.coins)} pièces` });
  return { embeds: [embed], components: [actionRow()] };
}

function handleInventory(user) {
  const player = storage.getPlayer(user.id);
  const gear = game.getGear(player);
  const embed = new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle(`🪣 Bourriche de ${user.displayName ?? user.username}`)
    .setFooter({ text: `${player.inventory.length}/${gear.bourriche.capacity} poissons` });

  if (player.inventory.length === 0) {
    embed.setDescription('Votre bourriche est vide. Utilisez `!pecher` !');
    return { embeds: [embed] };
  }

  const groups = new Map();
  for (const e of player.inventory) {
    const fish = FISH_BY_ID[e.fishId];
    if (!fish) continue;
    const g = groups.get(fish.id) || { fish, count: 0, kg: 0, value: 0 };
    g.count++;
    g.kg += e.kg;
    g.value += game.fishValue(fish, e.kg, game.marketMultiplier(fish.id));
    groups.set(fish.id, g);
  }
  const lines = [...groups.values()]
    .sort((a, b) => b.value - a.value)
    .map((g) => `${RARITIES[g.fish.rarity].emoji} ${fishLabel(g.fish)} ×${g.count} · ${kgFmt(g.kg)} · **${fmt(g.value)}** ${COIN}`);
  embed.setDescription(`${lines.join('\n')}\n\nValeur totale estimée : **${fmt(game.inventoryValue(player))}** ${COIN}`);
  return { embeds: [embed], components: [actionRow()] };
}

function handleSell(user, fishId) {
  const player = storage.getPlayer(user.id);
  const res = game.sell(player, fishId);
  if (res.count === 0) {
    return ephemeral(fishId ? `Vous n'avez aucun(e) ${FISH_BY_ID[fishId].name} à vendre.` : 'Votre bourriche est vide, rien à vendre.');
  }
  storage.save();
  const lines = res.lines.map((l) => `${fishLabel(l.fish)} ×${l.count} → **${fmt(l.total)}** ${COIN}`);
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle('💰 Vente au marché')
    .setDescription(`${lines.join('\n')}\n\nTotal : **+${fmt(res.total)}** ${COIN}`)
    .setFooter({ text: `Nouveau solde : ${fmt(player.coins)} pièces` });
  return { embeds: [embed] };
}

function handlePrices() {
  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle('📈 Cours du marché aux poissons')
    .setDescription('Prix pour un poisson de **poids moyen**. Plus il est lourd, plus il rapporte.\nLes cours changent chaque jour (minuit UTC).');

  for (const [key, r] of Object.entries(RARITIES)) {
    const lines = FISH.filter((f) => f.rarity === key).map((f) => {
      const m = game.marketMultiplier(f.id);
      const trend = m >= 1.15 ? '📈' : m <= 0.9 ? '📉' : '➖';
      const avg = game.fishValue(f, (f.minKg + f.maxKg) / 2, m);
      return `${fishLabel(f)} : **${fmt(avg)}** ${COIN} ${trend} ×${m.toFixed(2)} · ${f.minKg}–${f.maxKg} kg`;
    });
    if (lines.length) embed.addFields({ name: `${r.emoji} ${r.label}`, value: lines.join('\n') });
  }
  return { embeds: [embed] };
}

function handleShop(user) {
  const player = storage.getPlayer(user.id);
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('🏪 Boutique du pêcheur')
    .setDescription(`Votre solde : **${fmt(player.coins)}** ${COIN}\nAchetez avec \`!acheter <code>\`, par exemple \`!acheter canne_fibre\`.`);

  const stat = {
    canne: (t) => `touche ${Math.round(t.catchChance * 100)} %, chance +${Math.round(t.luck * 100)} %`,
    moulinet: (t) => `attente ${t.cooldown} s`,
    ligne: (t) => `max ${t.maxKg} kg`,
    bourriche: (t) => `${t.capacity} poissons`,
  };
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const owned = player.equipment[key];
    const lines = cat.tiers.map((t, lvl) => {
      const status = lvl === owned ? '✅ équipé' : lvl < owned ? '✔️' : `${fmt(t.price)} ${COIN} · \`${t.id}\``;
      return `${lvl === owned ? '**' : ''}${t.name}${lvl === owned ? '**' : ''} — ${stat[key](t)} · ${status}`;
    });
    embed.addFields({ name: `${cat.emoji} ${cat.label}`, value: `-# ${cat.description}\n${lines.join('\n')}` });
  }
  const baitLines = BAITS.map(
    (b) => `${b.emoji} ${b.name} — touche +${Math.round(b.bite * 100)} %, rareté +${Math.round(b.luck * 100)} % · ${fmt(b.price)} ${COIN} · \`${b.id}\` · possédés : ${player.baits[b.id] || 0}`,
  );
  embed.addFields({ name: '🪱 Appâts', value: `-# 1 appât consommé par lancer, le meilleur est utilisé en premier.\n${baitLines.join('\n')}` });
  return { embeds: [embed] };
}

function handleBuy(user, itemId) {
  const player = storage.getPlayer(user.id);
  const res = game.buy(player, itemId);
  if (!res.ok) return ephemeral(`❌ ${res.error}`);
  storage.save();
  const { item } = res.entry;
  const what = res.entry.type === 'bait' ? `${item.emoji} ${item.name}` : `${CATEGORIES[res.entry.category].emoji} ${item.name}`;
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setDescription(`🛒 Vous avez acheté **${what}** pour ${fmt(item.price)} ${COIN} !`)
        .setFooter({ text: `Solde restant : ${fmt(player.coins)} pièces` }),
    ],
  };
}

function handleProfile(user) {
  const player = storage.getPlayer(user.id);
  const gear = game.getGear(player);
  const s = player.stats;
  const biggest = s.biggest && FISH_BY_ID[s.biggest.fishId]
    ? `${fishLabel(FISH_BY_ID[s.biggest.fishId])} (${kgFmt(s.biggest.kg)})`
    : 'aucun';
  const baits = BAITS.filter((b) => player.baits[b.id] > 0).map((b) => `${b.emoji} ${b.name.replace(/ \(x\d+\)/, '')} ×${player.baits[b.id]}`);

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`🎣 Profil de ${user.displayName ?? user.username}`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      { name: 'Solde', value: `${fmt(player.coins)} ${COIN}`, inline: true },
      { name: 'Gains totaux', value: `${fmt(s.earned)} ${COIN}`, inline: true },
      { name: 'Bourriche', value: `${player.inventory.length}/${gear.bourriche.capacity}`, inline: true },
      {
        name: 'Matériel',
        value: Object.entries(CATEGORIES).map(([k, c]) => `${c.emoji} ${gear[k].name}`).join('\n'),
      },
      { name: 'Appâts', value: baits.length ? baits.join('\n') : 'aucun' },
      {
        name: 'Statistiques',
        value: `Lancers : ${fmt(s.casts)} · Prises : ${fmt(s.caught)} · Lignes cassées : ${fmt(s.lineBreaks)}\nPlus grosse prise : ${biggest}`,
      },
    );
  return { embeds: [embed] };
}

async function handleLeaderboard(client) {
  const top = storage
    .allPlayers()
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 10);
  if (top.length === 0) return ephemeral('Personne n\'a encore pêché !');
  const medals = ['🥇', '🥈', '🥉'];
  const lines = await Promise.all(
    top.map(async (p, i) => {
      const u = await client.users.fetch(p.id).catch(() => null);
      return `${medals[i] ?? `**${i + 1}.**`} ${u ? u.username : 'Inconnu'} — ${fmt(p.coins)} ${COIN}`;
    }),
  );
  return { embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle('🏆 Classement des pêcheurs').setDescription(lines.join('\n'))] };
}

// ---------- Routage ----------

async function handleInteraction(interaction) {
  if (interaction.isButton()) {
    if (interaction.customId === 'cast') return interaction.reply(handleCast(interaction.user));
    if (interaction.customId === 'sell_all') return interaction.reply(handleSell(interaction.user, null));
    return;
  }
  if (!interaction.isChatInputCommand()) return;

  const { user, options } = interaction;
  switch (interaction.commandName) {
    case 'pecher':
      return interaction.reply(handleCast(user));
    case 'inventaire':
      return interaction.reply(handleInventory(user));
    case 'vendre':
      return interaction.reply(handleSell(user, options.getString('poisson')));
    case 'prix':
      return interaction.reply(handlePrices());
    case 'boutique':
      return interaction.reply(handleShop(user));
    case 'acheter':
      return interaction.reply(handleBuy(user, options.getString('objet', true)));
    case 'profil':
      return interaction.reply(handleProfile(options.getUser('joueur') ?? user));
    case 'classement':
      return interaction.reply(await handleLeaderboard(interaction.client));
  }
}

module.exports = {
  definitions,
  handleInteraction,
  handlers: {
    cast: handleCast,
    inventory: handleInventory,
    sell: handleSell,
    prices: handlePrices,
    shop: handleShop,
    buy: handleBuy,
    profile: handleProfile,
    leaderboard: handleLeaderboard,
  },
};
