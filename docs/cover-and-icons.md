# 封面与图标说明

这个站上一共有**三种长得像「图」**的东西（外加页面标题），用途完全不同，别混在一起改。
全部配置都在 `games.json` 里：`icons`（图标）、`meta`（标题 / 描述 / 分享封面）。
`tools\sync.cmd` 一次写进 `index.html` 的 head 标记区，**生成出来的那段 HTML 不要手改**。

| 类型 | JSON 字段 | 出现在哪 | 典型尺寸 |
| --- | --- | --- | --- |
| 站点图标（favicon） | `icons.*` | 浏览器标签页、书签、**搜索结果左侧的小图标** | 16/32/48/192/512 |
| 分享封面（og:image） | `meta.image` | 微信/QQ/Twitter/飞书的链接卡片、微信收藏 | 800×800 方图 |
| 标题 / 描述 | `meta.title`、`meta.description` | 标签页、搜索结果标题、卡片标题 | — |

---

## 1. 站点图标：`icons`

搜索引擎结果里那个小图标就是它。**这是最容易踩坑的一处。**

```json
"icons": {
  "ico": "favicon.ico",
  "svg": "assets/favicon.svg",
  "png": [
    { "src": "assets/icon-16.png",  "sizes": "16x16" },
    { "src": "assets/icon-32.png",  "sizes": "32x32" },
    { "src": "assets/icon-192.png", "sizes": "192x192" },
    { "src": "assets/icon-512.png", "sizes": "512x512" }
  ],
  "appleTouch": { "src": "assets/apple-touch-icon.png", "sizes": "180x180" }
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `ico` | **强烈建议** | `.ico` 文件，放在**仓库根目录**，即 `/favicon.ico`。搜索引擎和老浏览器只认这个 |
| `svg` | 可选 | 现代浏览器首选，矢量最清晰；但**搜索引擎不认** |
| `png` | **强烈建议** | 多尺寸 PNG。Google/Bing 抓缩略图时按 `sizes` 挑合适的 |
| `appleTouch` | 可选 | iOS「添加到主屏幕」的图标，一般 180×180 |

生成后的 HTML（这一段由 `tools/export-games.js` 维护，**不要手改**）：

```html
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="icon" type="image/png" sizes="16x16" href="assets/icon-16.png">
<link rel="icon" type="image/png" sizes="32x32" href="assets/icon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="assets/icon-192.png">
<link rel="icon" type="image/png" sizes="512x512" href="assets/icon-512.png">
<link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
```

`.ico` 排在最前面是故意的：它是兜底，谁都能读；后面依次是更清晰的选择。

### 为什么以前 Bing 显示的是 GitHub 图标

因为站点原本只给了**一张 64×64 的 PNG**（`assets/favicon.png`）：

- 根目录**没有** `favicon.ico`，而 Bing 和很多爬虫不会老实解析 `<link rel="icon">`，
  它们直接请求 `https://你的域名/favicon.ico`；
- 根目录没有这个文件 → 抓不到 → 退回**托管域名**的图标，在 GitHub Pages 上就是 GitHub 的小图标。

补上根目录的 `favicon.ico` + 多尺寸 PNG 之后这个问题就没了。

### 文件都是哪来的

跑一次 `tools\make-icons.ps1` 全部生成：

```powershell
.\tools\make-icons.ps1                                     # 渐变底 + 白色播放三角（和 favicon.svg 一致）
.\tools\make-icons.ps1 -Design photo -Source assets\share-square.png   # 换用现成的一张方图
.\tools\make-icons.ps1 -Bg1 "#7ab648" -Bg2 "#2e5a1a"       # 只换渐变色
```

脚本会写出：根目录的 `favicon.ico`（内含 16/32/48 三个尺寸）+ `assets/` 下的
`icon-16/32/192/512.png` 和 `apple-touch-icon.png`，最后**回读校验**（ICO 头是不是真的 ICO、
每个 PNG 的实际宽高对不对）。

> `assets/favicon.svg` 是手写的矢量版，脚本不会动它。如果你换了图标设计，记得把 SVG 也一起换掉，
> 否则现代浏览器（用 SVG）和搜索引擎（用 ICO）会显示两个不同的图标。

---

## 2. 分享封面：`meta.image`

微信收藏、QQ、Twitter 等平台拼链接卡片时用的大图。

```json
"meta": {
  "title": "叶初小游戏",
  "description": "叶初小游戏 —— 绿茵足球、桌上足球、点球大师、CS 平面战场、星海突击、方块风暴、叶初的鱼塘、CS 观战等小游戏合集",
  "siteName": "叶初小游戏",
  "image": "assets/share-square.png",
  "imageAlt": "叶初小游戏 · 封面"
}
```

站点地址取 `site.pagesUrl`（`meta.url` 也可以，写了就用它）。脚本会自动：

1. 用站点地址把 `meta.image` 拼成**绝对地址**（微信不认相对路径）；
2. 读 PNG 文件头拿到真实宽高，写进 `og:image:width/height`（换图不用改数字）；
3. 方图自动配 `twitter:card=summary`，宽图自动切 `summary_large_image`（当前是 500×500 方图 → `summary`）；
4. 站点地址不是完整 `http(s)` 地址时**干脆不输出** `og:image`，免得塞一个抓不到的错误地址。

