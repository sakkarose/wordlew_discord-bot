import { Client } from '@turso/client';

export default function Database(env) {
    const client = new Client({
        url: env.TURSO_URL,
        authToken: env.TURSO_AUTH_TOKEN
    });

    async function getUserStats(user) {
        try {
            const result = await client.query('SELECT * FROM user_stats WHERE username = ?', [user]);
            if (result.length > 0) {
                return result[0];
            } else {
                return {
                    winPercentage: 0,
                    averageGuess: 0,
                    currentStreak: 0,
                    maxStreak: 0,
                    firstPlayed: 'N/A',
                    lastPlayed: 'N/A',
                    played: 0,
                    guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
                };
            }
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    }

    async function getGameResult(game, user) {
        try {
            const result = await client.query('SELECT * FROM game_results WHERE username = ? AND game = ?', [user, game]);
            if (result.length > 0) {
                return result[0];
            } else {
                return { game, guesses: 0, board: [] };
            }
        } catch (error) {
            console.error('Error getting game result:', error);
            throw error;
        }
    }

    async function getWeeklyResults(user) {
        try {
            const result = await client.query('SELECT * FROM game_results WHERE username = ? ORDER BY date DESC LIMIT 7', [user]);
            return result;
        } catch (error) {
            console.error('Error getting weekly results:', error);
            throw error;
        }
    }

    async function fetchAllResults() {
        try {
            console.log('Starting fetchAllResults');
            // Implement logic to re-initialize and update all results in Turso
            console.log('fetchAllResults completed');
        } catch (error) {
            console.error('Error fetching all results:', error);
            throw error;
        }
    }

    async function logResult(user, result) {
        try {
            const userStats = await getUserStats(user);
            // Update user stats based on the new result
            await client.query('INSERT INTO user_stats (username, winPercentage, averageGuess, currentStreak, maxStreak, firstPlayed, lastPlayed, played, guessDistribution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE winPercentage = ?, averageGuess = ?, currentStreak = ?, maxStreak = ?, firstPlayed = ?, lastPlayed = ?, played = ?, guessDistribution = ?', [
                user, userStats.winPercentage, userStats.averageGuess, userStats.currentStreak, userStats.maxStreak, userStats.firstPlayed, userStats.lastPlayed, userStats.played, JSON.stringify(userStats.guessDistribution),
                userStats.winPercentage, userStats.averageGuess, userStats.currentStreak, userStats.maxStreak, userStats.firstPlayed, userStats.lastPlayed, userStats.played, JSON.stringify(userStats.guessDistribution)
            ]);
            await client.query('INSERT INTO game_results (username, game, guesses, board) VALUES (?, ?, ?, ?)', [user, result.game, result.guesses, JSON.stringify(result.board)]);
        } catch (error) {
            console.error('Error logging result:', error);
            throw error;
        }
    }

    return {
        getUserStats,
        getGameResult,
        getWeeklyResults,
        fetchAllResults,
        logResult
    };
}
