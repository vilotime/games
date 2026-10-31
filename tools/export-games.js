/* games.json 校验 + 同步静态兜底 HTML
 *
 * 用法：
 *   node tools/export-games.js          校验 + 把主页卡片 / 侧栏入口同步成 games.json 的内容
 *   node tools/export-games.js --check  只校验，不写文件
 *
 * 数据流（games.json 是唯一数据源）：
 *   games.json  ──►  浏览器：core/games.js 现渲染卡片和侧栏（无需跑本脚本）
 *               └──►  静态兜底：本脚本把 proF/主页.html 的 <div id="gamesRoot"> 和
 *                    index.html 的 <nav id="nav"> 里标记区间的 HTML 重写成同样内容，
 *                    这样没有 JS / 没有网络时页面也不会空。
 *               另外 index.html 的 head（<title> / favicon / 分享卡片）也由本脚本按
 *               games.json 的 icons、meta 两段生成（规范见 docs/cover-and-icons.md）。
 *
 * 每款游戏只写 7 个字段：
 *     file（真实位置，可带子目录）  name  icon  desc  pcOnly  c1  c2
 * id / rel / url / mobile / tags / pageTitle / glow / count 全部由 core/games.js 现算。
 *
 * 加一款游戏：把游戏文件放好，在 games.json 对应分类里加一行即可。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const G = require(path.join(root, 'core', 'games.js'));

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

/* 重写一段标记区间；结束标记前面的缩进单独抓出来，重写后原样贴回，标签不会被顶到行首 */
function replaceRegion(file, startMark, endMark, body) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) { return { ok: false, why: '文件不存在' }; }
  const src = fs.readFileSync(abs, 'utf8');
  const re = new RegExp('(<!--\\s*' + startMark + '[^>]*-->)([\\s\\S]*?)\\n?([ \\t]*)(<!--\\s*' + endMark + '\\s*-->)');
  const m = src.match(re);
  if (!m) { return { ok: false, why: '缺少 ' + startMark + ' / ' + endMark + ' 标记' }; }
  if (m[2].trim() === body.trim()) { return { ok: true, changed: false }; }
  const next = src.replace(re, (all, a, _mid, pad, c) => a + '\n' + body + '\n' + pad + c);
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

/* ---------------- 图标 / 分享封面（index.html 的 head 区块 + site.webmanifest） ----------------
 * 配置在 games.json 的 icons / meta 两段，规范见 docs/cover-and-icons.md。
 * 本段负责：读真实尺寸（PNG 宽高 / ICO 里内置的尺寸）、把相对路径拼成绝对地址、
 * 按方图还是宽图自动选 twitter:card、按 icons 生成 site.webmanifest，
 * 然后把 index.html 的 head 标记区间整段重写。 */
const ICON_KEYS = ['ico', 'svg', 'png', 'appleTouch', 'manifest'];
const META_KEYS = ['title', 'description', 'siteName', 'url', 'image', 'imageAlt', 'themeColor', 'backgroundColor'];

function readPng(abs) {
  try {
    const b = fs.readFileSync(abs);
    if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) { return null; }   /* PNG 签名 */
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };                 /* IHDR 里的宽高 */
  } catch (e) { return null; }
}

/* 不是真 ICO（比如只是把 PNG 改了扩展名）就返回 null */
function readIcoSizes(abs) {
  try {
    const b = fs.readFileSync(abs);
    if (b.length < 22 || b.readUInt16LE(0) !== 0 || b.readUInt16LE(2) !== 1) { return null; }
    const count = b.readUInt16LE(4);
    const sizes = [];
    for (let i = 0; i < count; i++) {
      const at = 6 + i * 16;
      if (at + 16 > b.length) { return null; }
      sizes.push(b[at] === 0 ? 256 : b[at]);   /* 0 表示 256 */
    }
    return sizes.length ? sizes : null;
  } catch (e) { return null; }
}

