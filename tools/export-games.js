/* games.json 校验 + 同步静态兜底 HTML
 *
 * 用法：
 *   node tools/export-games.js          校验 + 把主页卡片 / 侧栏入口同步成 games.json 的内容
 *   node tools/export-games.js --check  只校验，不写文件
 *
 * 数据流（games.json 是唯一数据源）：
 *   games.json  ──►  浏览器：根目录的 games.js 现渲染卡片和侧栏（无需跑本脚本）
 *               └──►  静态兜底：本脚本把 proF/主页.html 的 <div id="gamesRoot"> 和
 *                    index.html 的 <nav id="nav"> 里标记区间的 HTML 重写成同样内容，
 *                    这样没有 JS / 没有网络时页面也不会空。
 *
 * 每款游戏只写 7 个字段：
 *     file（真实位置，可带子目录）  name  icon  desc  pcOnly  c1  c2
 * id / rel / url / mobile / tags / pageTitle / glow / count 全部由 games.js 现算。
 *
 * 加一款游戏：把游戏文件放好，在 games.json 对应分类里加一行即可。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const G = require(path.join(root, 'games.js'));

const DATA = path.join(root, 'games.json');
const HOME = path.join(root, 'proF', '主页.html');
const SHELL = path.join(root, 'index.html');
const CHECK_ONLY = process.argv.indexOf('--check') >= 0;

const ALLOWED_GAME_KEYS = ['file', 'name', 'icon', 'desc', 'pcOnly', 'c1', 'c2'];
const warnings = [];
const errors = [];

function warn(msg) { warnings.push(msg); }
function fail(msg) { errors.push(msg); }

/* ---------------- 读取数据 ---------------- */
if (!fs.existsSync(DATA)) {
  console.error('✖ 找不到 games.json');
  process.exit(1);
}
let raw;
try {
  raw = JSON.parse(fs.readFileSync(DATA, 'utf8'));
} catch (e) {
  console.error('✖ games.json 不是合法 JSON：' + e.message);
  process.exit(1);
}

const ds = G.parse(raw);

/* ---------------- 校验 ---------------- */
if (raw.schema !== G.SCHEMA) { warn('schema 应为 "' + G.SCHEMA + '"，当前是 ' + JSON.stringify(raw.schema)); }
if (!ds.site.dir) { warn('site.dir 缺失'); }
if (!ds.categories.length) { fail('没有任何分类（categories 为空）'); }

const seenCats = {};
for (const cat of ds.categories) {
  if (!cat.key) { fail('有分类缺少 key'); }
  else if (seenCats[cat.key]) { fail('分类 key 重复：' + cat.key); }
  seenCats[cat.key] = 1;
  if (!cat.name) { warn('分类 ' + (cat.key || '?') + ' 缺少 name'); }
  if (!cat.games.length) { warn('分类 ' + cat.key + ' 里没有游戏'); }
}

const seenIds = {};
for (const [ci, cat] of (raw.categories || []).entries()) {
  const list = cat.games || [];
  for (const [gi, raw2] of list.entries()) {
    const at = 'categories[' + ci + '].games[' + gi + ']';
    const g = G.expand(raw2, ds.site.dir);
    if (!raw2.file && !raw2.id) {
      fail(at + '：缺少 file（游戏文件位置，如 "proF/新游戏.html"）');
      continue;
    }
    if (seenIds[g.id]) { fail('id 重复：' + g.id + '（' + at + '）'); }
    seenIds[g.id] = 1;
    if (!raw2.file) { warn(g.id + '：没写 file，按 site.dir 推断为 ' + g.file); }
    if (/^[\\/]/.test(String(raw2.file || ''))) { warn(g.id + '：file 不要以 / 开头（' + raw2.file + '）'); }
    if (/\\/.test(String(raw2.file || ''))) { warn(g.id + '：file 里的反斜杠要改成正斜杠（' + raw2.file + '）'); }
    if (!g.name) { warn(g.id + '：缺少 name，页面会显示 id'); }
    if (!g.desc) { warn(g.id + '：缺少 desc（卡片副标题）'); }
    if (!g.icon) { warn(g.id + '：缺少 icon，会退回 🎮'); }
    if (!fs.existsSync(path.join(root, g.file))) {
      fail(g.id + '：文件 ' + g.file + ' 不存在');
    }
    ['c1', 'c2'].forEach(k => {
      const v = String(raw2[k] || '');
      if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
        warn(g.id + '：' + k + ' 不是合法 hex 颜色（' + JSON.stringify(v) + '），应为 "#2f9e6a"');
      }
    });
    if ('pcOnly' in raw2 && typeof raw2.pcOnly !== 'boolean') {
      warn(g.id + '：pcOnly 应为 true / false');
    }
    Object.keys(raw2).forEach(k => {
      if (ALLOWED_GAME_KEYS.indexOf(k) < 0) {
        warn(g.id + '：多了个没用到的字段 "' + k + '"（只认 ' + ALLOWED_GAME_KEYS.join(' / ') + '）');
      }
    });
  }
}

