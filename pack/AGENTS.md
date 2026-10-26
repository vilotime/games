# AGENTS.md · 单游戏开发约定（给 AI 读者）

> 你在一个**单游戏制作包**里工作。包里的全部内容：
>
> ```
> .
> ├─ AGENTS.md      ← 本文件
> ├─ GAME-INFO.txt  ← ★ 你要填的表单（第 15 节）
> ├─ proF/
> │  └─ example.html  ← ★ 你的游戏就写在这里
> └─ ui/
>    ├─ yc-ui.css     ← 统一样式，只读，别改
>    ├─ yc-ui.js      ← 设备判断，只读，别改
>    └─ README.md     ← UI 库说明
> ```
>
> 目标：把 `proF/example.html` 改写成**一个完整的单文件 Canvas 游戏**，填好 `GAME-INFO.txt`，
> 然后把整个包压回压缩包交还站方（叶初小游戏）。
> 没有构建步骤、没有 npm、没有框架、没有测试框架；双击这个 HTML 就能玩。
>
> **重要：站方看不到你的聊天回复。** 你回复里写了什么对方都不会收到 ——
> 一切交付信息（游戏名、图标、介绍、颜色、移动端策略）都必须写在 `GAME-INFO.txt` 里。

---

## 1. 你的交付物

| 交付 | 说明 |
|---|---|
| `proF/example.html` | 就在原文件里改。**不要新增文件、不要新增目录** |
| `GAME-INFO.txt` | 把 8 项填好（第 15 节给了解释）。站方靠这个文件注册你的游戏 |
| 整个包重新压缩 | 最终交回的是**这个压缩包**，不是一个链接、也不是一段文字 |

站方拿到后会：把 `proF/` 里那一个 HTML 放进站点的 `proF/` 目录 → 按 `GAME-INFO.txt` 在主页清单里加一行 → 立刻上线。
所以你**不需要**、也**不应该**创建主页、清单文件、构建脚本或任何其它文件。

**唯一例外**：如果你想让站方看到效果，可以把截图**放在包根目录**并起名 `预览.png`（可选，其它图片一律不要加）。

---

## 2. 硬约束（违反即打回）

1. **必须用 Canvas 2D 渲染，游戏画面一律画在 `#stage > canvas#cv` 上**：
   - 背景、实体、粒子、弹道、文字、准星、屏幕震动/闪白，全部用 `cv.getContext('2d')` 绘制
     （`getContext('2d')` 必须带 `'2d'` 参数，无参调用返回 `null`）；
   - **禁止**用 DOM / CSS / SVG / WebGL 直接当游戏对象：不许拿 `<div>` 摆精灵、不许用 CSS
     `transition` / `animation` 做游戏动效、不许用绝对定位的 DOM 元素当碰撞体；
   - **禁止**任何渲染库或游戏引擎：Phaser、PixiJS、Three.js、matter.js、Konva 之类一律不许；
   - DOM 只允许当 **UI 外壳**：`#hud`（`.chip`）、`#banner`、`#hint`、`.overlay`（`.panel`、`.btn`）。
     换句话说：**canvas = 游戏画面，DOM = 界面外壳**，两边不要互相抢活。
2. **只改 `proF/example.html` 一个文件**：HTML + CSS + JS 全写在这一个 `.html` 里。
   不许拆出 `.js` / `.css` / 图片 / 字体 / 子目录。
3. **零外部资源**：不许 CDN、外链图片、外链字体、外部库。画面全部用 canvas 画，或 base64 内联。
4. **只引这两行**（相对路径固定，别改成别的层级）：

   ```html
   <link rel="stylesheet" href="../ui/yc-ui.css">
   <script src="../ui/yc-ui.js"></script>
   ```

   这份文件将来会被原样放进站点的 `proF/` 目录，`../ui/` 正好指回同一套 UI 库 ——
   所以**不要**把 `ui/` 复制到别处，也不要改成 `./yc-ui.css`。
5. **不改 `ui/yc-ui.css`、`ui/yc-ui.js`**。本游戏专属的微调写在自己页面 `<style>` 里覆盖，
   并用 ID 提权保证生效：

   ```css
   /* 例：给自己的状态标签在手机上压小 */
   #ctlTag { font-size: 10px; padding: 2px 8px; }
   ```

