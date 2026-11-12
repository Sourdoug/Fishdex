require('dotenv').config();
const { Client, GatewayIntentBits, Events, MessageFlags } = require('discord.js');
const storage = require('./storage');
const { handleInteraction } = require('./commands');
const { handleMessage } = require('./prefix');

if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN manquant : copiez .env.example en .env et remplissez-le.');
  process.exit(1);
}

storage.load();

// MessageContent est un intent « privilégié » : il doit être activé dans le portail développeur
// (Bot > Privileged Gateway Intents > Message Content Intent) pour lire les commandes « ! ».
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once(Events.ClientReady, (c) => {
  console.log(`🎣 Connecté en tant que ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    await handleInteraction(interaction);
  } catch (err) {
    console.error(err);
    const msg = { content: '❌ Une erreur est survenue.', flags: MessageFlags.Ephemeral };
    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    await handleMessage(message);
  } catch (err) {
    console.error(err);
    await message.reply('❌ Une erreur est survenue.').catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);
