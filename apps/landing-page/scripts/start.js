const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const startPort = Number(process.env.LANDING_PAGE_PORT || 3003);
const maxAttempts = 20;

function getAvailablePort(port, attempt = 1) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE' && attempt < maxAttempts) {
        resolve(getAvailablePort(port + 1, attempt + 1));
        return;
      }

      reject(error);
    });

    server.once('listening', () => {
      server.close(() => resolve(port));
    });

    server.listen(port);
  });
}

async function main() {
  const port = await getAvailablePort(startPort);
  console.log(`Starting Next.js dev server on port ${port}`);

  const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--port', String(port)], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(port),
      HOST: process.env.HOST || '0.0.0.0',
    },
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    console.error(error);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
