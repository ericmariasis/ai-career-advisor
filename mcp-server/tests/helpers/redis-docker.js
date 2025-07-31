"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRedis = startRedis;
exports.stopRedis = stopRedis;
const node_child_process_1 = require("node:child_process");
const node_net_1 = __importDefault(require("node:net"));
const HOST_PORT = 6380;
async function startRedis() {
    (0, node_child_process_1.execSync)('docker pull -q redis/redis-stack:latest', { stdio: 'inherit' });
    const containerName = `redis-test-${process.pid}-${Date.now()}`;
    const proc = (0, node_child_process_1.spawn)('docker', [
        'run', '--rm',
        '-p', `${HOST_PORT}:6379`,
        '--name', containerName,
        'redis/redis-stack:latest',
    ], { stdio: 'ignore' });
    // poll until host port 6380 accepts connections
    await new Promise((resolve, reject) => {
        let retries = 20;
        const tryConnect = () => {
            const sock = node_net_1.default.connect({ port: HOST_PORT }, () => {
                sock.end();
                resolve();
            });
            sock.on('error', () => {
                if (--retries === 0)
                    return reject(new Error('Redis not up'));
                setTimeout(tryConnect, 500);
            });
        };
        tryConnect();
    });
    return proc;
}
function stopRedis(proc) {
    try {
        proc.kill('SIGKILL');
    }
    catch { }
}