6. **不加全屏按钮、不做横竖屏切换**：这个项目已经彻底移除全屏逻辑。
7. **不加暂停按钮**：需要暂停就用 `Esc` 键，或者干脆不提供。
8. **文案极简**：短句、无废话、不堆 emoji。不写欢迎语、不写说明书式长段落。
9. **ES5 语法**：`var` / `function` / IIFE / `'use strict'`。不用箭头函数、`let`/`const`、
   模板字符串、可选链 —— 与站点现有游戏保持同一风格。
10. **`<title>` 就是游戏显示名**，原样出现在主页卡片和侧栏上。写好后就别再改。

---

## 3. 页面骨架（现在 `proF/example.html` 里就是这个，可直接改）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>显示名</title>
<link rel="stylesheet" href="../ui/yc-ui.css">
<style>
  /* 只放本游戏专属的微调 */
</style>
</head>
<body>                                <!-- 仅电脑游戏写成 <body data-pc-only="1"> -->
<div id="wrap">
  <div id="stage">
    <canvas id="cv"></canvas>

    <div id="hud">
      <div class="chip">分数 <b id="score">0</b></div>
      <div class="chip" id="clock">01:00</div>
    </div>

    <div id="banner"></div>
    <div id="hint"></div>

    <div class="overlay" id="intro">
      <div class="panel">
        <h1>显示名</h1>
        <p>一句话玩法。</p>
        <button class="btn" id="startBtn" type="button">开始游戏</button>
      </div>
    </div>

    <div class="overlay hidden" id="over">
      <div class="panel">
        <h1>游戏结束</h1>
        <p id="overStats"></p>
        <button class="btn" id="retryBtn" type="button">再来一局</button>
      </div>
    </div>
  </div>
</div>

<script src="../ui/yc-ui.js"></script>
<script>
(function () {
  'use strict';
  /* 全部游戏逻辑 */
})();
</script>
</body>
</html>
```

**整页只有 `#cv` 这一个可见 canvas**：不要往 `#stage` 里再塞第二个 canvas，也不要用多个 canvas 叠层拼游戏。
需要缓存静态底纹时才建离屏画布（`document.createElement('canvas')`，不插入 DOM），用完 `drawImage` 贴回 `#cv`。

---

## 4. 选择器契约（样式全部由 `yc-ui.css` 提供，你只写 HTML）

| 选择器 | 作用 | 必需 |
|---|---|---|
| `#wrap` → `#stage` → `canvas` | 居中容器 / 画布舞台 / 画布 | 是 |
| `#hud` 内 `.chip` | 顶部信息胶囊；`<b>` 高亮数字；`.dot` 是内联 `background` 的小圆点 | 否 |
| `#banner` | 屏幕中部的临时大字，加 `.show` 显示 | 否 |
| `#hint` | 底部一行小字提示 | 否 |
| `.overlay` + `.panel` | 覆盖整块画布的弹层，加 `.hidden` 隐藏 | 否 |
| `.btn` / `.btn.ghost` | 主按钮 / 次级按钮 | 否 |

`#stage` 的 `overflow: hidden` 负责防止 HUD 溢出画布，**不要覆盖**。
`yc-ui.css` 已内置小屏压缩（`@media (max-width: 760px), (max-height: 620px)`），你只补自己的特例。

**分工再强调一次**：`canvas` = 游戏画面（玩家、敌人、子弹、地图、粒子、游戏内文字），
DOM（`#hud` / `#banner` / `#hint` / `.overlay` / `.panel` / `.btn`）= 界面外壳。
**不要把游戏对象做成 DOM 元素**，**也不要把 HUD 里的分数、按钮画到 canvas 上** ——
需要显示分数就用 `#hud` 里的 `<b>` 更新 `textContent`。

---

## 5. 画布与坐标系

### 5.1 基本设置（照抄）

```js
var W = 900, H = 560;                              /* 逻辑尺寸（世界坐标） */
var cv = document.getElementById('cv');
var ctx = cv.getContext('2d');
var st = document.getElementById('stage');
var UNIT = 1;                                       /* canvas 物理像素 / 世界像素 */

function resize() {
  var s = Math.min((window.innerWidth - 24) / W, (window.innerHeight - 24) / H);
  s = Math.max(0.4, s);                             /* 小屏也不小于 0.4，避免糊成一团 */
  var dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(W * s * dpr);               /* 物理像素 */
  cv.height = Math.round(H * s * dpr);
  cv.style.width = Math.round(W * s) + 'px';        /* CSS 像素 */
  cv.style.height = Math.round(H * s) + 'px';
  st.style.width = cv.style.width;                  /* #stage 跟画布同尺寸，HUD 才对得齐 */
  st.style.height = cv.style.height;
  UNIT = s * dpr;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
resize();
```

