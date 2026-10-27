#!/usr/bin/env node
/* 本地预览服务器 + games.json 自动同步
 *
 * 为什么需要它：双击 index.html 打开时浏览器用的是 file://，fetch('games.json')
 * 会被 CORS 拦掉，页面只能退回 HTML 里的静态兜底 —— 改了 json 看起来「没生效」。
 * 用这个脚本走 http 打开，json 就是实时生效的。
 *
 * 用法：
 *   node tools/dev.js                 # 起服务并自动打开浏览器（默认端口 8080）
 *   node tools/dev.js --port 8123     # 换端口
 *   node tools/dev.js --no-open       # 只起服务，不自动开浏览器
 *
 * 它做三件事：
 *   1) 启动前先跑一次 tools/export-games.js，把静态兜底对齐当前 games.json
 *   2) 用 http 提供整个仓库（fetch / iframe 都正常，等价线上环境）
 *   3) 监听 games.json：一保存就自动再同步一次兜底，控制台提示你刷新页面
 *
 * 纯 Node 内置模块，不装任何依赖；Ctrl+C 结束。
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'games.json');
const EXPORT = path.join(__dirname, 'export-games.js');

/* ---------------- 参数 ---------------- */
let port = 8080;
let openBrowser = true;
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port' || a === '-p') { port = parseInt(argv[++i], 10) || port; }
    else if (a.startsWith('--port=')) { port = parseInt(a.slice(7), 10) || port; }
    else if (a === '--no-open') { openBrowser = false; }
    else if (a === '--help' || a === '-h') {
      console.log('用法：node tools/dev.js [--port 8080] [--no-open]');
      process.exit(0);
    }
  }
}

/* ---------------- MIME ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.zip': 'application/zip',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

/* ---------------- 同步静态兜底 ---------------- */
let syncing = false;
function syncFallback(reason) {
  if (syncing) { return; }
  syncing = true;
  try {
    console.log('\n[同步] ' + reason);
    execFileSync(process.execPath, [EXPORT], { cwd: ROOT, stdio: 'inherit' });
  } catch (err) {
    console.error('[同步] 失败：' + (err && err.message ? err.message : err));
    console.error('[同步] 静态兜底可能落后；改了 html/json 后仍可手动跑 node tools/export-games.js');
  } finally {
    syncing = false;
  }
}

/* ---------------- 静态服务器 ---------------- */
function send(res, code, body, headers) {
  res.writeHead(code, Object.assign({
    /* 本地开发别让浏览器缓存：改完刷新就是最新的 */
    'Cache-Control': 'no-store, must-revalidate'
  }, headers || {}));
  res.end(body);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    send(res, 400, 'Bad Request');
    return;
  }

  /* 只允许本站（127.0.0.1 / localhost）访问，避免被当成对外服务 */
  const host = String(req.headers.host || '');
  if (host && !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host)) {
    send(res, 403, '只允许本机访问', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  let file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);

  /* 防目录穿越 */
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      file = path.join(file, 'index.html');
      return readFile(file, res);
    }
    if (err) { send(res, 404, '404 ' + urlPath, { 'Content-Type': 'text/plain; charset=utf-8' }); return; }
    readFile(file, res);
  });
});

function readFile(file, res) {
  fs.readFile(file, (err, buf) => {
    if (err) {
      send(res, 404, '404 ' + path.basename(file), { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    send(res, 200, buf, { 'Content-Type': type });
  });
}

/* ---------------- 监听 games.json ---------------- */
let watchTimer = null;
function watchData() {
  try {
    fs.watch(DATA, { persistent: false }, () => {
      /* Windows 上一次保存会触发多次事件，压一下 */
      if (watchTimer) { clearTimeout(watchTimer); }
      watchTimer = setTimeout(() => {
        watchTimer = null;
        syncFallback('games.json 变了，重新生成静态兜底…');
        console.log('[提示] 静态兜底已更新，刷新浏览器（Ctrl+R）就能看到。');
      }, 250);
    });
    console.log('[监听] games.json 已监听：保存后自动同步兜底');
  } catch (e) {
    console.warn('[监听] 无法监听 games.json（' + e.message + '）：改完请手动跑 node tools/export-games.js');
  }
}

/* ---------------- 启动 ---------------- */
syncFallback('启动前先对齐静态兜底…');

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error('\n[错误] 端口 ' + port + ' 已被占用，换一个：node tools/dev.js --port ' + (port + 1));
  } else {
    console.error('[错误] ' + (err && err.message ? err.message : err));
  }
  process.exit(1);
});

server.listen(port, '127.0.0.1', () => {
  const url = 'http://127.0.0.1:' + port + '/index.html';
  console.log('');
  console.log('  本地预览已启动： ' + url);
  console.log('  游戏墙（主页）： http://127.0.0.1:' + port + '/proF/主页.html');
  console.log('  games.json：     http://127.0.0.1:' + port + '/games.json');
  console.log('');
  console.log('  改完 games.json 保存 → 兜底自动同步 → 浏览器按 Ctrl+R 刷新即可。');
  console.log('  结束服务：Ctrl + C');
  console.log('');

  watchData();

  if (openBrowser) {
    try {
      if (process.platform === 'win32') {
        spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref();
      } else if (process.platform === 'darwin') {
        spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
      } else {
        spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
      }
    } catch (e) {
      console.log('[提示] 没能自动打开浏览器，手动访问上面那个地址即可。');
    }
  }
});

/* Ctrl+C / 关窗口时干净退出 */
['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => {
    console.log('\n[退出] 本地预览已关闭');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  });
});