/* ---------------- 同步静态兜底 HTML ---------------- */
function indent(html, n) {
  const pad = ' '.repeat(n);
  return html.split('\n').map(line => (line ? pad + line : line)).join('\n');
}

function replaceRegion(file, startMark, endMark, body) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) { return { ok: false, why: '文件不存在' }; }
  const src = fs.readFileSync(abs, 'utf8');
  const re = new RegExp('(<!--\\s*' + startMark + '[^>]*-->)([\\s\\S]*?)(<!--\\s*' + endMark + '\\s*-->)');
  const m = src.match(re);
  if (!m) { return { ok: false, why: '缺少 ' + startMark + ' / ' + endMark + ' 标记' }; }
  if (m[2].trim() === body.trim()) { return { ok: true, changed: false }; }
  const next = src.replace(re, (all, a, _mid, c) => a + '\n' + body + '\n' + c);
  if (!CHECK_ONLY) { fs.writeFileSync(abs, next, 'utf8'); }
  return { ok: true, changed: true };
}

const homeBody = indent(G.homeHTML(ds), 2);
const navBody = indent(G.navHTML(ds), 12);

const rHome = replaceRegion('proF/主页.html', 'games:start', 'games:end', homeBody);
const rNav = replaceRegion('index.html', 'nav:start', 'nav:end', navBody);
if (!rHome.ok) { fail('proF/主页.html：' + rHome.why); }
if (!rNav.ok) { fail('index.html：' + rNav.why); }

/* ---------------- 同步标记区间外的静态数字 ----------------
 * 卡片和侧栏入口都在标记区间里（上面已整段替换），但：
 *   · proF/主页.html 顶部的「共 <b data-game-total>N</b> 款」
 *   · index.html 侧栏的「<span data-game-count>N 款</span>」
 * 都在区间之外，不单独改的话，断网 / 禁用 JS / file:// 直开时会显示旧数字。 */
function syncNumbers(file, rules) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) { return { ok: false, why: '文件不存在' }; }
  let src = fs.readFileSync(abs, 'utf8');
  const before = src;
  rules.forEach(r => { src = src.replace(r.re, r.rep); });
  if (src === before) { return { ok: true, changed: false }; }
  if (!CHECK_ONLY) { fs.writeFileSync(abs, src, 'utf8'); }
  return { ok: true, changed: true };
}

const rNumHome = syncNumbers('proF/主页.html', [
  { re: /(<b[^>]*data-game-total[^>]*>)\d+(<\/b>)/, rep: `$1${ds.total}$2` }
]);
const rNumIndex = syncNumbers('index.html', [
  { re: /(<span[^>]*data-game-count[^>]*>)\d+(\s*款)/, rep: `$1${ds.total}$2` }
]);
if (!rNumHome.ok) { fail('proF/主页.html：' + rNumHome.why); }
if (!rNumIndex.ok) { fail('index.html：' + rNumIndex.why); }

/* ---------------- 输出 ---------------- */
console.log('games.json：' + ds.total + ' 款游戏，' + ds.categories.length + ' 个分类');
ds.categories.forEach(c => console.log('  · ' + c.name + '（' + c.key + '）：' + c.count + ' 款'));

const touched = [];
if (rHome.changed) { touched.push('proF/主页.html（卡片）'); }
if (rNav.changed) { touched.push('index.html（侧栏入口）'); }
if (rNumHome.changed) { touched.push('proF/主页.html（顶部总数）'); }
if (rNumIndex.changed) { touched.push('index.html（侧栏总数）'); }
if (CHECK_ONLY) {
  if (touched.length) { console.log('\n需要同步：' + touched.join('、') + '（去掉 --check 可写入）'); }
  else { console.log('\n✓ 静态兜底与数量已和 games.json 一致'); }
} else if (touched.length) {
  console.log('\n已同步：' + touched.join('、'));
} else {
  console.log('\n✓ 静态兜底与数量已和 games.json 一致，无需改动');
}

if (warnings.length) {
  console.log('\n⚠ ' + warnings.length + ' 条提醒：');
  warnings.forEach(w => console.log('  - ' + w));
}
if (errors.length) {
  console.log('\n✖ ' + errors.length + ' 处错误（页面可能缺卡片）：');
  errors.forEach(e => console.log('  - ' + e));
  process.exitCode = 1;
}