**所有绘制与物理都用世界坐标（`W × H`）**，不要混用 CSS 像素。横版常用 `900×560`、`960×600`；
竖版玩法自己选比例（如 `420×720`）。

### 5.2 两种画法，按需要选

**A. 屏幕坐标直接画**（弹幕、消除类）

```js
ctx.setTransform(UNIT, 0, 0, UNIT, 0, 0);   /* 每帧开头设一次，之后按世界坐标画 */
```

**B. 俯视 + 相机 + Y 轴翻转**（俯视射击、球场类）

```js
ctx.setTransform(1, 0, 0, 1, 0, 0);                                   /* 先复位，清屏用物理像素 */
ctx.setTransform(UNIT, 0, 0, -UNIT,
                 cv.width / 2 + camX * UNIT, cv.height / 2 + camY * UNIT);
/* ……画世界…… */
ctx.setTransform(UNIT, 0, 0, UNIT, 0, 0);                              /* 画完复位，否则后续 UI 会跟着翻转 */
```

`-UNIT` 让世界 Y 向上为正（数学坐标系），`camX` / `camY` 是相机中心的世界坐标。

### 5.3 指针坐标换算（鼠标 / 触摸都必须做）

```js
function toWorld(clientX, clientY) {
  var r = cv.getBoundingClientRect();
  return { x: (clientX - r.left) / (r.width / W), y: (clientY - r.top) / (r.height / H) };
}
```

用 5.2-B 的相机时，再按相机偏移反算一次。

---

## 6. 主循环与时间

```js
var last = 0;

function tick(ts) {
  var now = ts / 1000;
  if (!last) { last = now; }
  var dt = Math.min(0.05, Math.max(0, now - last));   /* 钳制：切标签页回来不跳帧 */
  last = now;
  if (state === 'playing') { update(dt); }
  draw();
}
function loop(ts) { tick(ts); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
```

- 命名统一：`update(dt)` 更新、`draw()` 绘制、`tick(ts)` 每帧入口、`loop(ts)` 调度。
- 单帧 `dt` 上限 `0.05`（≈20fps 兜底）；所有速度用"每秒"为单位（`x += vx * dt`）。
- **不要用 `Date.now()` 算 dt**，用 rAF 传进来的 `ts`。
- 需要确定性模拟（AI 多、物理敏感）时改固定步长：

  ```js
  var TICK = 1 / 120, acc = 0;
  acc += dt;
  var guard = 0;
  while (acc >= TICK && guard++ < 8) { stepGame(TICK); acc -= TICK; }   /* guard 防追帧雪崩 */
  ```

  多阶段推进时按固定顺序调用，例如：玩家 → AI → 武器 → 弹道 → 拾取 → 传送门。
- 切标签页回来会瞬移，就在恢复时重置 `last`：

  ```js
  document.addEventListener('visibilitychange', function () { last = 0; });
  ```

---

## 7. 状态机

```js
var state = 'intro';     /* intro | playing | over（可选 paused） */
```

- `intro`：只显示 `#intro` 弹层，不更新逻辑；`Enter` / `空格` / 点按钮都能开始。
- `playing`：跑 `update(dt)`，HUD 实时刷新。
- `over`：停更新，显示 `#over` 弹层，成绩写进 `#overStats`。
- **重开必须完整重置**：所有实体数组 `length = 0`、计时器、分数、`last`、粒子/闪光强度全部清空，
  `.hidden` 状态切回来。漏一个就会出现"第二局残影 / 负计时"。

---

## 8. 输入

```js
var keys = Object.create(null);

window.addEventListener('keydown', function (e) {
  var k = (e.key || '').toLowerCase();                 /* 统一小写，别用 keyCode */
  keys[k] = true;
  if (k === 'w' || k === 'a' || k === 's' || k === 'd' || k === ' ' ||
      k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright') {
    e.preventDefault();
  }
  if (k === 'enter' && state === 'intro') { start(); }
});
window.addEventListener('keyup', function (e) {
  keys[(e.key || '').toLowerCase()] = false;
});
/* 失焦必须清空，否则切回来会一直往一个方向跑 */
window.addEventListener('blur', function () { keys = Object.create(null); });
```

