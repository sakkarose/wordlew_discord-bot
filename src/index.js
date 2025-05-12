import { Router } from 'itty-router';
import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';

const router = Router();

async function verifyDiscordRequest(request, env) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  
  if (!signature || !timestamp) {
    return { isValid: false };
  }

  const body = await request.clone().text();
  const isValidRequest = verifyKey(
    body,
    signature,
    timestamp,
    env.DISCORD_PUBLIC_KEY
  );

  if (!isValidRequest) {
    return { isValid: false };
  }

  return {
    isValid: true,
    interaction: JSON.parse(body)
  };
}

// KV Data Structure
const USER_SCHEMA = {
  userId: "",
  username: "",
  stats: {
    winPercentage: 0,
    averageGuess: 0,
    currentStreak: 0,
    maxStreak: 0,
    firstPlayed: null,
    lastPlayed: null,
    played: 0,
    guessDistribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0}
  },
  games: {}
};

// Command Handlers
async function handleStatsCommand(interaction, env) {
  const user = interaction.data.options?.[0]?.value || interaction.member.user.username;
  const stats = await getUserStats(user, env);
  
  return new Response(JSON.stringify({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: formatStats(stats) }
  }), { headers: { 'Content-Type': 'application/json' } });
}

async function handleResultCommand(interaction, env) {
  const game = interaction.data.options.find(opt => opt.name === 'game').value;
  const user = interaction.data.options?.find(opt => opt.name === 'user')?.value 
    || interaction.member.user.username;
  
  const result = await getGameResult(game, user, env);
  
  return new Response(JSON.stringify({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: formatResult(result) }
  }), { headers: { 'Content-Type': 'application/json' } });
}

async function handleWeeklyCommand(interaction, env) {
  const user = interaction.data.options?.[0]?.value || interaction.member.user.username;
  const results = await getWeeklyResults(user, env);
  
  return new Response(JSON.stringify({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: formatWeeklyResults(results) }
  }), { headers: { 'Content-Type': 'application/json' } });
}

async function handleFetchCommand(interaction, env) {
  const limit = 50; // Discord allows up to 100 messages per request
  const channelId = interaction.channel_id;
  
  try {
    const messages = await fetchChannelMessages(channelId, limit, env);
    let processedCount = 0;
    
    for (const message of messages) {
      const result = await processWordleMessage(message, env);
      if (result) processedCount++;
    }
    
    return new Response(JSON.stringify({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: `Processed ${processedCount} Wordle results.` }
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Fetch error:', error);
    return new Response(JSON.stringify({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Failed to fetch messages.' }
    }), { headers: { 'Content-Type': 'application/json' } });
  }
}

async function handleAddCommand(interaction, env) {
  const game = interaction.data.options.find(opt => opt.name === 'game').value;
  const guesses = interaction.data.options.find(opt => opt.name === 'guesses').value;
  const date = interaction.data.options.find(opt => opt.name === 'date')?.value || new Date().toISOString();
  const user = interaction.member.user.username;

  const wordleResult = {
    game: parseInt(game),
    guesses: parseInt(guesses),
    board: ['⬜⬜⬜⬜⬜'], // Default board
    date
  };

  const userData = await getUserData(user, env);
  
  if (!userData.games[wordleResult.game]) {
    userData.games[wordleResult.game] = wordleResult;
    updateUserStats(userData, wordleResult);
    await updateUserData(user, userData, env);
    
    return new Response(JSON.stringify({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: `Added Wordle ${game} result.` }
    }), { headers: { 'Content-Type': 'application/json' } });
  }
  
  return new Response(JSON.stringify({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: `Wordle ${game} already exists.` }
  }), { headers: { 'Content-Type': 'application/json' } });
}

// KV Operations
async function getUserData(username, env) {
  const key = `user:${username}`;
  let userData = await env.WORDLE_STATS.get(key, { type: "json" });
  
  if (!userData) {
    userData = {...USER_SCHEMA, userId: username, username};
    await env.WORDLE_STATS.put(key, JSON.stringify(userData));
  }
  
  return userData;
}

async function updateUserData(username, newData, env) {
  const key = `user:${username}`;
  await env.WORDLE_STATS.put(key, JSON.stringify(newData));
}

// Stats Operations
async function getUserStats(username, env) {
  const userData = await getUserData(username, env);
  return userData.stats;
}

