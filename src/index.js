import { Client, Intents } from 'discord.js';

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

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
        const stats = await calculateUserStats(message.channel, user);
        message.channel.send(formatStats(stats));
    } else if (command === '/result') {
        const game = args[0];
        const user = args[1] || message.author.username;
        const result = await getGameResult(message.channel, game, user);
        message.channel.send(formatResult(result));
    } else if (command === '/weekly') {
        const user = args[0] || message.author.username;
        const weeklyResults = await getWeeklyResults(message.channel, user);
        message.channel.send(formatWeeklyResults(weeklyResults));
    } else {
        const wordleResult = parseWordleResult(message.content);
        if (wordleResult) {
            // No need to log results, as we will read the entire channel each time
        }
    }
});

async function calculateUserStats(channel, user) {
    const messages = await fetchAllMessages(channel);
    const stats = {
        winPercentage: 0,
        averageGuess: 0,
        currentStreak: 0,
        maxStreak: 0,
        firstPlayed: 'N/A',
        lastPlayed: 'N/A',
        played: 0,
        guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    };

    // Process messages to calculate stats
    for (const message of messages) {
        if (message.author.username === user) {
            const wordleResult = parseWordleResult(message.content);
            if (wordleResult) {
                // Update stats based on wordleResult
                stats.played++;
                stats.guessDistribution[wordleResult.guesses]++;
                if (wordleResult.guesses <= 6) {
                    stats.winPercentage = (stats.winPercentage * (stats.played - 1) + 1) / stats.played;
                }
                stats.averageGuess = (stats.averageGuess * (stats.played - 1) + wordleResult.guesses) / stats.played;
                stats.lastPlayed = message.createdAt.toDateString();
                if (stats.firstPlayed === 'N/A') {
                    stats.firstPlayed = message.createdAt.toDateString();
                }
                // Update streaks
                if (wordleResult.guesses <= 6) {
                    stats.currentStreak++;
                    if (stats.currentStreak > stats.maxStreak) {
                        stats.maxStreak = stats.currentStreak;
                    }
                } else {
                    stats.currentStreak = 0;
                }
            }
        }
    }

    return stats;
}

async function getGameResult(channel, game, user) {
    const messages = await fetchAllMessages(channel);
    for (const message of messages) {
        if (message.author.username === user) {
            const wordleResult = parseWordleResult(message.content);
            if (wordleResult && wordleResult.game === game) {
                return wordleResult;
            }
        }
    }
    return { game, guesses: 0, board: [] };
}

async function getWeeklyResults(channel, user) {
    const messages = await fetchAllMessages(channel);
    const results = [];
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const message of messages) {
        if (message.author.username === user && message.createdTimestamp >= oneWeekAgo) {
            const wordleResult = parseWordleResult(message.content);
            if (wordleResult) {
                results.push(wordleResult);
            }
        }
    }

    return results;
}

async function fetchAllMessages(channel) {
    let messages = [];
    let lastMessageId;

    while (true) {
        const fetchedMessages = await channel.messages.fetch({ limit: 100, before: lastMessageId });
        if (fetchedMessages.size === 0) break;
        messages = messages.concat(Array.from(fetchedMessages.values()));
        lastMessageId = fetchedMessages.last().id;
    }

    return messages;
}

function formatStats(stats) {
    return `
Win %: ${(stats.winPercentage * 100).toFixed(2)}%
Average Guess: ${stats.averageGuess.toFixed(2)}
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
    const match = content.match(/Wordle (\d+) (\d)\/6\*\n\n([\s\S]+)/);
    if (match) {
        const game = parseInt(match[1], 10);
        const guesses = parseInt(match[2], 10);
        const board = match[3].split('\n');
        return { game, guesses, board };
    }
    return null;
}

client.login(process.env.DISCORD_TOKEN);
