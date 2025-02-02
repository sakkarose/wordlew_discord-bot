import { Router } from 'itty-router';
import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';

const router = Router();

router.get('/', (request, env) => {
    return new Response(`👋 ${env.DISCORD_APPLICATION_ID}`);
});

router.post('/', async (request, env) => {
    const { isValid, interaction } = await verifyDiscordRequest(request, env);
    if (!isValid || !interaction) {
        return new Response('Bad request signature.', { status: 401 });
    }

    if (interaction.type === InteractionType.PING) {
        console.log('Received PING interaction');
        return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
            status: 200, // Add this line
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        if (interaction.type === InteractionType.APPLICATION_COMMAND) {
            const { name, options } = interaction.data;
            console.log('Received command:', name);

            if (name === 'stats') {
                const user = options?.find(opt => opt.name === 'user')?.value || interaction.member.user.username;
                const stats = await calculateUserStats(interaction.channel_id, user);
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: formatStats(stats) }
                }), { headers: { 'Content-Type': 'application/json' } });
            } else if (name === 'result') {
                const game = options.find(opt => opt.name === 'game').value;
                const user = options?.find(opt => opt.name === 'user')?.value || interaction.member.user.username;
                const result = await getGameResult(interaction.channel_id, game, user);
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: formatResult(result) }
                }), { headers: { 'Content-Type': 'application/json' } });
            } else if (name === 'weekly') {
                const user = options?.find(opt => opt.name === 'user')?.value || interaction.member.user.username;
                const weeklyResults = await getWeeklyResults(interaction.channel_id, user);
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: formatWeeklyResults(weeklyResults) }
                }), { headers: { 'Content-Type': 'application/json' } });
            }
        }
    } catch (error) {
        console.error('Error handling command:', error);
        return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: 'An error occurred while processing your command.' }
        }), { headers: { 'Content-Type': 'application/json' } });
    }

    console.error('Unhandled interaction type');
    return new Response('Unhandled interaction type', { status: 400 });
});

router.all('*', () => new Response('Not Found.', { status: 404 }));

async function verifyDiscordRequest(request, env) {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.text();
    const isValidRequest =
        signature &&
        timestamp &&
        (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY));
    if (!isValidRequest) {
        return { isValid: false };
    }

    return { interaction: JSON.parse(body), isValid: true };
}

async function calculateUserStats(channelId, user) {
    const messages = await fetchAllMessages(channelId);
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

async function getGameResult(channelId, game, user) {
    const messages = await fetchAllMessages(channelId);
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

async function getWeeklyResults(channelId, user) {
    const messages = await fetchAllMessages(channelId);
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

async function fetchAllMessages(channelId) {
    let messages = [];
    let lastMessageId;

    while (true) {
        const fetchedMessages = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages?limit=100${lastMessageId ? `&before=${lastMessageId}` : ''}`, {
            headers: {
                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`
            }
        }).then(res => res.json());

        if (fetchedMessages.length === 0) break;
        messages = messages.concat(fetchedMessages);
        lastMessageId = fetchedMessages[fetchedMessages.length - 1].id;
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

export default {
    fetch: router.handle,
};
