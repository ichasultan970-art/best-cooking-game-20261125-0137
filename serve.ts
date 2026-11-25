// Local static development server for game/ (Node 22, standard library only).
// Usage: node serve.ts [--port 8080]

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const argv = process.argv.slice(2);
const portFlag = argv.indexOf('--port');
const parsedPort = portFlag !== -1 ? Number(argv[portFlag + 1]) : 8080;
const port = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort < 65536 ? parsedPort : 8080;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  const reqUrl = new URL(req.url ?? '/', 'http://127.0.0.1');
  let pathname: string;
  try {
    pathname = decodeURIComponent(reqUrl.pathname);
  } catch {
    res.writeHead(400).end('Bad Request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const resolved = resolve(join(gameRoot, normalize(pathname)));
  if (resolved !== gameRoot && !resolved.startsWith(gameRoot + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  let size: number;
  try {
    const info = statSync(resolved);
    if (!info.isFile()) throw new Error('not a regular file');
    size = info.size;
  } catch {
    res.writeHead(404).end('Not Found');
    return;
  }
  const contentType = MIME_TYPES[extname(resolved).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, {
    'content-type': contentType,
    'content-length': String(size),
    'cache-control': 'no-store',
  });
  createReadStream(resolved).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Serving Ember & Pass on http://127.0.0.1:${port}\n`);
});
