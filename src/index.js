import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';
import Database from './database.js'; // Assume you have a database module for storing user data

export default {
    async fetch(request, env) {
        const { method, headers } = request;
        const signature = headers.get('x-signature-ed25519');
        const timestamp = headers.get('x-signature-timestamp');
        const body = await request.text();

        // Log the relevant information for debugging
        console.log('Request method:', method);
        console.log('Request headers:', JSON.stringify([...headers]));
        console.log('Request signature:', signature);
        console.log('Request timestamp:', timestamp);
        console.log('Request body:', body);

        if (method !== 'POST') {
            console.error('Invalid request method');
            return new Response('Invalid request method', { status: 405 });
        }

        if (!verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY)) {
            console.error('Bad request signature');
            return new Response('Bad request signature', { status: 401 });
        }

        const interaction = JSON.parse(body);

        if (interaction.type === InteractionType.PING) {
            return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const database = Database(env);

        try {
            if (interaction.type === InteractionType.APPLICATION_COMMAND) {
                const { name, options } = interaction.data;

                if (name === 'stats') {
                    const user = options?.find(opt => opt.name === 'user')?.value || interaction.member.user.username;
                    const stats = await database.getUserStats(user);
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: { content: formatStats(stats) }
                    }), { headers: { 'Content-Type': 'application/json' } });
                } else if (name === 'result') {
                    const game = options.find(opt => opt.name === 'game').value;
                    const user = options?.find(opt => opt.name === 'user')?.value || interaction.member.user.username;
                    const result = await database.getGameResult(game, user);
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: { content: formatResult(result) }
                    }), { headers: { 'Content-Type': 'application/json' } });
                } else if (name === 'weekly') {
                    const user = options?.find(opt => opt.name === 'user')?.value || interaction.member.user.username;
                    const weeklyResults = await database.getWeeklyResults(user);
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: { content: formatWeeklyResults(weeklyResults) }
                    }), { headers: { 'Content-Type': 'application/json' } });
                } else if (name === 'fetch') {
                    await database.fetchAllResults();
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: { content: 'Results have been re-initialized and updated.' }
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
    }
};

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
