import Discord from 'discord.js';

const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES] });
const KV_NAMESPACE = env.WORDLE_STATS; // Get your KV namespace binding
const TOKEN = env.DISCORD_TOKEN; // Get your Discord bot token

client.on('ready', () => {
 console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
 if (message.author.bot) return; // Ignore messages from bots

 // Detect Wordle result messages
 const wordleRegex = /Wordle (\d+) ([1-6X])\/6\n\n([\w\n]+)/;
 const match = message.content.match(wordleRegex);

 if (match) {
  const gameNumber = parseInt(match[1]); // Get the game number from the first capturing group
  const score = match[2]; // Get the score from the second capturing group
  const grid = match[3]; // Get the grid from the third capturing group

  // Encode the grid data
  const encodedGrid = encodeGrid(grid);

  // Store the data in KV
  const userId = message.author.id;
  let userData = await KV_NAMESPACE.get(userId, { type: "json" }) || [];
  userData.push({ gameNumber, score, grid: encodedGrid });
  await KV_NAMESPACE.put(userId, JSON.stringify(userData));

  console.log(`Stored Wordle result for ${message.author.tag}: Game ${gameNumber}, Score ${score}`);
 }

 // Command handling (example for /stats)
 if (message.content.startsWith('/stats')) {
  const userId = message.mentions.users.first()?.id || message.author.id;
  const stats = await calculateStats(userId);
  const statsMessage = formatStats(stats);
  message.channel.send(statsMessage);
 }

 if (message.content.startsWith('/result')) {
  const args = message.content.split(' ');
  const gameNumber = parseInt(args[1]);
  const userId = message.mentions.users.first()?.id || message.author.id;
  const result = await getResult(userId, gameNumber);
  message.channel.send(result);
 }

 if (message.content.startsWith('/weekly')) {
  const userId = message.mentions.users.first()?.id || message.author.id;
  const weeklyResults = await getWeeklyResults(userId);
  const weeklyMessage = formatWeeklyResults(weeklyResults);
  message.channel.send(weeklyMessage);
 }

 if (message.content.startsWith('/fetch')) {
  await fetchAllResults(message.channel);
  message.channel.send('Fetched and updated all results.');
 }

 //... (implement other command handlers: /result, /weekly, /fetch)...
});

// Helper function to encode the grid
function encodeGrid(grid) {
 return grid.split('\n')
.map(row => row
 .replace(/🟨/g, 'Y')
 .replace(/🟩/g, 'G')
 .replace(/⬛/g, 'B')
  )
.join('\n');
}

// Helper function to calculate stats (example)
async function calculateStats(userId) {
 const userData = await KV_NAMESPACE.get(userId, { type: "json" }) || [];
 //... calculate stats based on userData...
 return {
  //... stats object...
 };
}

// Helper function to format stats
function formatStats(stats) {
 return `Win %: ${stats.winPercentage}\nAverage Guess: ${stats.averageGuess}\nCurrent Streak: ${stats.currentStreak}\nMax Streak: ${stats.maxStreak}\nFirst Played: ${stats.firstPlayed}\nLast Played: ${stats.lastPlayed}\nPlayed: ${stats.played}\nGuess Distribution:\n1: ${stats.guessDistribution[1]}\n2: ${stats.guessDistribution[2]}\n3: ${stats.guessDistribution[3]}\n4: ${stats.guessDistribution[4]}\n5: ${stats.guessDistribution[5]}\n6: ${stats.guessDistribution[6]}`;
}

// Helper function to get result for a specific game
async function getResult(userId, gameNumber) {
 const userData = await KV_NAMESPACE.get(userId, { type: "json" }) || [];
 const result = userData.find(data => data.gameNumber === gameNumber);
 if (!result) return 'No result found for that game.';
 return `Wordle ${result.gameNumber}, ${result.score}/6*\n\n${decodeGrid(result.grid)}`;
}

// Helper function to decode the grid
function decodeGrid(encodedGrid) {
 return encodedGrid.split('\n')
.map(row => row
 .replace(/Y/g, '🟨')
 .replace(/G/g, '🟩')
 .replace(/B/g, '⬛')
  )
.join('\n');
}

// Helper function to get weekly results
async function getWeeklyResults(userId) {
 const userData = await KV_NAMESPACE.get(userId, { type: "json" }) || [];
 const oneWeekAgo = new Date();
 oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
 return userData.filter(data => new Date(data.date) >= oneWeekAgo);
}

// Helper function to format weekly results
function formatWeeklyResults(weeklyResults) {
 return weeklyResults.map(result => `Wordle ${result.gameNumber} - ${result.date} ${result.score}/6*`).join('\n');
}

// Helper function to fetch all results
async function fetchAllResults(channel) {
 const messages = await channel.messages.fetch({ limit: 100 });
 for (const message of messages.values()) {
  const wordleRegex = /Wordle (\d+) ([1-6X])\/6\n\n([\w\n]+)/;
  const match = message.content.match(wordleRegex);
  if (match) {
   const gameNumber = parseInt(match[1]);
   const score = match[2];
   const grid = match[3];
   const encodedGrid = encodeGrid(grid);
   const userId = message.author.id;
   let userData = await KV_NAMESPACE.get(userId, { type: "json" }) || [];
   userData.push({ gameNumber, score, grid: encodedGrid });
   await KV_NAMESPACE.put(userId, JSON.stringify(userData));
  }
 }
}

client.login(TOKEN);

export default {
 async fetch(request, env) {
  return new Response('Wordle bot is running!');
 }
};