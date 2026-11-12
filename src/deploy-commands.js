// Enregistre les commandes slash auprès de Discord. À lancer une fois (et après chaque modif des commandes).
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { definitions } = require('./commands');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('DISCORD_TOKEN et CLIENT_ID sont requis dans le fichier .env');
  process.exit(1);
}

const rest = new REST().setToken(DISCORD_TOKEN);
const body = definitions.map((d) => d.toJSON());

(async () => {
  const route = GUILD_ID
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    : Routes.applicationCommands(CLIENT_ID);
  await rest.put(route, { body });
  console.log(`✅ ${body.length} commandes déployées ${GUILD_ID ? `sur le serveur ${GUILD_ID}` : 'globalement'}.`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
