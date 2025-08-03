"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const redis_1 = require("redis");
const router = (0, express_1.Router)();
// Server-Sent Events endpoint for real-time favorites updates
router.get('/favorites', async (req, res) => {
    console.log('📡 New SSE connection request');
    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });
    // Send initial connection event
    res.write('data: {"type":"connected"}\n\n');
    // Create Redis subscriber for this connection
    const subscriber = (0, redis_1.createClient)({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    let isConnected = false;
    try {
        await subscriber.connect();
        isConnected = true;
        console.log('📡 SSE client connected to favorites stream');
        // Subscribe to favorites channel
        await subscriber.subscribe('favorites', (message) => {
            try {
                if (!res.destroyed) {
                    res.write(`data: ${message}\n\n`);
                    console.log('📡 Sent SSE message:', message);
                }
            }
            catch (err) {
                console.error('Error writing SSE message:', err);
            }
        });
        // Keep connection alive with periodic heartbeat
        const heartbeat = setInterval(() => {
            if (!res.destroyed) {
                res.write('data: {"type":"heartbeat"}\n\n');
            }
            else {
                clearInterval(heartbeat);
            }
        }, 30000); // Send heartbeat every 30 seconds
        // Handle client disconnect
        req.on('close', () => {
            console.log('📡 SSE client disconnected');
            clearInterval(heartbeat);
            if (isConnected) {
                subscriber.disconnect().catch(err => {
                    console.error('Error disconnecting Redis subscriber:', err);
                });
            }
        });
        req.on('error', (err) => {
            console.error('SSE connection error:', err);
            clearInterval(heartbeat);
            if (isConnected) {
                subscriber.disconnect().catch(e => {
                    console.error('Error disconnecting Redis subscriber:', e);
                });
            }
        });
    }
    catch (err) {
        console.error('Failed to setup SSE connection:', err);
        if (isConnected) {
            subscriber.disconnect().catch(e => {
                console.error('Error disconnecting Redis subscriber:', e);
            });
        }
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to setup real-time connection' });
        }
    }
});
exports.default = router;