async function getGameResult(gameId, username, env) {
  const userData = await getUserData(username, env);
  return userData.games[gameId] || { game: gameId, guesses: 0, board: [] };
}

async function getWeeklyResults(username, env) {
  const userData = await getUserData(username, env);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  return Object.values(userData.games)
    .filter(game => game.date >= oneWeekAgo)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Message Processing
async function processWordleMessage(message, env) {
  const wordleResult = parseWordleResult(message.content);
  if (!wordleResult) return null;

  const userData = await getUserData(message.author.username, env);
  
  // Add new game result
  if (!userData.games[wordleResult.game]) {
    userData.games[wordleResult.game] = {
      ...wordleResult,
      date: new Date(message.createdTimestamp).toISOString()
    };
    
    // Update stats
    updateUserStats(userData, wordleResult);
    await updateUserData(message.author.username, userData, env);
  }
  
  return wordleResult;
}

function updateUserStats(userData, wordleResult) {
  const stats = userData.stats;
  stats.played++;
  stats.guessDistribution[wordleResult.guesses]++;
  
  if (wordleResult.guesses <= 6) {
    stats.winPercentage = ((stats.winPercentage * (stats.played - 1) + 100) / stats.played);
    stats.currentStreak++;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
  } else {
    stats.currentStreak = 0;
  }
  
  stats.averageGuess = ((stats.averageGuess * (stats.played - 1) + wordleResult.guesses) / stats.played);
  const now = new Date().toISOString();
  stats.lastPlayed = now;
  stats.firstPlayed = stats.firstPlayed || now;
}

// Formatting Functions
function formatStats(stats) {
  return `
Win %: ${(stats.winPercentage).toFixed(2)}%
Average Guess: ${stats.averageGuess.toFixed(2)}
Current Streak: ${stats.currentStreak}
Max Streak: ${stats.maxStreak}
First Played: ${new Date(stats.firstPlayed).toLocaleDateString()}
Last Played: ${new Date(stats.lastPlayed).toLocaleDateString()}
Played: ${stats.played}
Guess Distribution:
${Object.entries(stats.guessDistribution)
  .map(([guess, count]) => `${guess}: ${'█'.repeat(count)}${count}`)
  .join('\n')}`;
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
  const match = content.match(/Wordle (\d+) (\d)\/6\*\n\n([\s\S]+)/);
  if (match) {
    const game = parseInt(match[1], 10);
    const guesses = parseInt(match[2], 10);
    const board = match[3].split('\n');
    return { game, guesses, board };
  }
  return null;
}

async function fetchChannelMessages(channelId, limit, env) {
  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`,
    {
      headers: {
        Authorization: `Bot ${env.DISCORD_TOKEN}`,
      },
    }
  );
  
  if (!response.ok) throw new Error('Failed to fetch messages');
  return response.json();
}

// Router setup
router.get('/', (request, env) => {
  return new Response(`👋 Wordle Stats Bot`);
});

router.post('/', async (request, env) => {
  try {
    const { isValid, interaction } = await verifyDiscordRequest(request, env);
    console.log('Verification result:', { isValid, type: interaction?.type });
    
    if (!isValid || !interaction) {
      console.error('Invalid request signature');
      return new Response('Invalid request signature.', { status: 401 });
    }

    if (interaction.type === InteractionType.PING) {
      return new Response(JSON.stringify({ type: InteractionResponseType.PONG }));
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      console.log('Received command:', interaction.data.name);
      switch (interaction.data.name) {
        case 'stats': return handleStatsCommand(interaction, env);
        case 'result': return handleResultCommand(interaction, env);
        case 'weekly': return handleWeeklyCommand(interaction, env);
        case 'fetch': return handleFetchCommand(interaction, env);
        case 'add': return handleAddCommand(interaction, env);
        default: 
          console.error('Unknown command:', interaction.data.name);
          return new Response('Unknown command', { status: 400 });
      }
    }
  } catch (error) {
    console.error('Router error:', error);
    return new Response(JSON.stringify({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: `Error: ${error.message}` }
    }), { headers: { 'Content-Type': 'application/json' } });
  }
});

router.post('/webhook', async (request, env) => {
  const message = await request.json();
  
  // Verify if it's a message event
  if (message.type === 'MESSAGE_CREATE') {
    await processWordleMessage({
      content: message.content,
      author: message.author,
      createdTimestamp: new Date(message.timestamp).getTime()
    }, env);
  }
  
  return new Response('OK');
});

export default {
  fetch: router.handle
};
