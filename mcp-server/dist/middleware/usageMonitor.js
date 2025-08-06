"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageMonitor = exports.trackApiUsage = exports.checkUsageLimits = exports.UsageMonitor = void 0;
const redisSearch_1 = require("../lib/redisSearch");
// OpenAI pricing (as of 2024 - update as needed)
const PRICING = {
    'gpt-3.5-turbo': {
        input: 0.0005 / 1000, // $0.0005 per 1K input tokens
        output: 0.0015 / 1000, // $0.0015 per 1K output tokens
    },
    'gpt-4': {
        input: 0.03 / 1000, // $0.03 per 1K input tokens  
        output: 0.06 / 1000, // $0.06 per 1K output tokens
    }
};
// Daily spending limits
const DAILY_LIMITS = {
    totalCost: 10.00, // $10 per day max
    totalRequests: 500, // 500 AI requests per day max
    perIPRequests: 50, // 50 requests per IP per day
};
class UsageMonitor {
    constructor() {
        this.initRedis();
    }
    async initRedis() {
        this.redis = await (0, redisSearch_1.redisConn)();
    }
    // Track OpenAI API usage
    async trackUsage(req, model, inputTokens, outputTokens) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const ip = req.ip;
        const cost = this.calculateCost(model, inputTokens, outputTokens);
        // Update global daily stats
        const globalKey = `usage:global:${today}`;
        await this.redis.hIncrBy(globalKey, 'requests', 1);
        await this.redis.hIncrBy(globalKey, 'tokens', inputTokens + outputTokens);
        await this.redis.hIncrByFloat(globalKey, 'cost', cost);
        await this.redis.expire(globalKey, 86400 * 7); // Keep for 7 days
        // Update per-IP daily stats
        const ipKey = `usage:ip:${ip}:${today}`;
        await this.redis.hIncrBy(ipKey, 'requests', 1);
        await this.redis.hIncrBy(ipKey, 'tokens', inputTokens + outputTokens);
        await this.redis.hIncrByFloat(ipKey, 'cost', cost);
        await this.redis.expire(ipKey, 86400 * 2); // Keep for 2 days
        // Log high usage
        if (cost > 0.10) { // Log requests costing more than 10 cents
            console.warn(`🚨 HIGH COST REQUEST: ${cost.toFixed(4)} USD from ${ip} using ${model}`);
        }
    }
    // Check if request should be allowed
    async checkLimits(req) {
        const today = new Date().toISOString().split('T')[0];
        const ip = req.ip;
        // Check global daily limits
        const globalKey = `usage:global:${today}`;
        const globalStats = await this.redis.hGetAll(globalKey);
        if (globalStats.cost && parseFloat(globalStats.cost) > DAILY_LIMITS.totalCost) {
            return {
                allowed: false,
                reason: 'Daily spending limit exceeded. Please try again tomorrow.'
            };
        }
        if (globalStats.requests && parseInt(globalStats.requests) > DAILY_LIMITS.totalRequests) {
            return {
                allowed: false,
                reason: 'Daily request limit exceeded. Please try again tomorrow.'
            };
        }
        // Check per-IP limits
        const ipKey = `usage:ip:${ip}:${today}`;
        const ipStats = await this.redis.hGetAll(ipKey);
        if (ipStats.requests && parseInt(ipStats.requests) > DAILY_LIMITS.perIPRequests) {
            return {
                allowed: false,
                reason: 'Daily request limit exceeded for your IP. Please try again tomorrow.'
            };
        }
        return { allowed: true };
    }
    // Calculate cost based on model and token usage
    calculateCost(model, inputTokens, outputTokens) {
        const pricing = PRICING[model] || PRICING['gpt-3.5-turbo'];
        return (inputTokens * pricing.input) + (outputTokens * pricing.output);
    }
    // Get current usage stats
    async getUsageStats(days = 1) {
        const stats = [];
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const globalKey = `usage:global:${dateStr}`;
            const dayStats = await this.redis.hGetAll(globalKey);
            stats.push({
                date: dateStr,
                requests: parseInt(dayStats.requests) || 0,
                tokens: parseInt(dayStats.tokens) || 0,
                cost: parseFloat(dayStats.cost) || 0,
            });
        }
        return stats;
    }
}
exports.UsageMonitor = UsageMonitor;
const monitor = new UsageMonitor();
exports.usageMonitor = monitor;
// Middleware to check limits before processing
const checkUsageLimits = async (req, res, next) => {
    try {
        const check = await monitor.checkLimits(req);
        if (!check.allowed) {
            return res.status(429).json({
                error: check.reason,
                retryAfter: 86400 // Try again in 24 hours
            });
        }
        next();
    }
    catch (error) {
        console.error('Usage limit check failed:', error);
        next(); // Allow request if monitoring fails
    }
};
exports.checkUsageLimits = checkUsageLimits;
// Middleware to track usage after processing
const trackApiUsage = (model, inputTokens, outputTokens) => {
    return async (req, res, next) => {
        try {
            await monitor.trackUsage(req, model, inputTokens, outputTokens);
        }
        catch (error) {
            console.error('Usage tracking failed:', error);
        }
        next();
    };
};
exports.trackApiUsage = trackApiUsage;