- 方向键 / 空格会滚动页面，必须 `preventDefault()`。
- 鼠标：`mousemove` 换算世界坐标；`mousedown` / `mouseup` 控制持续动作；可 `contextmenu` 关掉右键菜单。
- 触摸：`touchstart` / `touchmove` 必须 `{ passive: false }` + `e.preventDefault()`，否则页面会跟着滑。
- 键盘 + 触摸并存时，触摸要临时接管控制目标（例如 `var touchTarget = null;`，抬起时清空），
  失焦时把它和 `firing` 之类"按住态"一起清掉。

---

## 9. 实体、碰撞与 AI

```js
var bullets = [], enemies = [], particles = [];   /* 同类实体放一个数组 */
```

- 删除用**反向遍历**：`for (var i = arr.length - 1; i >= 0; i--) { if (arr[i].dead) { arr.splice(i, 1); } }`。
- 粒子和子弹给**上限**（`if (particles.length > 220) { return; }`）或对象池，避免每帧 `new` 造成卡顿。
- 碰撞：圆-圆用 `dx*dx + dy*dy < (r1+r2)*(r1+r2)`（不开方），矩形用 AABB。不要引物理引擎。
- AI 用"小状态机 + 性格参数"，别写成一堆 if：

  ```js
  var BOT_STYLES = [
    { key: 'chaser',  speed: 120, detect: 220, aggro: 1.0 },
    { key: 'camper',  speed: 90,  detect: 140, aggro: 0.5 },
    { key: 'careful', speed: 105, detect: 180, aggro: 0.7 }
  ];
  ```

- 需要绕障碍时用网格 BFS（把地图切成格子，BFS 出下一步方向），不要写复杂寻路。
- 观战类玩法（AI 对 AI）就把玩家输入整段去掉，保持"同一份模拟 + 不同控制器"。
- 网格类玩法（消除 / 棋类）：`var COLS = 10, ROWS = 20, CELL = 24;`，世界坐标 = 网格坐标 × `CELL`。

---

## 10. 绘制

- 每帧先铺背景（深底渐变 + 网格/星点），别留上一帧残影（除非刻意做拖影）。
- 顺序：背景 → 地图/地面 → 实体（远到近）→ 粒子/弹道 → 屏幕特效（闪白、红屏、震动）。
  HUD 是 DOM，别在 canvas 里重复画。
- 屏幕震动：给相机加衰减偏移 `shake *= 0.9;`，只作用于世界图层。
- `ctx.shadowBlur` 很贵，只给少数元素用，用完立刻 `ctx.shadowBlur = 0`。
- 文字用 `ctx.font` 固定 px（世界坐标下的字号），不要依赖 `clamp()`。
- 静态元素（棋盘底纹、星图）画到离屏 canvas 缓存一次，每帧只 `drawImage`。

---

## 11. 视觉一致性（和站点其它游戏保持一致）

| 项 | 取值 |
|---|---|
| 底色 | 页面 `body` 已是径向渐变 `#16243a → #080b12`；画布内部自己铺深底（`#0b1220` / `#070b14`） |
| 主色 | `#4f9cf9` 蓝；高亮 `#ffd166` 金；正文 `#e9f1fb`，次要文字 `#a7bbd8` |
| 危险 / 失败 | `#ff5d5d` 红 |
| 形状 | 画布与 `.overlay` 的 14px 圆角由 CSS 提供；实体用圆或圆角矩形 |
| 字体 | 继承页面字体；canvas 里写 `ctx.font = '700 16px "PingFang SC", "Microsoft YaHei", sans-serif'` |
| 按钮 | 一律用 `.btn` / `.btn.ghost`，不要自己画按钮 |
| 瞬时提示 | `#banner` + `.show`，几秒后移除，实现见下 |

```js
var elBanner = document.getElementById('banner'), bannerT = 0;

function banner(text, ms) {
  elBanner.textContent = text;
  elBanner.classList.add('show');
  bannerT = (ms || 1000) / 1000;
}
/* 在 update(dt) 里倒计时，到点移除类名 */
if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) { elBanner.classList.remove('show'); } }
```

需要整屏血红结算（死亡特写之类），就在页面 `<style>` 里自己加：

