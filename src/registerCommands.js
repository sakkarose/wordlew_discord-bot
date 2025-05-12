import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

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
                type: 4, // INTEGER type
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
        name: 'add',
        description: 'Manually add a Wordle result',
        options: [
            {
                name: 'game',
                type: 4, // INTEGER type
                description: 'The Wordle game number',
                required: true
            },
            {
                name: 'guesses',
                type: 4,
                description: 'Number of guesses (1-6, or 7 for fail)',
                required: true
            },
            {
                name: 'date',
                type: 3, // STRING type
                description: 'Date of the game (YYYY-MM-DD)',
                required: false
            }
        ]
    },
    {
        name: 'fetch',
        description: 'Fetch recent Wordle results from channel history',
        options: [
            {
                name: 'limit',
                type: 4, // INTEGER type
                description: 'Number of messages to fetch (default: 50, max: 100)',
                required: false
            }
        ]
    }
];

const validateCommands = (commands) => {
    for (const command of commands) {
        if (command.options) {
            for (const option of command.options) {
                if (option.type === 4) { // INTEGER
                    if (option.name === 'guesses' && !option.choices) {
                        option.choices = [
                            { name: '1 guess', value: 1 },
                            { name: '2 guesses', value: 2 },
                            { name: '3 guesses', value: 3 },
                            { name: '4 guesses', value: 4 },
                            { name: '5 guesses', value: 5 },
                            { name: '6 guesses', value: 6 },
                            { name: 'Failed', value: 7 }
                        ];
                    }
                }
            }
        }
    }
    return commands;
};

async function registerCommands() {
    // Get secrets using wrangler CLI
    let token, applicationId, guildId;
    
    try {
        token = await wrangler.secret.get('DISCORD_TOKEN');
        applicationId = await wrangler.secret.get('DISCORD_APPLICATION_ID');
        guildId = await wrangler.secret.get('DISCORD_GUILD_ID');
    } catch (error) {
        console.error('Error getting secrets from wrangler:', error);
        process.exit(1);
    }

    if (!token || !applicationId || !guildId) {
        console.error('Missing required environment variables. Set them using:');
        console.error('wrangler secret put DISCORD_TOKEN');
        console.error('wrangler secret put DISCORD_APPLICATION_ID');
        console.error('wrangler secret put DISCORD_GUILD_ID');
        process.exit(1);
    }

    console.log('Registering commands...');
    console.log('Application ID:', applicationId);
    console.log('Guild ID:', guildId);

    try {
        const validatedCommands = validateCommands(commands);
        console.log('Validated commands:', JSON.stringify(validatedCommands, null, 2));

        const response = await fetch(
            `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bot ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(validatedCommands)
            }
        );

        if (response.ok) {
            const data = await response.json();
            console.log('Commands registered successfully!');
            console.log('Number of commands:', data.length);
            console.log('Registered commands:', data.map(cmd => cmd.name).join(', '));
        } else {
            const errorData = await response.json();
            console.error('Failed to register commands. Status:', response.status);
            console.error('Error details:', errorData);
        }
    } catch (error) {
        console.error('Error registering commands:', error);
        process.exit(1);
    }
}

registerCommands();
