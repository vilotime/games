# 叶初小游戏 · UI 库（yc-ui）

一套轻量的 Canvas 游戏外壳样式 + 少量交互脚本，给「叶初小游戏」系列项目复用。
不依赖任何框架，纯 HTML/CSS/JS，直接 `file://` 打开也能跑。
**整个目录可以原样复制到别的项目**，不依赖本站的目录结构。

```
ui/
├─ yc-ui.css      统一视觉样式（布局 / HUD / 弹窗 / 按钮 / 手机适配）
├─ yc-ui.js       统一交互脚本（设备判断、仅电脑游戏在手机上隐藏 HUD）
├─ example.html   最小示例，直接双击打开即可看效果
└─ README.md      本文件
```

> 游戏清单 `games.json`、清单渲染器 `core/games.js`、校验脚本 `tools/export-games.js` 属于本站的
> 主页逻辑，不在这个包里 —— 见仓库根 `README.md`。

## 快速开始

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>我的小游戏</title>
  <link rel="stylesheet" href="./yc-ui.css">
</head>
<body>
  <div id="wrap">
    <div id="stage">
      <canvas id="cv"></canvas>

      <div id="hud">
        <div class="chip">分数 <b id="score">0</b></div>
        <div class="chip" id="clock">00:00</div>
      </div>

      <div id="banner"></div>
      <div id="hint">提示文字</div>

      <div class="overlay" id="intro">
        <div class="panel">
          <h1>游戏名</h1>
          <p>一句话玩法说明。<kbd>WASD</kbd> 移动，<kbd>空格</kbd> 开火。</p>
          <button class="btn" id="startBtn" type="button">开始游戏</button>
        </div>
      </div>

      <div class="overlay hidden" id="over">
        <div class="panel">
          <h1 id="overTitle">游戏结束</h1>
          <p id="overStats"></p>
          <button class="btn" id="retryBtn" type="button">再来一局</button>
        </div>
      </div>
    </div>
  </div>

  <script src="./yc-ui.js"></script>
  <script>
    /* 你的游戏逻辑；画布尺寸参考 example.html 里的 resize() */
  </script>
</body>
</html>
```

## 结构约定

| 选择器 | 作用 | 必需 |
|---|---|---|
| `#wrap` | 全屏居中容器（`position: fixed; inset: 0`） | 是 |
| `#stage` | 画布容器，圆角/投影落在它和 canvas 上；`overflow: hidden` 防 HUD 溢出 | 是 |
| `canvas` | 默认 `display: block; border-radius: 14px` | 是 |
| `#hud` | 顶部细条，内部用 `.chip` 横向排布 | 否 |
| `.chip` | 顶部信息胶囊；`b` 高亮数字；`.dot` 小圆点（可加内联 `background`） | 否 |
| `#banner` | 屏幕中部的临时大字提示（加 `.show` 显示） | 否 |
| `#hint` | 底部一行小字提示 | 否 |
| `.overlay` | 覆盖整块画布的弹窗层，加 `.hidden` 隐藏 | 否 |
| `.panel` | 弹窗内容面板；`h1/p/kbd/.btn` 有统一样式 | 否 |
| `.btn` / `.btn.ghost` | 主按钮 / 次级按钮 | 否 |
| `.overlay.blood` | 血红色结算（用于特殊死亡画面），需自己加类 | 否 |

游戏内绘制请在**世界坐标**里画，`#stage` 的尺寸由你按画布尺寸设置（见 `example.html`）。

## 交互脚本 `yc-ui.js`

```html
<script src="./yc-ui.js"></script>
```

- 自动判断手机 / 平板（UA、`pointer: coarse`、触控点、UA-CH），暴露 `window.YCUI.isMobile()`；
- 若 `<body data-pc-only="1">` 且当前是手机 / 平板，会隐藏 `#hud`、`#hint`、`#banner`
  （配合各游戏自己的「只能在电脑上玩」拦截页使用）；
- 不含全屏 / 横竖屏逻辑（本项目已移除全屏按钮）。

## 手机适配（CSS 已内置）

- `@media (max-width: 760px), (max-height: 620px)`：面板、字号、`kbd`、按钮整体压紧，
  `.panel` 加 `max-height: 100%; overflow: auto`，保证开场说明不会超出画布；
- `@media (max-width: 560px)`：HUD 字号缩小，`.chip` 收窄，关闭毛玻璃（部分机型
  `backdrop-filter` 会在图标下糊出阴影），`.dot` 缩到 7px；`#hint` 允许换行。

## 画布自适应（参考 example.html）

```js
function resize() {
  var pad = 20;
  var s = Math.min((window.innerWidth - pad) / W, (window.innerHeight - pad) / H);
  var dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(W * s * dpr);
  cv.height = Math.round(H * s * dpr);
  cv.style.width = Math.round(W * s) + 'px';
  cv.style.height = Math.round(H * s) + 'px';
  ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
```

## 许可

项目内部复用即可，没有额外依赖。
