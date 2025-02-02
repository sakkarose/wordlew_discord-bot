import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function Database(env) {
    const firebaseConfig = {
        apiKey: env.FIREBASE_API_KEY,
        authDomain: env.FIREBASE_AUTH_DOMAIN,
        projectId: env.FIREBASE_PROJECT_ID,
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
        appId: env.FIREBASE_APP_ID
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    async function getUserStats(user) {
        try {
            const userDoc = doc(db, 'users', user);
            const userSnapshot = await getDoc(userDoc);
            if (userSnapshot.exists()) {
                return userSnapshot.data().stats;
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
            const resultDoc = doc(db, 'users', user, 'results', game);
            const resultSnapshot = await getDoc(resultDoc);
            if (resultSnapshot.exists()) {
                return resultSnapshot.data();
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
            const resultsCollection = collection(db, 'users', user, 'results');
            const q = query(resultsCollection, where('date', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
            const querySnapshot = await getDocs(q);
            const results = [];
            querySnapshot.forEach(doc => {
                results.push(doc.data());
            });
            return results;
        } catch (error) {
            console.error('Error getting weekly results:', error);
            throw error;
        }
    }

    async function fetchAllResults() {
        // Implement logic to re-initialize and update all results in Firestore
    }

    async function logResult(user, result) {
        try {
            const userDoc = doc(db, 'users', user);
            const userSnapshot = await getDoc(userDoc);
            let userStats = userSnapshot.exists() ? userSnapshot.data().stats : {
                winPercentage: 0,
                averageGuess: 0,
                currentStreak: 0,
                maxStreak: 0,
                firstPlayed: 'N/A',
                lastPlayed: 'N/A',
                played: 0,
                guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
            };

            // Update user stats based on the new result
            await setDoc(userDoc, { stats: userStats }, { merge: true });
            const resultDoc = doc(db, 'users', user, 'results', result.game);
            await setDoc(resultDoc, result);
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