```css
.overlay.blood { background: rgba(96, 0, 10, .88); }
.overlay.blood .panel h1 { color: #ffd2d2; text-shadow: 0 0 18px rgba(255, 40, 40, .75); }
.overlay.blood .panel p { color: #f0b9b9; }
.overlay.blood .btn { background: linear-gradient(135deg, #a11426, #e0313f); box-shadow: 0 8px 22px rgba(200, 30, 50, .5); }
```

```js
document.getElementById('over').classList.add('blood');     /* 需要时加，正常结束时 remove */
```

---

## 12. 移动端：三选一，必须明确选一个

### A. 手机可玩（触屏操控）

- 判定触屏后接管操控；不要依赖 `hover`。
- 页面内加 `@media (hover: none)` 分支清掉 hover 位移/发光。
- 小屏压缩交给 `yc-ui.css`，页面只补自己的特例。

### B. 手机只能观战

```js
if (isTouchOnlyDevice()) {
  banner('没有键盘：手机 / 平板只能观战', 1500);
  /* 关掉玩家操控，但模拟继续跑 */
}
```

### C. 只能在电脑上玩（键盘 / 鼠标必需）

1. `<body data-pc-only="1">` —— 只负责在手机上隐藏 `#hud` / `#hint` / `#banner`；
2. 拦截面板自己写在页面里（**不要放"返回主页"按钮**，这个包里没有主页）：

```html
<div class="overlay hidden" id="mobile">
  <div class="panel">
    <h1>这个游戏只能在电脑上玩</h1>
    <p>「显示名」需要键盘 / 鼠标，手机 / 平板上没法正常操作。</p>
    <p>请用电脑打开本页面。</p>
  </div>
</div>
```

```js
function isTouchOnlyDevice() {
  try {
    var tp = navigator.maxTouchPoints || 0;
    var ua = navigator.userAgent || '';
    var mobileUA = /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle/i.test(ua);
    if (window.matchMedia) {
      if (window.matchMedia('(pointer: coarse)').matches &&
          window.matchMedia('(hover: none)').matches) { return true; }
      if (mobileUA) { return true; }
    }
    return mobileUA || (tp > 0 && window.matchMedia && !window.matchMedia('(any-pointer: fine)').matches);
  } catch (e) { return false; }
}

if (isTouchOnlyDevice()) {
  document.getElementById('mobile').classList.remove('hidden');
  /* 不启动主循环 */
} else {
  requestAnimationFrame(loop);
}
```

3. 在 `GAME-INFO.txt` 的第 5 项写「是」。

---

## 13. 自检清单（交回前逐条过）

- [ ] 双击 `proF/example.html` 能玩，控制台无报错
- [ ] 窗口拉伸 / 手机旋转后画布不糊、HUD 不溢出、鼠标点击位置准确
- [ ] `intro → playing → over → 重开` 走一遍，没有残影 / 负计时 / 卡死
- [ ] **画面确实全在 canvas 上**：浏览器里禁用 JavaScript 后 canvas 区域是空白，页面 DOM 里除了
      `#hud` / `#banner` / `#hint` / `.overlay` 这些 UI 外壳，没有任何游戏对象节点；控制台没有
      `getContext` 报错；整个页面只有一个可见 canvas
- [ ] 切标签页回来不瞬移、不粘键
- [ ] 移动端策略三选一已实现（可玩 / 只能观战 / 拦截面板）
- [ ] 没有全屏按钮、没有暂停按钮、没有外部资源，没改 `ui/yc-ui.*`
- [ ] 包里只多了一个改好的游戏 HTML，没有多出其它文件或目录
- [ ] `GAME-INFO.txt` 的 8 项全部填写，显示名与 `<title>` 一致，颜色是 hex
- [ ] `<title>` 就是打算显示的正式名字
- [ ] 用无头浏览器真机加载过一次（下面命令），输出里没有 `Uncaught` 之类的报错

```powershell
# 把 <包目录> 换成你解压出来的实际路径
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
Start-Process -FilePath $edge -ArgumentList @(
  '--headless=new','--disable-gpu','--no-sandbox',
  '--enable-logging=stderr','--log-level=0','--virtual-time-budget=8000','--dump-dom',
  'file:///<包目录>/proF/example.html'
) -NoNewWindow -Wait -RedirectStandardOutput out.txt -RedirectStandardError err.txt
# err.txt 里搜 CONSOLE（排除 chrome-extension）应当为空；临时文件记得删掉
```

