import { Client } from 'discord-worker';
import Database from './database.js'; // Assume you have a database module for storing user data

const client = new Client({
  token: process.env.DISCORD_TOKEN,
  applicationId: process.env.DISCORD_APPLICATION_ID,
  publicKey: process.env.DISCORD_PUBLIC_KEY,
  intents: ['GUILDS', 'GUILD_MESSAGES']
});

client.once('ready', () => {
  console.log('Wordlew is online!');
  client.user.setUsername('wordlew'); // Change bot name to wordlew
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const args = message.content.split(' ');
  const command = args.shift().toLowerCase();

  if (command === '/stats') {
    const user = args[0] || message.author.username;
    const stats = await Database.getUserStats(user);
    message.channel.send(formatStats(stats));
  } else if (command === '/result') {
    const game = args[0];
    const user = args[1] || message.author.username;
    const result = await Database.getGameResult(game, user);
    message.channel.send(formatResult(result));
  } else if (command === '/weekly') {
    const user = args[0] || message.author.username;
    const weeklyResults = await Database.getWeeklyResults(user);
    message.channel.send(formatWeeklyResults(weeklyResults));
  } else if (command === '/fetch') {
    await Database.fetchAllResults();
    message.channel.send('Results have been re-initialized and updated.');
  } else {
    const wordleResult = parseWordleResult(message.content);
    if (wordleResult) {
      await Database.logResult(message.author.username, wordleResult);
    }
  }
});

function formatStats(stats) {
  return `
Win %: ${stats.winPercentage}
Average Guess: ${stats.averageGuess}
Current Streak: ${stats.currentStreak}
Max Streak: ${stats.maxStreak}
First Played: ${stats.firstPlayed}
Last Played: ${stats.lastPlayed}
Played: ${stats.played}
Guess Distribution:
1: ${stats.guessDistribution[1]}
2: ${stats.guessDistribution[2]}
3: ${stats.guessDistribution[3]}
4: ${stats.guessDistribution[4]}
5: ${stats.guessDistribution[5]}
6: ${stats.guessDistribution[6]}
  `;
}

function formatResult(result) {
  return `
Wordle ${result.game} ${result.guesses}/6*

${result.board.join('\n')}
  `;
}

function formatWeeklyResults(weeklyResults) {
  return weeklyResults.map(result => `
Wordle ${result.game} - ${result.date} ${result.guesses}/6*
  `).join('\n');
}

function parseWordleResult(content) {
  // Implement parsing logic to detect and extract Wordle results from messages
  // Return an object with game number, guesses, and board if valid, otherwise return null
}

export default {
  fetch: client
};
