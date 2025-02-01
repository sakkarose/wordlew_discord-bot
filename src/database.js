const kvNamespace = process.env.WORDLE_STATS; // KV namespace binding

async function getUserStats(user) {
    const stats = await kvNamespace.get(`stats:${user}`, { type: 'json' });
    return stats || {
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
    const result = await kvNamespace.get(`result:${user}:${game}`, { type: 'json' });
    return result || { game, guesses: 0, board: [] };
}

async function getWeeklyResults(user) {
    const results = [];
    for (let i = 0; i < 7; i++) {
        const result = await kvNamespace.get(`result:${user}:${i}`, { type: 'json' });
        if (result) results.push(result);
    }
    return results;
}

async function fetchAllResults() {
    // Implement logic to re-initialize and update all results in the KV namespace
}

async function logResult(user, result) {
    const userStats = await getUserStats(user);
    // Update user stats based on the new result
    await kvNamespace.put(`stats:${user}`, JSON.stringify(userStats));
    await kvNamespace.put(`result:${user}:${result.game}`, JSON.stringify(result));
}

module.exports = {
    getUserStats,
    getGameResult,
    getWeeklyResults,
    fetchAllResults,
    logResult
};
