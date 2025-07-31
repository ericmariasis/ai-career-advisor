import { spawn, execSync, type ChildProcess } from 'node:child_process';
import net from 'node:net';

const HOST_PORT = 6380;

export async function startRedis(): Promise<ChildProcess> {
  execSync('docker pull -q redis/redis-stack:latest', { stdio: 'inherit' });

  const containerName = `redis-test-${process.pid}-${Date.now()}`;

  const proc = spawn('docker', [
    'run', '--rm',
    '-p', `${HOST_PORT}:6379`,
    '--name', containerName,
    'redis/redis-stack:latest',
  ], { stdio: 'ignore' });

  // poll until host port 6380 accepts connections
  await new Promise<void>((resolve, reject) => {
    let retries = 20;
    const tryConnect = () => {
      const sock = net.connect({ port: HOST_PORT }, () => {
        sock.end(); resolve();
      });
      sock.on('error', () => {
        if (--retries === 0) return reject(new Error('Redis not up'));
        setTimeout(tryConnect, 500);
      });
    };
    tryConnect();
  });

  return proc;
}

export function stopRedis(proc: ChildProcess) {
  try { proc.kill('SIGKILL'); } catch {}
}
