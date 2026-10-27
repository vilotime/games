/* ============================================================
 * 叶初小游戏 · games.json 读取 / 展开 / 渲染
 * ------------------------------------------------------------
 * games.json 是唯一数据源，每款游戏只写 7 个字段：
 *     id / name / icon / desc / pcOnly / c1 / c2
 * 其余（file、url、mobile、tags、pageTitle、glow、count）全部现算。
 *
 * 页面用法：
 *     <script src="./ui/games.js"></script>
 *     YCGames.load('./games.json').then(function (ds) {
 *       YCGames.renderHome(document.getElementById('gamesRoot'), ds); // 主页卡片
 *       YCGames.renderNav(document.getElementById('nav'), ds);        // 侧栏入口
 *       YCGames.applyCounts(document, ds);                            // 写死的数量
 *     });
 * ============================================================ */
(function () {
  'use strict';

  var SCHEMA = 'yc-games/2';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function hexToRgba(hex, a) {
    var h = String(hex || '').trim().replace(/^#/, '');
    if (h.length === 3) { h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2); }
    var n = parseInt(h, 16);
    if (h.length !== 6 || isNaN(n)) { return 'rgba(79,156,249,.5)'; }
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',.5)';
  }

  function basename(p) {
    return String(p || '').replace(/^.*\//, '').replace(/\.html$/i, '');
  }

  function indentHTML(html, n) {
    var pad = '';
    for (var i = 0; i < n; i++) { pad += ' '; }
    return String(html).split('\n').map(function (line) { return line ? pad + line : line; }).join('\n');
  }

  /* 单款游戏：补全所有派生字段
   * file 是真实位置（可带子目录）；没写 file 时退回 dir + id + '.html'。
   * 由此派生：id（文件名去掉 .html）、rel（相对 dir 的路径，主页卡片用）、url（站点根路径）。 */
  function expand(g, dir) {
    var raw = String(g.file || '').trim().replace(/^\.?\//, '');
    if (!raw) { raw = String(g.id || '').trim().replace(/^\.?\//, ''); }
    if (!raw) { raw = 'untitled'; }
    var file = raw.indexOf('/') >= 0 ? raw : dir + raw;
    if (!/\.html?$/i.test(file)) { file += '.html'; }
    var id = g.id || basename(file);
    var rel = file.indexOf(dir) === 0 ? file.slice(dir.length) : file;
    var pcOnly = !!g.pcOnly;
    var c1 = g.c1 || ((g.colors && g.colors.c1) || '');
    var c2 = g.c2 || ((g.colors && g.colors.c2) || '');
    return {
      id: id,
      name: g.name || id,
      file: file,
      rel: rel,
      url: '/' + file,
      icon: g.icon || '🎮',
      desc: g.desc || '',
      pcOnly: pcOnly,
      mobile: !pcOnly,
      tags: pcOnly ? ['pc-only'] : [],
      pageTitle: g.pageTitle || g.name || id,
      colors: { c1: c1, c2: c2, glow: hexToRgba(c1, 0.5) }
    };
  }

  /* 把 games.json 的原始对象展开成完整数据 */
  function parse(raw) {
    raw = raw || {};
    var site = raw.site || {};
    var dir = site.dir || 'proF/';
    var src = raw.categories || [];
    var ds = {
      schema: raw.schema || SCHEMA,
      site: {
        name: site.name || '',
        dir: dir,
        homepage: site.homepage || (dir + '主页.html'),
        homepageUrl: '/' + (site.homepage || (dir + '主页.html')).replace(/^\//, ''),
        repo: site.repo || '',
        pagesUrl: site.pagesUrl || ''
      },
      categories: [],
      games: [],
      total: 0
    };

    for (var i = 0; i < src.length; i++) {
      var cat = src[i] || {};
      var games = [];
      var list = cat.games || [];
      for (var j = 0; j < list.length; j++) {
        var g = expand(list[j], dir);
        g.category = cat.key || '';
        g.categoryName = cat.name || '';
        games.push(g);
        ds.games.push(g);
      }
      ds.categories.push({
        key: cat.key || '',
        icon: cat.icon || '',
        name: cat.name || '',
        count: games.length,
        games: games
      });
    }
    ds.total = ds.games.length;
    return ds;
  }

  /* 拉取并展开 games.json */
  function load(url) {
    if (typeof fetch !== 'function') { return Promise.reject(new Error('fetch unsupported')); }
    var u = url || './games.json';

    /* file:// 下浏览器一律拒绝读本地 json（origin 为 null），与其刷一串 CORS 红字，
       不如直接走 HTML 静态兜底；想看实时 json 起 tools/dev.js 走 http 即可。 */
    if (typeof location !== 'undefined' && location.protocol === 'file:') {
      if (typeof console !== 'undefined' && console.info) {
        console.info('[games.json] 本地 file:// 打不开 json，页面使用 HTML 静态兜底（要看实时 json 请先跑 node tools/dev.js）');
      }
      return Promise.reject(new Error('file:// 下不读取 json'));
    }

    return fetch(u, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) { throw new Error('HTTP ' + r.status); }
        return r.json();
      })
      .then(parse)
      .catch(function (err) {
        /* 读不到 json 时页面会退回 HTML 里的静态兜底（改 json 不会立刻生效）——把原因打进控制台，免得以为没生效 */
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[games.json] 读取失败，页面正在使用 HTML 静态兜底：' + u + '（' + (err && err.message ? err.message : err) + '）');
        }
        throw err;
      });
  }

  /* ---------------- 标记生成（浏览器 + 构建脚本共用） ---------------- */

  /* 一张卡片；hrefBase 为空时用同目录文件名（主页用），否则加前缀（侧栏用） */
  /* 一张卡片；href 用相对 site.dir 的路径（主页在 dir 里） */
  function cardHTML(g) {
    var style = '--c1:' + g.colors.c1 + ';--c2:' + g.colors.c2 + ';--glow-c:' + g.colors.glow;
    return '<a class="card" href="' + esc(g.rel) + '" style="' + esc(style) + '">\n' +
      '  <div class="cover">' + (g.pcOnly ? '<span class="pc">仅电脑</span>' : '') +
      '<span class="emoji">' + esc(g.icon) + '</span><span class="go">→</span></div>\n' +
      '  <div class="meta"><h3>' + esc(g.name) + '</h3><p>' + esc(g.desc) + '</p></div>\n' +
      '</a>';
  }

  /* 一个分类：标题行 + 卡片网格 */
  function sectionHTML(cat) {
    var cards = [];
    for (var i = 0; i < cat.games.length; i++) { cards.push(indentHTML(cardHTML(cat.games[i]), 2)); }
    return '<div class="sec"><span class="ic">' + esc(cat.icon) + '</span><h2>' + esc(cat.name) +
      '</h2><span class="bar"></span><span class="num" data-game-cat="' + esc(cat.key) + '">' +
      cat.count + ' 款</span></div>\n' +
      '<div class="grid">\n' + cards.join('\n') + '\n</div>';
  }

  /* 主页全部分类 HTML */
  function homeHTML(ds) {
    var out = [];
    for (var i = 0; i < ds.categories.length; i++) { out.push(sectionHTML(ds.categories[i])); }
    return out.join('\n');
  }

  /* 侧栏入口 HTML（不含「主页」那一条） */
  function navHTML(ds) {
    var out = [];
    for (var i = 0; i < ds.categories.length; i++) {
      var cat = ds.categories[i];
      out.push('<div class="nav-group">' + esc(cat.icon) + ' ' + esc(cat.name) + '</div>');
      for (var j = 0; j < cat.games.length; j++) {
        var g = cat.games[j];
        out.push('<a href="' + esc(g.file) + '" target="gameFrame" data-icon="' + esc(g.icon) +
          '" data-name="' + esc(g.name) + '">\n' +
          '  <span class="ic" aria-hidden="true">' + esc(g.icon) + '</span><span class="nm">' +
          esc(g.name) + '</span>' + (g.pcOnly ? '<span class="tag">电脑</span>' : '') + '\n' +
          '</a>');
      }
    }
    return out.join('\n');
  }

  function setHTML(el, html) {
    if (!el) { return; }
    if (el.innerHTML !== html) { el.innerHTML = html; }
  }

  /* 渲染主页卡片区（整体替换，HTML 里的静态卡片是没网时的兜底） */
  function renderHome(root, ds) {
    if (!root || !ds) { return; }
    setHTML(root, homeHTML(ds));
  }

  /* 渲染侧栏入口：保留第一条「主页」，其余按 games.json 重建 */
  function renderNav(navEl, ds) {
    if (!navEl || !ds) { return; }
    var home = navEl.querySelector('a');
    if (!home) { return; }
    var kill = [];
    for (var n = home.nextSibling; n; n = n.nextSibling) { kill.push(n); }
    for (var k = 0; k < kill.length; k++) { navEl.removeChild(kill[k]); }
    var tpl = document.createElement('div');
    tpl.innerHTML = navHTML(ds);
    while (tpl.firstChild) { navEl.appendChild(tpl.firstChild); }
  }

  /* 自动填充页面里写死的数量（HTML 里的数字只作为兜底）：
   *   <span data-game-total>11</span>              → 只写数字
   *   <span data-game-count>11 款</span>           → 总数 + 款
   *   <span data-game-cat="football">5 款</span>   → 该分类数量 + 款
   * 值没变化的元素不会被改动。 */
  function applyCounts(doc, ds, opts) {
    doc = doc || document;
    if (!ds) { return; }
    var unit = (opts && opts.unit) || ' 款';

    var totals = doc.querySelectorAll('[data-game-total]');
    for (var t = 0; t < totals.length; t++) {
      var n = String(ds.total);
      if (totals[t].textContent !== n) { totals[t].textContent = n; }
    }

    var counted = doc.querySelectorAll('[data-game-count]');
    for (var c = 0; c < counted.length; c++) {
      var txt = ds.total + unit;
      if (counted[c].textContent !== txt) { counted[c].textContent = txt; }
    }

    var cats = doc.querySelectorAll('[data-game-cat]');
    for (var k = 0; k < cats.length; k++) {
      var found = null;
      for (var m = 0; m < ds.categories.length; m++) {
        if (ds.categories[m].key === cats[k].getAttribute('data-game-cat')) { found = ds.categories[m]; break; }
      }
      if (!found) { continue; }
      var s = found.count + unit;
      if (cats[k].textContent !== s) { cats[k].textContent = s; }
    }
  }

  function byId(ds, id) {
    if (!ds || !ds.games) { return null; }
    for (var i = 0; i < ds.games.length; i++) {
      if (ds.games[i].id === id) { return ds.games[i]; }
    }
    return null;
  }

  var api = {
    SCHEMA: SCHEMA,
    load: load,
    parse: parse,
    expand: expand,
    applyCounts: applyCounts,
    byId: byId,
    cardHTML: cardHTML,
    sectionHTML: sectionHTML,
    homeHTML: homeHTML,
    navHTML: navHTML,
    renderHome: renderHome,
    renderNav: renderNav
  };

  if (typeof window !== 'undefined') { window.YCGames = api; }
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
})();
