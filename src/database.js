import { promises as fs } from 'fs';
import path from 'path';

const dataFilePath = path.resolve(__dirname, 'data.json');

async function readData() {
    try {
        const data = await fs.readFile(dataFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {}; // Return an empty object if the file does not exist
        }
        throw error;
    }
}

async function writeData(data) {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
}

async function getUserStats(user) {
    const data = await readData();
    return data[user]?.stats || {
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

async function getGameResult(game, user) {
    const data = await readData();
    return data[user]?.results?.[game] || { game, guesses: 0, board: [] };
}

async function getWeeklyResults(user) {
    const data = await readData();
    const results = data[user]?.results || {};
    return Object.values(results).slice(-7);
}

async function fetchAllResults() {
    // Implement logic to re-initialize and update all results in the JSON file
}

async function logResult(user, result) {
    const data = await readData();
    if (!data[user]) {
        data[user] = { stats: {}, results: {} };
    }
    data[user].results[result.game] = result;
    // Update user stats based on the new result
    await writeData(data);
}

export default {
    getUserStats,
    getGameResult,
    getWeeklyResults,
    fetchAllResults,
    logResult
};
