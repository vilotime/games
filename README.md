# 叶初小游戏

通过Vibe Coding，按照一定范式构建的纯 Canvas 小游戏，外壳是一个侧栏 + iframe 的静态页，没有构建步骤、没有后端、没有依赖，
直接 GitHub Pages 托管（仓库 `VILOTIME/games`，**项目站点**，所以带 `/games/` 路径）：
<https://vilotime.github.io/games/>

> **想邀请别人用 AI 帮忙做游戏？** [`docs/AI辅助编程说明.md`](docs/AI辅助编程说明.md) 是给**制作方**看的说明书，
> 可以直接连同压缩包一起转给对方：怎么装 DSH、怎么打开游戏包、两种提示词写法（**方式一**在对话框里
> 描述游戏；**方式二**先写 `游戏设计文档.md`，再用一段固定提示词原样复制粘贴）、发现偏差怎么纠、
> 提交前自检、常见问题。配套的制作者工具包就是仓库里的 `pack/`（`AGENTS.md` + `GAME-INFO.txt` +
> `proF/example.html` + `ui/`），整个文件夹压成 zip 发给对方即可。对方提交 zip 后，把 `proF/` 里那一个 HTML 复制进来、
> 按 `GAME-INFO.txt` 加一行清单就上线。

```
.
├─ index.html      外壳：侧栏导航 + iframe
├─ games.json      ★ 游戏清单（唯一数据源，加游戏只改这里）
├─ favicon.ico     站点图标兜底（搜索引擎只认根目录这个，tools/make-icons.ps1 生成）
├─ site.webmanifest Android / PWA 主屏图标清单（tools/export-games.js 生成）
├─ sw.js           Service Worker（只为「装成应用」，不做缓存）
├─ README.md       本文件
├─ LICENSE         许可证
├─ core/           站点自己的前台代码（清单渲染器 games.js）
├─ tools/          维护脚本（清单同步、图标生成、本地预览）
├─ ui/             ★ UI 库（可整包复制给别的项目）
├─ proF/           游戏页面 + 主页游戏墙
├─ pack/           ★ 对外制作包（压成 zip 发给合作者）
├─ docs/           说明文档（AI 辅助编程说明、封面与图标说明）
└─ assets/         站点图标与分享图（icon-16/32/192/512.png、favicon.svg、share-square.png）
```

> 这里只列**顶层结构**，不列具体文件和数量 —— 加游戏、换图标、加脚本都不会让这段过期。
> 每个目录里有什么，直接看目录；`ui/` 的用法见 `ui/README.md`。

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

派生字段不落盘，由 `core/games.js` 现算：

| 派生字段 | 规则 |
|---|---|
| `id` | `file` 的文件名去掉 `.html`（稳定 key） |
| `rel` | `file` 相对 `site.dir` 的路径（主页卡片 `href`） |
| `url` | 站点路径前缀（取自 `site.pagesUrl`，本站是 `/games`）+ `/` + `file`；没配 `pagesUrl` 时退回 `file` |
| `mobile` | `!pcOnly` |
| `tags` | `pcOnly ? ['pc-only'] : []` |
| `pageTitle` | 同 `name` |
| `colors.glow` | 由 `c1` 生成的 `rgba(r,g,b,.5)` |
| `count` / `total` | 数组长度 |

旧写法 `{"id":"文件名"}` 仍然认，会按 `site.dir + id + '.html'` 推断。

## 站点信息：标题 / 图标 / 分享封面

`games.json` 里除了游戏清单，还有三段站点级配置，全部由 `tools/export-games.js` 写进
`index.html` 的 head 标记区（`<!-- head:start -->` … `<!-- head:end -->`）并生成 `site.webmanifest`，
**生成出来的那段和那个文件都别手改**：

| 段 | 管什么 |
|---|---|
| `site` | 站点名、游戏目录 `dir`、主页 `homepage`、仓库地址，以及 `pagesUrl` —— 分享卡片拼绝对地址、`url` / `homepageUrl` 算路径前缀都用它。本站是项目站点，值是 `https://vilotime.github.io/games/`（**别写成域名根**，那是另一个仓库） |
| `icons` | 站点图标：`ico` / `svg` / `png[]` / `appleTouch` / `manifest`。`.ico` 必须在**仓库根目录**，否则 Bing 会退回 GitHub 图标 |
| `meta` | `<title>`、`<meta name="description">`、分享封面 `image`（方图自动配 `twitter:card=summary`，宽图自动切 `summary_large_image`）、manifest 用的 `themeColor` / `backgroundColor` |

