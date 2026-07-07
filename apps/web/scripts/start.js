const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const startPort = Number(process.env.WEB_PORT || 3000);
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

let attempt = 1;

function launchServer(port) {
  console.log(`Starting CRA dev server on port ${port}`);

  const child = spawn(process.execPath, [require.resolve('react-scripts/bin/react-scripts.js'), 'start', '--port', String(port), '--host', '0.0.0.0'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: String(port),
      BROWSER: 'none',
      CI: 'true',
    },
  });

  let output = '';
  const forward = (chunk) => {
    const text = chunk.toString();
    output += text;
    process.stdout.write(text);
  };

  child.stdout.on('data', forward);
  child.stderr.on('data', forward);

  child.once('exit', (code) => {
    const isPortIssue = output.includes('EADDRINUSE') || output.includes('already running on port') || output.includes('address already in use');

    if (isPortIssue && attempt < maxAttempts) {
      attempt += 1;
      launchServer(port + 1);
      return;
    }

    process.exit(code ?? 0);
  });

  child.once('error', (error) => {
    console.error(error);
    process.exit(1);
  });
}

async function main() {
  const port = await getAvailablePort(startPort);
  launchServer(port);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