**为什么用方图**：微信收藏/分享的缩略图按正方形裁，1200×630 那种宽图会被切掉两边。
当前封面是 `assets/share-square.png`（500×500 方图），怎么裁都不会切到内容；
想要更清晰就换成 **800×800** 方图（内容四周留白 ≥120px），覆盖同名文件即可，JSON 都不用改。

**想让 Twitter 显示大横卡**：把 `meta.image` 改成 `assets/cover.png`（现有的 1200×630 宽图），
脚本会自动把 `twitter:card` 切成 `summary_large_image` —— 但微信那边会被裁掉两边，自己权衡。

> 老的单尺寸 `assets/favicon.png`、`favicon-old.png`、`apple-touch-icon-old.png` 已经不再被引用，
> 确认没别处用就可以删掉。

---

## 3. 标题与描述：`meta.title` / `meta.description`

`index.html` 的 `<title>` 和 `<meta name="description">` 也是这段生成的，内容来自 `meta`。
**改标题只改 `games.json`**，别去 `index.html` 里手改（会被下次同步覆盖）。

侧栏顶部那个「叶初小游戏」是页面内的 `.brand-name`，和这里无关，改它要动 `index.html` 的 body。

---

## 4. 改完怎么生效

```powershell
.\tools\sync.cmd                 # 双击也行；或 node tools/export-games.js
node tools/export-games.js --check   # 只检查，不写文件
```

同步脚本会校验：

- 引用的文件**是否真的存在**；
- `.ico` 是不是**真的 ICO**（不是改了扩展名的 PNG）；里面少了 16/32/48 会提醒；
- PNG 的 `sizes` 和图片**实际尺寸**是否一致（不一致会按实际值输出并提醒）；不是正方形会提醒；
- 有没有漏掉 `.ico`（会直接提醒「Bing 会退回托管域名图标」）、漏掉 `appleTouch`；
- 是否还在用旧的 `favicon` / `appleTouchIcon` 顶层字段（已合并进 `icons`，会报错提示迁移）；
- `icons` / `meta` 里有没有拼错的字段名（多出来的字段会提醒）。

`index.html` 里被重写的就是这一段：

```html
<!-- head:start … -->
…图标 / 标题 / 分享卡片…
<!-- head:end -->
```

---

## 5. 让搜索引擎更新图标

改完、推上去之后，Bing/Google 还不会立刻变，它们有自己的缓存。

1. **确认线上文件真的存在**：直接访问 `https://vilotime.github.io/favicon.ico`，
   应该能看到图标（不是 404）。这是最关键的一步。
2. **Bing Webmaster Tools** → 添加站点 → 「URL 提交」把首页重新提交一遍，
   或用「站点资源管理器」里的抓取工具看它拿到的 `<link rel="icon">`。
3. **Google Search Console** → 「网址检查」→ 请求重新编入索引。
4. 搜索引擎的图标缓存可能要**几天到几周**才刷新，这点急不来。

另外，如果你在 Bing 里搜 `site:vilotime.github.io` 只看到很少的结果，
说明站点收录本身还不全，可以在 Webmaster Tools 里提交一个 `sitemap.xml`（目前还没有，需要的话可以生成）。

---

## 6. 自检清单

改完图标后挨个确认：

- [ ] `https://vilotime.github.io/favicon.ico` 能直接下载，且是图标（不是 404、不是 HTML）
- [ ] 浏览器标签页图标正常（`Ctrl + Shift + R` 强刷后再看）
- [ ] `node tools/export-games.js --check` 输出 `✓ 卡片 / 侧栏 / 数量 / 图标都已和 games.json 一致`
- [ ] `index.html` 的 head 里有 `.ico`、`.svg`、多个 `.png` 的 `<link rel="icon">`
- [ ] 微信里分享/收藏，标题是「叶初小游戏」、封面是方形图
- [ ] Bing 的 `site:` 搜索里小图标换过来了（可能有延迟）

---

## 7. 常见问题

**Q：只给 SVG 不够吗？**
对浏览器够，对搜索引擎不够。Bing 明确不支持 SVG favicon，且很多爬虫只请求根目录的 `/favicon.ico`。

**Q：`favicon.ico` 为什么放根目录，不放到 `assets/`？**
放根目录是 `https://域名/favicon.ico` 能直接命中，这是爬虫和浏览器默认会尝试的路径，
最省事也最保险。放子目录就必须依赖 `<link>` 被正确解析。

**Q：图标和分享封面可以共用一张图吗？**
技术上可以，但不建议：封面是给人看的方图，缩到 16px 会糊成一团；图标应该是简洁的符号（现在是渐变底 + 播放三角）。
`tools\make-icons.ps1 -Design photo -Source <图>` 可以用现成图生成图标，但小尺寸下观感一般。

**Q：改完图标，微信收藏里的封面也变了吗？**
不会。图标（`icons`）和封面（`meta.image`）是两套东西，互不影响。

**Q：`proF/` 下那些游戏页要不要也加图标标签？**
不用。它们都是在 `index.html` 的 iframe 里打开的，浏览器用的是外层页面的图标。