```json
"icons": {
  "ico": "favicon.ico",
  "svg": "assets/favicon.svg",
  "png": [
    {"src":"assets/icon-16.png","sizes":"16x16"},
    {"src":"assets/icon-192.png","sizes":"192x192"}
  ],
  "appleTouch": {"src":"assets/apple-touch-icon.png","sizes":"180x180"},
  "manifest": "site.webmanifest"
},
"meta": {
  "title": "叶初小游戏",
  "description": "……",
  "siteName": "叶初小游戏",
  "image": "assets/share-square.png",
  "imageAlt": "叶初小游戏 · 封面",
  "themeColor": "#2b3a4b",
  "backgroundColor": "#0b1220"
}
```

- **`sizes` 一律按真实尺寸写**：`<link rel="icon">` 指 `.ico` 时写的是 ICO **内部真实包含**的尺寸
  （现在是 `16x16 32x32 48x48 192x192`，由脚本读 ICO 目录自动生成），**不能写 `any`** ——
  写了 `any` 浏览器会当它可缩放，高分屏上把位图放大，标签页图标就糊了。`sizes="any"` 只给 SVG。
- 换图标：`.\tools\make-icons.ps1`（渐变底 + 白色播放三角，或 `-Design photo -Source 图.png`）。
  它写出根目录 `favicon.ico`（内含 16/32/48/**192**）+ `assets/icon-16/32/192/512.png`
  + `apple-touch-icon.png`（180，**满版不透明**，iOS 自己套圆角）并回读校验；
- 换封面：直接替换 `assets/share-square.png`（保持方图），JSON 不用改 —— 宽高是脚本读 PNG 文件头现算的；
- `site.webmanifest` 由脚本按 `icons.png` 的 192 / 512 生成，给 Android / 平板「添加到主屏幕」用
  （里面的 `src` 相对 manifest 自身解析，`start_url` 用 `./`，所以挂在 `/games/` 下也不会错）；
- 规则与踩坑记录见 [`docs/cover-and-icons.md`](docs/cover-and-icons.md)，那篇是通用版（不绑本项目）。

## 像 App 一样装到主屏

想让「添加到主屏幕」变成**独立窗口的应用**（不带地址栏、有自己的图标和启动底色），三样东西缺一不可，
现在都已经就位：

| 东西 | 在哪 | 谁管 |
|---|---|---|
| `site.webmanifest`（`name`、192/512 图标、`start_url`、`display: standalone`） | 仓库根目录 | `tools/export-games.js` 按 `games.json` 的 `icons` / `meta` 生成 |
| **Service Worker**（带 fetch 处理器） | 根目录 `sw.js`，由 `index.html` 末尾那段脚本注册 | 手写，一般不用动 |
| iOS 的三条 meta（`apple-mobile-web-app-capable` 等） | `index.html` 的 head 标记区 | 跟着 manifest 一起生成 |

- `sw.js` **故意不做任何缓存**：这个站是纯静态、靠浏览器缓存 + `Ctrl+F5`，SW 再叠一层只会出现
  「改了看不到」。它存在的意义只是满足 Chrome / Edge 的安装条件；断网时会返回一句提示而不是白屏。
  以后真要离线可玩再加 precache，但那时记得给缓存加版本号、并让 HTML 走 network-first。
- `tools/export-games.js` 会顺手校验这条链路：`icons.manifest` 配了但仓库里没有 `sw.js`、
  或者 `index.html` 里没有 `serviceWorker.register`，都会提醒「只会做成带地址栏的快捷方式」。
- **怎么确认生效**：手机 Chrome / Edge → 右上菜单应出现「安装应用 / 添加到主屏幕」这类字眼，
  装完点开是**没有地址栏**的独立窗口；桌面 F12 → **Application** 面板里
  `Manifest` 无警告、`Service Workers` 状态是 activated。iOS 用 Safari「分享 → 添加到主屏幕」，
  靠的是 `apple-mobile-web-app-capable` + `apple-touch-icon`（180 那张是满版不透明）。
- 注意：Service Worker 只在**安全上下文**里生效 —— 线上是 https，本地用 `node tools/dev.js` 开
  `http://127.0.0.1:8080`（localhost 豁免）也算；直接双击 `file://` 打开时那段注册代码会自己跳过，不影响浏览。

## `core/games.js`（清单渲染器）

`#gamesRoot` / `#nav` / `data-game-*` 这些是本站约定，所以它属于站点自己的 `core/`，而不是通用的 `ui/`。

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

`YCGames.headHTML({icons, meta})` 生成 head 里的图标 / 分享卡片标记，只给构建脚本用：
`tools/export-games.js` 先把 PNG 宽高、ICO 尺寸、绝对地址算好再传进来，浏览器运行时不用它。

## `games.json` 的同步策略

**`games.json` 是唯一数据源**，主页卡片、侧栏入口、分类数量、游戏总数全部由它派生，HTML 里不再手动维护。
但页面有**两套渲染路径**，改完 json 之后"能不能立刻看到"取决于你用的是哪一套：

| 路径 | 什么时候生效 | 数据来自 |
|---|---|---|
| **运行时渲染** | 用 `http(s)` 打开时（线上、或本地 `tools/dev.js`） | `fetch('games.json')` → `core/games.js` 现场生成卡片 / 侧栏 / 数量 |
| **静态兜底** | 无 JS、断网，或**双击 `file://` 打开**（`fetch` 被 CORS 拦） | HTML 里由脚本预先写好的副本 |

### 会被同步的 6 个位置

| 位置 | 由谁维护 |
|---|---|
| `proF/主页.html` 的 `<!-- games:start -->` … `<!-- games:end -->`（全部卡片） | `tools/export-games.js` 整段重写 |
| `index.html` 的 `<!-- nav:start -->` … `<!-- nav:end -->`（侧栏入口） | 同上 |
| `index.html` 的 `<!-- head:start -->` … `<!-- head:end -->`（标题 / 图标 / 分享卡片） | 同上，按 `icons`、`meta` 生成 |
| `site.webmanifest`（Android / PWA 主屏图标） | 同上，按 `icons.png` 的 192 / 512 整个文件生成 |
| `proF/主页.html` 顶部「共 `data-game-total` 款」 | 同上，单独重写数字 |
| `index.html` 侧栏「`data-game-count` 款」 | 同上，单独重写数字 |

分类数量 `<span class="num" data-game-cat="football">` 在卡片区块内部，跟着一起重写。

### 三种场景该怎么做

| 你怎么用 | 改了 `games.json` 之后 |
|---|---|
| **线上（GitHub Pages）** | 提交推送 → 等部署 → `Ctrl + F5`。**不用跑任何脚本**，页面自己 fetch 新 json |
| **本地 http 预览** | 跑 `node tools/dev.js`，浏览器开 `http://127.0.0.1:8080/index.html`；保存 json 会自动同步兜底，`Ctrl + R` 就能看到 |
| **本地双击 `index.html`** | `file://` 下浏览器不允许读本地 json，页面**一律走静态兜底**（不会再刷 CORS 报错）—— 改了 json **必须双击 `tools\sync.cmd` 同步一次**，否则看到的还是旧内容 |

> 双击打开时控制台会有一句蓝色提示
> `[games.json] 本地 file:// 打不开 json，页面使用 HTML 静态兜底（要看实时 json 请先跑 node tools/dev.js）`
> —— 不是报错，是在提醒你"想改完立刻生效就用 http 预览"。

### 命令

```bash
node tools/export-games.js           # 校验 json + 重写静态兜底、数量、head 和 site.webmanifest
node tools/export-games.js --check   # 只检查，不写文件（CI / 提交前用）
node tools/dev.js                    # 本地 http 预览（启动前自动同步 + 监听 json 自动同步）
powershell -File tools/sync.ps1      # 上面第一条的 PowerShell 包装，跑完停住看结果
powershell -File tools/make-icons.ps1   # 重新生成站点图标（ICO + 多尺寸 PNG + 满版主屏图标）
```

`tools/export-games.js` 除了同步，还会校验 json：`id` 重复、`file` 指向的文件不存在、
颜色不是 hex、`pcOnly` 类型不对、字段名拼错、`file` 用了反斜杠等，有问题会逐条打印；
图标 / 封面那几段还会查：`.ico` 是不是真 ICO、里面有没有 48 和 192、
PNG 的 `sizes` 和实际宽高是否一致、`appleTouch` 是不是 180×180、
分享封面有没有被拼成绝对地址、是不是方图（宽图微信会裁）、有没有忘了配 `icons.ico`（Bing 会退回
GitHub 图标）或 `icons.manifest`、`site.pagesUrl` 和仓库对不对得上（项目站点漏掉 `/games/` 会指向另一个仓库）。

### Windows 一键：双击 `tools\sync.cmd`

不想开终端的话，直接进 `tools` 文件夹**双击 `sync.cmd`**：

1. 它会自动找到仓库根目录（按脚本自身位置算，从哪双击都行）；
2. 先打印 json 现状（几款游戏、每个分类几款）；
3. 跑同步，打印 `[完成] 用时 xx ms`；
4. **停在窗口里等你按回车**，所以能看清结果，不会一闪而过。

为什么给的是 `.cmd` 而不是让你双击 `.ps1`：

- `.ps1` 双击默认会被**记事本打开**，或者被执行策略拦下来报"无法加载文件"；
- `sync.cmd` 里用 `-ExecutionPolicy Bypass` 临时放行，并且优先用 PowerShell 7（`pwsh.exe`）、没有就退回系统自带的 5.1，两种机器都能跑。

想在双击的基础上加参数，就开一个 PowerShell 窗口手动跑：

```powershell
.\tools\sync.ps1              # 同步（跑完停住）
.\tools\sync.ps1 -Check       # 只检查
.\tools\sync.ps1 -Serve       # 同步完顺手起本地预览
.\tools\sync.ps1 -NoPause     # 跑完不停留（给脚本调用）
```

**自动填数量**用的三种属性（静态兜底里已经写好，运行时由 `applyCounts()` 更新；数字由脚本写，不用手抄）：

```html
<b data-game-total>N</b>                          <!-- 只写数字 -->
<span class="brand-sub" data-game-count>N 款</span>
<span class="num" data-game-cat="football">N 款</span>   <!-- 按分类 key -->
```

## 游戏页面约定

- 只引 `../ui/yc-ui.css` 和 `../ui/yc-ui.js`，其余资源全部内联，不引 CDN / 外链图片 / 字体；
- 文件名就是游戏 id（中文可以，不要空格）；
- `<title>` 写显示名；
- 仅电脑游戏用 `<body data-pc-only="1">`，并自带「只能在电脑上玩」的拦截画面；
- 不要加全屏按钮 / 横竖屏切换（本项目已移除全屏逻辑）；
- 页面专属样式写在页面内 `<style>`，不改 `ui/yc-ui.css`。
- **`resize()` 里的缩放别加下限**（`s = Math.max(0.4, s)` 这种）：窄屏上画布会比容器宽，
  `#stage` 是 flex item 会被压扁，画布右侧溢出、被 `overflow: hidden` 以**方角**裁掉，
  `.overlay` 是圆角的，开局遮罩的右上 / 右下两个角就会露出没压暗的画面。
  正确写法见 `ui/README.md`「画布自适应」和 `pack/AGENTS.md` 第 5.1 节。

## 本地调试

**推荐用 http 打开**（和线上行为一致，改 json 立刻生效）：

```bash
node tools/dev.js        # 自动打开 http://127.0.0.1:8080/index.html，并监听 games.json
```

双击 `index.html` 也能开（`file://`），但此时 json 读不到、页面走静态兜底 —— 改了 `games.json`
要先**双击 `tools\sync.cmd`**（或跑 `node tools/export-games.js`）才会看到变化；`sync.cmd` 跑完会停在窗口里，方便看结果。

线上改动记得强刷 `Ctrl + F5`；`games.json` 的请求本身带了 `cache: 'no-cache'`，但 HTML 会被浏览器缓存。
