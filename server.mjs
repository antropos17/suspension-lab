import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
const root = path.resolve(import.meta.dirname, 'dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(404).end('Not found'); }
});
const url = 'http://127.0.0.1:4187';
const open = () => { if (process.argv.includes('--open') && process.platform === 'win32') spawn('explorer.exe', [url], { windowsHide: true }).on('error', () => console.log(`Open ${url} in your browser.`)); };
server.on('error', err => { if (err.code === 'EADDRINUSE') { console.log(`Port 4187 is already in use. If Suspension Lab is running, open ${url}.`); } else { console.error(err.message); } process.exitCode = 1; });
server.listen(4187, '127.0.0.1', () => { console.log(`Suspension Lab: ${url}`); open(); });