---

## 14. 反模式（最容易犯的）

| 别做 | 原因 |
|---|---|
| 新增文件 / 目录（拆 js、css、图片、`assets/`） | 交付只认 `proF/example.html` 一个文件，站方直接复制它 |
| 把 `ui/` 复制到别处，或改成本地引用 `./yc-ui.css` | 这份文件会被原样放进站点 `proF/`，`../ui/` 才是同一套库 |
| 改 `ui/yc-ui.css` / `ui/yc-ui.js` | 只读文件，会波及站上所有其它游戏 |
| 加全屏按钮 / 横竖屏切换 | 整个项目已移除，加了必被打回 |
| 加暂停按钮 | 站方明确不要暂停按钮，需要暂停用 `Esc` |
| 引 CDN / 外链图片 / 字体 / 任何库 | 站点是纯静态零依赖，多一个请求就多一个坏点 |
| 用 `<div>` / CSS 摆游戏对象，或用 `transition` / `animation` 做游戏动效 | 游戏画面必须画在 `#stage > canvas#cv` 上，DOM 只当 UI 外壳 |
| 上 WebGL、Three.js、Phaser、PixiJS、matter.js、Konva | 项目只允许 Canvas 2D + 原生 JS，没有任何引擎 |
| 往 `#stage` 里加第二个可见 canvas，或多个 canvas 叠层拼游戏 | 整页只有一个 `canvas#cv`；离屏缓存用 `document.createElement('canvas')`，不插入 DOM |
| 覆盖 `#stage` 的 `overflow` | HUD 会溢出画布 |
| CSS 像素做物理、世界坐标做 DOM | 两套坐标混用必然错位 |
| 重开不重置数组 / 计时器 | 第二局残影、负计时 |
| 用 `Date.now()` 算 dt | 与 rAF 时间基准不一致，会抖 |
| 空格 / 方向键不 `preventDefault()` | 页面会跟着滚 |
| 触摸不加 `{passive:false}` | 手机上页面跟着滑 |
| 每帧 `new` 大量对象、粒子无上限 | 掉帧 |
| 引用 `proF/` 里其它游戏当参考 | 包里没有别的游戏，只有 `proF/example.html` 和 `ui/` |
| 把游戏名 / 图标 / 介绍 / 颜色写在聊天回复里 | 站方看不到你的回复，只会收到压缩包；这类信息必须写进 `GAME-INFO.txt` |
| 把 `GAME-INFO.txt` 删掉或改名 | 站方靠它注册游戏，缺了就要退回重做 |

---

## 15. 交付：填好 `GAME-INFO.txt`，然后重新压缩

站方**只收到压缩包**，看不到你聊了什么。所以一切信息都要落在文件里 ——
游戏本身在 `proF/example.html`，注册信息在 `GAME-INFO.txt`。

`GAME-INFO.txt` 只需填 8 项，每项写在标题下面那一行（原有的示例值直接覆盖）：

| 项 | 填什么 |
|---|---|
| 1 游戏文件名 | `proF/` 下那个 HTML 的文件名；没改名就是 `example.html`，改过就写新名字 |
| 2 显示名 | 必须与页面 `<title>` 完全一致 |
| 3 图标 | 一个 emoji，用于主页卡片和侧栏 |
| 4 一句话介绍 | 主页卡片副标题，不超过两行 |
| 5 是否只能在电脑上玩 | 填「是」或「否」；第 12 节 C 的情况填「是」 |
| 6 封面主色 | hex 颜色，亮且饱和的那个 |
| 7 封面副色 | hex 颜色，同色相压暗一档（亮度约主色的 45%~55%） |
| 8 移动端策略 | 三选一：手机可玩 / 手机只能观战 / 仅电脑拦截 |

填完自检：

- 文件仍是 UTF-8 编码，中文没变成乱码
- 8 项都不留空，没有残留示例文字
- 第 2 项与页面 `<title>` 一字不差
- 第 6、7 项都是 `#` 开头的 hex（可写 3 位或 6 位）

最后：把**整个包**（含改好的 `proF/example.html` 和填好的 `GAME-INFO.txt`）重新压成一个压缩包发回。
站方会照这个文件在主页清单里加一行，并把 `proF/` 下那个 HTML 复制进站点 —— 你不用碰任何清单文件。
