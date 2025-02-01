import fetch from 'node-fetch';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

const commands = [
    {
        name: 'stats',
        description: 'Get Wordle stats for a user',
        options: [
            {
                name: 'user',
                type: 6, // USER type
                description: 'The user to get stats for',
                required: false
            }
        ]
    },
    {
        name: 'result',
        description: 'Get Wordle result for a game and user',
        options: [
            {
                name: 'game',
                type: 3, // STRING type
                description: 'The game number',
                required: true
            },
            {
                name: 'user',
                type: 6, // USER type
                description: 'The user to get result for',
                required: false
            }
        ]
    },
    {
        name: 'weekly',
        description: 'Get weekly Wordle results for a user',
        options: [
            {
                name: 'user',
                type: 6, // USER type
                description: 'The user to get weekly results for',
                required: false
            }
        ]
    },
    {
        name: 'fetch',
        description: 'Re-init all results in the channel and update database'
    }
];

async function registerCommands() {
    const response = await fetch(`https://discord.com/api/v9/applications/${DISCORD_APPLICATION_ID}/guilds/${DISCORD_GUILD_ID}/commands`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bot ${DISCORD_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(commands)
    });

    if (response.ok) {
        console.log('Commands registered successfully');
    } else {
        console.error('Failed to register commands', await response.json());
    }
}

registerCommands();
