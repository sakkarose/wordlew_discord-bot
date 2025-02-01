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
    const gameNumber = parseInt(match);
    const score = parseInt(match) || 'X'; // Handle 'X' for failures
    const grid = match;

    // Encode the grid data
    const encodedGrid = encodeGrid(grid);

    // Store the data in KV
    const userId = message.author.id;
    let userData = await KV_NAMESPACE.get(userId, { type: "json" }) ||;
    userData.push({ gameNumber, score, grid: encodedGrid });
    await KV_NAMESPACE.put(userId, JSON.stringify(userData));

    console.log(`Stored Wordle result for ${message.author.tag}: Game ${gameNumber}, Score ${score}`);
  }

  // Command handling (example for /stats)
  if (message.content.startsWith('/stats')) {
    const userId = message.mentions.users.first()?.id || message.author.id;
    const stats = await calculateStats(userId);
    //... format and send the stats as a message...
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
  const userData = await KV_NAMESPACE.get(userId, { type: "json" }) ||;
  //... calculate stats based on userData...
  return {
    //... stats object...
  };
}

client.login(TOKEN);

export default {
  async fetch(request, env) {
    return new Response('Wordle bot is running!');
  }
};