function isAbsUrl(u) { return /^https?:\/\//i.test(String(u || '')); }
function joinUrl(base, rel) { return String(base).replace(/\/+$/, '') + '/' + String(rel).replace(/^\/+/, ''); }
function fileExists(rel) { return !!rel && fs.existsSync(path.join(root, String(rel))); }

const rawIcons = raw.icons || {};
const rawMeta = raw.meta || {};
const icons = {};
const meta = {};

if (raw.favicon || raw.appleTouchIcon) {
  fail('games.json 里还有旧的 favicon / appleTouchIcon 顶层字段（已合并进 icons，见 docs/cover-and-icons.md）');
}
Object.keys(rawIcons).forEach(k => {
  if (ICON_KEYS.indexOf(k) < 0) { warn('icons 里多了个没用到的字段 "' + k + '"（只认 ' + ICON_KEYS.join(' / ') + '）'); }
});
Object.keys(rawMeta).forEach(k => {
  if (META_KEYS.indexOf(k) < 0) { warn('meta 里多了个没用到的字段 "' + k + '"（只认 ' + META_KEYS.join(' / ') + '）'); }
});

/* 1. 站点图标：.ico（搜索引擎兜底）+ svg（现代浏览器）+ 多尺寸 png（爬虫缩略图） */
if (rawIcons.ico) {
  const p = String(rawIcons.ico);
  if (/[\\]/.test(p)) { warn('icons.ico 要用正斜杠：' + p); }
  if (p.charAt(0) === '/') { warn('icons.ico 写相对仓库根的路径就行（"favicon.ico"），不要以 / 开头'); }
  else if (p.indexOf('/') >= 0) { warn('icons.ico 建议直接放仓库根目录，/favicon.ico 是爬虫默认会请求的路径：' + p); }
  if (!fileExists(p)) {
    fail('icons.ico 指向的 ' + p + ' 不存在（先跑 tools\\make-icons.ps1）');
  } else {
    const sizes = readIcoSizes(path.join(root, p));
    if (!sizes) {
      fail(p + ' 不是真正的 ICO（文件头不对；只把 PNG 改扩展名不算）');
    } else {
      const miss = [16, 32, 48].filter(s => sizes.indexOf(s) < 0);
      if (miss.length) { warn(p + ' 里没有 ' + miss.join(' / ') + ' 这几个尺寸（现在有 ' + sizes.join(' / ') + '）'); }
      /* ICO 里塞一张大图值得：有些系统和浏览器只认 /favicon.ico，会把 48 放大成主屏 / 桌面图标 */
      if (Math.max.apply(null, sizes) < 192) {
        warn(p + ' 里最大只有 ' + Math.max.apply(null, sizes) +
          '，建议再塞一张 192（否则只认 /favicon.ico 的设备会放大显示，图标发糊）');
      }
      icons.icoSizes = sizes.map(s => s + 'x' + s).join(' ');
      icons.ico = p;
    }
  }
} else {
  warn('没配 icons.ico —— Bing 等爬虫只请求根目录的 /favicon.ico，缺了会退回托管域名的图标（GitHub 小图标）');
}

if (rawIcons.svg) {
  const p = String(rawIcons.svg);
  if (!fileExists(p)) {
    fail('icons.svg 指向的 ' + p + ' 不存在');
  } else {
    let head = '';
    try { head = fs.readFileSync(path.join(root, p), 'utf8').slice(0, 400); } catch (e) {}
    if (head.indexOf('<svg') < 0) { warn(p + ' 里没找到 <svg，确认它是 SVG 文件'); }
    icons.svg = p;
  }
}

if (rawIcons.png) {
  if (!Array.isArray(rawIcons.png)) {
    fail('icons.png 应该是数组：[{ "src": "assets/icon-32.png", "sizes": "32x32" }]');
  } else {
    const list = [];
    rawIcons.png.forEach((item, i) => {
      const at = 'icons.png[' + i + ']';
      if (!item || !item.src) { fail(at + ' 缺少 src'); return; }
      const src = String(item.src);
      if (!fileExists(src)) { fail(at + '：' + src + ' 不存在（先跑 tools\\make-icons.ps1）'); return; }
      const real = readPng(path.join(root, src));
      if (!real) { fail(at + '：' + src + ' 不是 PNG（爬虫只按 PNG 认 sizes）'); return; }
      const want = real.w + 'x' + real.h;
      let sizes = String(item.sizes || '').toLowerCase();
      if (!sizes) {
        warn(at + ' 没写 sizes，按实际尺寸输出 ' + want);
        sizes = want;
      } else if (sizes !== want) {
        warn(at + '：sizes 写的是 ' + sizes + '，图片实际是 ' + want + '（已按实际值输出）');
        sizes = want;
      }
      if (real.w !== real.h) { warn(at + '：' + src + ' 不是正方形（' + want + '），favicon 建议用正方形'); }
      list.push({ src: src, sizes: sizes });
    });
    if (list.length) { icons.png = list; }
  }
} else {
  warn('没配 icons.png —— 只有 SVG / ICO 时抓缩略图的爬虫没得挑，多尺寸 PNG 一定要给');
}

if (rawIcons.appleTouch) {
  const at = 'icons.appleTouch';
  const src = String((rawIcons.appleTouch.src) || '');
  if (!src) {
    fail(at + ' 缺少 src');
  } else if (!fileExists(src)) {
    fail(at + '：' + src + ' 不存在（先跑 tools\\make-icons.ps1）');
  } else {
    const real = readPng(path.join(root, src));
    if (!real) {
      fail(at + '：' + src + ' 不是 PNG');
    } else {
      const want = real.w + 'x' + real.h;
      let sizes = String(rawIcons.appleTouch.sizes || '');
      if (!sizes) { sizes = want; }
      else if (sizes !== want) {
        warn(at + '：sizes 写的是 ' + sizes + '，图片实际是 ' + want + '（已按实际值输出）');
        sizes = want;
      }
      if (real.w !== 180 || real.h !== 180) { warn(at + '：iOS「添加到主屏幕」一般用 180x180，现在是 ' + want); }
      icons.appleTouch = { src: src, sizes: sizes };
    }
  }
} else {
  warn('没配 icons.appleTouch —— iOS 添加到主屏幕会退回截图');
}

/* manifest：Android / 平板「添加到主屏幕」用它里面的 192 / 512，比 ICO 清楚 */
const manifestRel = rawIcons.manifest ? String(rawIcons.manifest) : '';
if (manifestRel) {
  if (/[\\]/.test(manifestRel)) { warn('icons.manifest 要用正斜杠：' + manifestRel); }
  if (/^https?:/i.test(manifestRel)) { fail('icons.manifest 要写仓库内的相对路径（如 "site.webmanifest"）'); }
  else { icons.manifest = manifestRel.replace(/^\.?\//, ''); }
} else {
  warn('没配 icons.manifest —— Android / 平板「添加到主屏幕」会退回放大 ICO，图标会糊');
}

/* 2. 分享封面：标题 / 描述 / 方图，绝对地址由 meta.url 或 site.pagesUrl 拼出来 */
meta.title = String(rawMeta.title || ds.site.name || '');
meta.siteName = String(rawMeta.siteName || ds.site.name || '');
meta.shortName = String(rawMeta.siteName || ds.site.name || meta.title || '');
meta.description = String(rawMeta.description || '');
if (!meta.title) { fail('meta.title 缺失（页面 <title> 和分享卡片标题都从这里取）'); }
if (!meta.description) { warn('meta.description 缺失，分享卡片没有描述'); }

const baseUrl = String(rawMeta.url || ds.site.pagesUrl || '');
if (!isAbsUrl(baseUrl)) {
  warn('meta.url / site.pagesUrl 不是完整地址（要 http(s):// 开头），og:url、og:image 这类需要绝对地址的标签会被跳过：' + JSON.stringify(baseUrl));
} else {
  if (meta.title) { meta.url = baseUrl; }

  /* 站点地址和 GitHub 仓库对不对得上：项目站点必须带 /仓库名/，
     写成域名根会指向另一个仓库（分享封面直接 404）。自定义域名这里只提醒，不拦。 */
  const mRepo = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?\/?$/i.exec(String(ds.site.repo || ''));
  if (mRepo) {
    const user = mRepo[1].toLowerCase();
    const name = mRepo[2].toLowerCase();
    const isUserSite = name === (user + '.github.io');
    const want = isUserSite
      ? 'https://' + user + '.github.io/'
      : 'https://' + user + '.github.io/' + name + '/';
    const got = baseUrl.replace(/\/+$/, '') + '/';
    if (got.toLowerCase() !== want) {
      warn('site.pagesUrl 和仓库对不上：仓库 ' + ds.site.repo + ' 的线上地址是 ' + want +
        '，现在配的是 ' + JSON.stringify(baseUrl) +
        '（项目站点漏掉 /' + name + '/ 这段，分享封面和站点图标就会指向别的仓库）');
    }
  }
}

const rawImage = String(rawMeta.image || '');
if (rawImage) {
  if (/\\/.test(rawImage)) { warn('meta.image 要用正斜杠：' + rawImage); }
  if (!fileExists(rawImage)) {
    fail('meta.image 指向的 ' + rawImage + ' 不存在');
  } else if (!isAbsUrl(baseUrl)) {
    warn('没有可用的完整站点地址，og:image 拼不出绝对地址（微信不认相对路径）——本次不输出分享封面');
  } else {
    const real = readPng(path.join(root, rawImage));
    meta.image = joinUrl(baseUrl, rawImage);
    meta.imageAlt = String(rawMeta.imageAlt || meta.title);
    if (real) {
      meta.imageWidth = real.w;
      meta.imageHeight = real.h;
      meta.imageType = 'image/png';
      /* 方图配 summary（微信 / QQ 收藏按正方形裁），宽图才配 summary_large_image */
      const square = Math.abs(real.w - real.h) <= Math.max(2, Math.round(real.w * 0.02));
      meta.twitterCard = square ? 'summary' : 'summary_large_image';
      if (!square) {
        warn('分享封面是宽图（' + real.w + 'x' + real.h + '）：微信 / QQ 的缩略图按正方形裁，两边会被切掉；' +
          '方图（800x800 或 1200x1200）最稳妥');
      } else if (real.w < 800) {
        warn('分享封面只有 ' + real.w + 'x' + real.h + '：建议换成 ≥800x800 的方图，否则卡片上放大后容易糊' +
          '（直接覆盖同名文件即可，JSON 不用改）');
      }
    } else {
      warn('meta.image 读不到宽高（不是 PNG），og:image:width/height 不输出，卡片可能被裁得不好：' + rawImage);
      meta.twitterCard = 'summary';
    }
  }
} else {
  warn('没配 meta.image —— 微信 / QQ / 飞书分享链接时没有封面图');
}

const headBody = indent(G.headHTML({ icons: icons, meta: meta }), 4);
const rHead = replaceRegion('index.html', 'head:start', 'head:end', headBody);
if (!rHead.ok) { fail('index.html：' + rHead.why); }

/* ---------------- 生成 site.webmanifest ----------------
 * Android / 平板的「添加到主屏幕」和桌面快捷方式优先用它里面的 192 / 512。
 * 注意：manifest 里的 icons.src 是相对 manifest 文件自身解析的，start_url 同理，
 * 所以图标和 manifest 都放在站点根目录、用相对路径，挂在子路径下也不会错。 */
function writeIfChanged(file, content) {
  const abs = path.join(root, file);
  const text = content.replace(/\r\n/g, '\n');
  const old = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  if (old !== null && old.replace(/\r\n/g, '\n') === text) { return { ok: true, changed: false }; }
  if (!CHECK_ONLY) { fs.writeFileSync(abs, text, 'utf8'); }
  return { ok: true, changed: true };
}

let rManifest = { ok: true, changed: false };
if (icons.manifest) {
  if (!icons.png || !icons.png.length) {
    fail('要生成 ' + icons.manifest + ' 就得配 icons.png（manifest 里的 192 / 512 从那里取）');
  } else {
    /* 给 manifest 挑 192 / 512；没有 512 就把最大的那张当 512 用不了，所以缺了要提醒 */
    const wantSize = n => {
      const hit = icons.png.filter(p => p.sizes === n + 'x' + n)[0];
      return hit ? hit : null;
    };
    const big = [];
    [192, 512].forEach(n => {
      const hit = wantSize(n);
      if (hit) { big.push({ src: hit.src, sizes: hit.sizes, type: 'image/png' }); }
      else { warn('icons.png 里没有 ' + n + 'x' + n + '，' + icons.manifest + ' 里会缺这一档（Android 主屏图标会糊）'); }
    });
    const manifest = {
      id: './',
      name: meta.title || ds.site.name || '',
      short_name: meta.shortName || meta.title || '',
      description: meta.description || '',
      lang: 'zh-CN',
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: String(rawMeta.backgroundColor || '#0b1220'),
      theme_color: String(rawMeta.themeColor || '#2b3a4b'),
      icons: big
    };
    rManifest = writeIfChanged(icons.manifest, JSON.stringify(manifest, null, 2) + '\n');
    if (!rManifest.ok) { fail(icons.manifest + '：' + rManifest.why); }

    /* 能不能「装成应用」：manifest 合格 + 注册了带 fetch 处理器的 Service Worker，缺一不可 */
    if (!fileExists('sw.js')) {
      warn('配了 manifest（想装成应用）但仓库根目录没有 sw.js —— 没有 Service Worker 时' +
        '「添加到主屏幕」只会做成带地址栏的快捷方式，不会变成独立窗口');
    } else {
      let shell = '';
      try { shell = fs.readFileSync(path.join(root, 'index.html'), 'utf8'); } catch (e) {}
      if (shell.indexOf('serviceWorker.register') < 0) {
        warn('index.html 里没找到 serviceWorker.register —— sw.js 存在但没注册，同样装不成独立应用');
      }
    }
  }
}

/* ---------------- 输出 ---------------- */
console.log('games.json：' + ds.total + ' 款游戏，' + ds.categories.length + ' 个分类');
ds.categories.forEach(c => console.log('  · ' + c.name + '（' + c.key + '）：' + c.count + ' 款'));

const iconLinks = [icons.ico, icons.svg].filter(Boolean).length +
  (icons.png ? icons.png.length : 0) + (icons.appleTouch ? 1 : 0) + (icons.manifest ? 1 : 0);
console.log('\n图标 / 分享卡片：' + iconLinks + ' 个 <link>' +
  (icons.icoSizes ? '（ICO 内含 ' + icons.icoSizes + '）' : '') +
  (icons.manifest ? ' + ' + icons.manifest : '') +
  (meta.image ? '，封面 ' + meta.image : '，没有分享封面'));

const touched = [];
if (rHome.changed) { touched.push('proF/主页.html（卡片）'); }
if (rNav.changed) { touched.push('index.html（侧栏入口）'); }
if (rNumHome.changed) { touched.push('proF/主页.html（顶部总数）'); }
if (rNumIndex.changed) { touched.push('index.html（侧栏总数）'); }
if (rHead.changed) { touched.push('index.html（图标 / 分享卡片）'); }
if (rManifest.changed) { touched.push((icons.manifest || 'site.webmanifest') + '（主屏图标）'); }
if (CHECK_ONLY) {
  if (touched.length) { console.log('\n需要同步：' + touched.join('、') + '（去掉 --check 可写入）'); }
  else { console.log('\n✓ 卡片 / 侧栏 / 数量 / 图标都已和 games.json 一致'); }
} else if (touched.length) {
  console.log('\n已同步：' + touched.join('、'));
} else {
  console.log('\n✓ 卡片 / 侧栏 / 数量 / 图标都已和 games.json 一致，无需改动');
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
