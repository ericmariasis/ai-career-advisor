"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPubClient = getPubClient;
exports.getSubClient = getSubClient;
exports.initializePubSub = initializePubSub;
exports.broadcastFavorite = broadcastFavorite;
const redis_1 = require("redis");
// Global Redis clients for pub/sub
let pubClient = null;
let subClient = null;
async function getPubClient() {
    if (!pubClient) {
        pubClient = (0, redis_1.createClient)({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        await pubClient.connect();
        console.log('📡 Redis publisher connected');
    }
    return pubClient;
}
async function getSubClient() {
    if (!subClient) {
        subClient = (0, redis_1.createClient)({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        await subClient.connect();
        console.log('📡 Redis subscriber connected');
    }
    return subClient;
}
async function initializePubSub() {
    await getPubClient();
    await getSubClient();
    console.log('📡 Pub/Sub system initialized');
    // Start periodic tick messages for real-time sparkline updates
    setInterval(async () => {
        try {
            const client = await getPubClient();
            await client.publish('favorites', JSON.stringify({
                type: 'tick',
                timestamp: Date.now()
            }));
            console.log('🔔 Sent periodic tick message');
        }
        catch (error) {
            console.error('Failed to send tick message:', error);
        }
    }, 60000); // Every 60 seconds
}
async function broadcastFavorite(delta, userId, jobId) {
    try {
        const pub = await getPubClient();
        const message = {
            delta,
            userId,
            jobId,
            timestamp: Date.now()
        };
        await pub.publish('favorites', JSON.stringify(message));
        console.log(`📡 Broadcasted favorite ${delta > 0 ? 'save' : 'unsave'}`);
    }
    catch (err) {
        console.error('Failed to broadcast favorite:', err);
    }
}
