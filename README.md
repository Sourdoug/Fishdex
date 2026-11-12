# 🎣 Bot de pêche Discord

Mini-jeu de pêche pour Discord : lancez votre ligne, attrapez des poissons de différentes raretés, revendez-les au cours du jour et améliorez votre matériel.

## Commandes

Préfixe : `!` (modifiable avec `PREFIX=` dans `.env`). Les mêmes commandes existent aussi en commandes slash (`/pecher`…).

| Commande | Description |
|---|---|
| `!pecher` (`!p`) | Lancer sa ligne (avec un bouton **Relancer**) |
| `!inventaire` (`!inv`) | Voir sa bourriche et la valeur estimée des poissons |
| `!vendre` / `!vendre carpe` | Tout vendre, ou un seul type de poisson |
| `!prix` | Prix de chaque poisson aujourd'hui (📈 / 📉) |
| `!boutique` | Matériel et appâts, avec leur code |
| `!acheter <code>` | Ex. `!acheter canne_fibre` (le nom fonctionne aussi) |
| `!profil` / `!profil @joueur` | Solde, matériel, statistiques |
| `!classement` (`!top`) | Top 10 des joueurs les plus riches |
| `!aide` | Liste des commandes |

> Les commandes `!` nécessitent d'activer **Message Content Intent** dans le portail développeur Discord (Bot → Privileged Gateway Intents).

## Règles du jeu

**Poissons** — 15 espèces réparties en 6 raretés (déchet, commun, peu commun, rare, épique, légendaire). Chaque espèce a un **prix de base** et une plage de poids.

**Prix** — `prix = prix de base × (poids / poids moyen) × cours du jour`. Le cours de chaque espèce varie entre ×0,80 et ×1,30 et change chaque jour à minuit UTC : vendez au bon moment !

**Matériel** (améliorable dans la boutique) :

- 🎣 **Canne** : chance de touche et chance d'attraper des poissons rares
- ⚙️ **Moulinet** : temps d'attente entre deux lancers (30 s → 6 s)
- 🧵 **Ligne** : poids maximal — un poisson trop lourd casse la ligne et s'échappe
- 🪣 **Bourriche** : nombre de poissons gardés avant de devoir vendre
- 🪱 **Appâts** : consommables (lots de 10) qui augmentent la chance

Tout est configurable dans [`src/data/fish.js`](src/data/fish.js) et [`src/data/shop.js`](src/data/shop.js).

## Installation

Prérequis : [Node.js](https://nodejs.org) 18.17 ou plus.

1. Créez une application sur le [portail développeur Discord](https://discord.com/developers/applications), onglet **Bot** → **Reset Token** pour obtenir le token.
2. Invitez le bot : onglet **OAuth2 → URL Generator**, cochez `bot` et `applications.commands`, puis ouvrez l'URL générée.
3. Configurez et lancez :

```bash
npm install
cp .env.example .env    # puis remplissez DISCORD_TOKEN, CLIENT_ID (et GUILD_ID pour tester)
npm run deploy          # enregistre les commandes slash
npm start
```

Les données des joueurs sont sauvegardées dans `data/players.json`.

## Tests

```bash
npm test
```

## Structure

```
src/
  index.js            démarrage du bot
  deploy-commands.js  enregistrement des commandes slash
  commands.js         commandes et messages Discord
  game.js             logique du jeu (pêche, vente, achat, marché)
  storage.js          sauvegarde JSON
  data/fish.js        catalogue des poissons
  data/shop.js        boutique
test/game.test.js     tests de la logique
```
