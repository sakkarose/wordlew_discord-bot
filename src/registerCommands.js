import fetch from 'node-fetch';

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
    }
];

async function registerCommands(env) {
    try {
        const response = await fetch(`https://discord.com/api/v9/applications/${env.DISCORD_APPLICATION_ID}/guilds/${env.DISCORD_GUILD_ID}/commands`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bot ${env.DISCORD_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commands)
        });

        if (response.ok) {
            console.log('Commands registered successfully');
        } else {
            const errorData = await response.json();
            console.error('Failed to register commands', errorData);
        }
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

registerCommands();
