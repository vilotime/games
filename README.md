# 叶初小游戏

一系列纯 Canvas 写的小游戏，外壳是一个侧栏 + iframe 的静态页，没有构建步骤、没有后端、没有依赖，
直接 GitHub Pages 托管：<https://vilotime.github.io/>

> **想邀请别人用 AI 帮忙做游戏？** [`AI辅助编程说明.md`](AI辅助编程说明.md) 是给**制作方**看的说明书，
> 可以直接连同压缩包一起转给对方：怎么装 DSH、怎么打开游戏包、两种提示词写法（**方式一**在对话框里
> 描述游戏；**方式二**先写 `游戏设计文档.md`，再用一段固定提示词原样复制粘贴）、发现偏差怎么纠、
> 提交前自检、常见问题。配套的制作者工具包就是仓库里的 `pack/`（`AGENTS.md` + `GAME-INFO.txt` +
> `proF/example.html` + `ui/`），整个文件夹压成 zip 发给对方即可。对方提交 zip 后，把 `proF/` 里那一个 HTML 复制进来、
> 按 `GAME-INFO.txt` 加一行清单就上线。

```
.
├─ index.html           外壳：侧栏导航 + <iframe name="gameFrame">
├─ games.json           ★ 游戏清单（唯一数据源，加游戏只改这里）
├─ games.js             清单渲染器：读 json → 主页卡片 + 侧栏入口 + 数量
├─ tools/
│  └─ export-games.js   校验 json + 同步静态兜底 HTML（可选命令）
├─ ui/                  ★ 游戏 UI 库（可整包复制给别的项目，见 ui/README.md）
├─ proF/                各游戏页面 + 主页卡片页
│  ├─ 主页.html         iframe 里显示的游戏墙
│  └─ *.html            11 个游戏，每个一个文件
├─ pack/                ★ 对外制作包：压成 zip 发给合作者（见 AI辅助编程说明.md）
├─ AI辅助编程说明.md     邀请别人用 AI 做游戏的流程、两种提示词写法、收包验收
├─ README.md            本文件
├─ favicon.png / apple-touch-icon.png / cover.png
```

## 加一款游戏

1. 把游戏页面放好，例如 `proF/新游戏.html`
2. 在 `games.json` 对应分类里加一行：

```json
{"file":"proF/新游戏.html","name":"显示名","icon":"🎮","desc":"一句话玩法","pcOnly":false,"c1":"#2f9e6a","c2":"#14663f"}
```

刷新即可 —— 主页卡片、侧栏入口、分类数量、游戏总数全部自动出现，
`proF/主页.html` 和 `index.html` 都不用改。

## `games.json`（schema `yc-games/2`）

每款游戏只写 7 个字段，一局一行：

| 字段 | 说明 |
|---|---|
| `file` | 真实位置，可带子目录（`proF/新系列/深海行动.html`），必填 |
| `name` | 显示名（卡片标题 / 侧栏名 / 页面标题） |
| `icon` | 一个 emoji |
| `desc` | 卡片副标题 |
| `pcOnly` | `true` = 只能电脑玩（卡片角标「仅电脑」、侧栏「电脑」标签、手机上隐藏 HUD） |
| `c1` / `c2` | 卡片封面渐变的亮色 / 暗色，hex；悬停发光 `--glow-c` 由 `c1` 自动生成 |

派生字段不落盘，由 `games.js` 现算：

| 派生字段 | 规则 |
|---|---|
| `id` | `file` 的文件名去掉 `.html`（稳定 key） |
| `rel` | `file` 相对 `site.dir` 的路径（主页卡片 `href`） |
| `url` | `/` + `file`（站点根路径） |
| `mobile` | `!pcOnly` |
| `tags` | `pcOnly ? ['pc-only'] : []` |
| `pageTitle` | 同 `name` |
| `colors.glow` | 由 `c1` 生成的 `rgba(r,g,b,.5)` |
| `count` / `total` | 数组长度 |

旧写法 `{"id":"文件名"}` 仍然认，会按 `site.dir + id + '.html'` 推断。

## `games.js`（清单渲染器）

`#gamesRoot` / `#nav` / `data-game-*` 这些是本站约定，所以它放在根目录而不是 `ui/`。

```js
YCGames.load('./games.json').then(function (ds) {
  YCGames.renderHome(document.getElementById('gamesRoot'), ds);  // 主页卡片区
  YCGames.renderNav(document.getElementById('nav'), ds);         // 侧栏入口（保留「主页」）
  YCGames.applyCounts(document, ds);                             // 写死的数量
  if (window.__ycNavSync) { window.__ycNavSync(); }              // 外壳恢复高亮 + 补预取

  ds.total;                                   // 11
  ds.categories[0].count;                     // 5
  YCGames.byId(ds, '叶初的鱼塘');               // 单款，找不到返回 null
  YCGames.parse(raw);                         // 不吃网络，直接展开一个已解析对象
  YCGames.cardHTML(ds.games[0]);              // 生成单张卡片标记
  YCGames.homeHTML(ds); YCGames.navHTML(ds);  // 整段标记（构建脚本用同一套）
});
```

## 静态兜底 + 校验

`proF/主页.html` 的 `<div id="gamesRoot">` 与 `index.html` 的 `<nav id="nav">` 里各有一段被
`games:start/end`、`nav:start/end` 包住的标记区域，是 `games.json` 的静态副本（无 JS / 无网络时用）。
下面的命令会用同一套 `games.js` 生成器重写它，并校验 json（id 重复、文件缺失、颜色格式、
拼错字段名、`file` 用反斜杠等）：

```bash
node tools/export-games.js           # 校验 + 同步静态兜底
node tools/export-games.js --check   # 只校验，不写文件
```

**自动填数量**的三种属性（静态兜底里已写好）：

```html
<span data-game-total>11</span>               <!-- 只写数字 -->
<span class="brand-sub" data-game-count>11 款</span>
<span class="num" data-game-cat="football">5 款</span>   <!-- 按分类 key -->
```

## 游戏页面约定

- 只引 `../ui/yc-ui.css` 和 `../ui/yc-ui.js`，其余资源全部内联，不引 CDN / 外链图片 / 字体；
- 文件名就是游戏 id（中文可以，不要空格）；
- `<title>` 写显示名；
- 仅电脑游戏用 `<body data-pc-only="1">`，并自带「只能在电脑上玩」的拦截画面；
- 不要加全屏按钮 / 横竖屏切换（本项目已移除全屏逻辑）；
- 页面专属样式写在页面内 `<style>`，不改 `ui/yc-ui.css`。

## 本地调试

直接双击 `index.html` 即可（`file://` 下 json 读不到时会走静态兜底，页面不会空）。
线上改动记得强刷 `Ctrl + F5`。
