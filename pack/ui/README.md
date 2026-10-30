# 叶初小游戏 · UI 库（yc-ui）

一套轻量的 Canvas 游戏外壳样式 + 少量交互脚本，给「叶初小游戏」系列项目复用。
不依赖任何框架，纯 HTML/CSS/JS，直接 `file://` 打开也能跑，**没有除本目录之外的任何引用**。

```
ui/
├─ yc-ui.css     统一视觉样式（布局 / HUD / 弹窗 / 按钮 / 手机适配）
├─ yc-ui.js      统一交互脚本（设备判断、仅电脑游戏在手机上隐藏 HUD）
└─ README.md     本文件
```

可运行示例在上一级：`../proF/example.html`（那就是要交付的游戏文件）。

## 快速开始

游戏页面放在 `proF/` 下，只引这两行：

```html
<link rel="stylesheet" href="../ui/yc-ui.css">
<script src="../ui/yc-ui.js"></script>
```

页面骨架、画布自适应、状态机、输入、移动端策略的完整写法，直接看 `../proF/example.html`，
或读上一级的 `AGENTS.md`。

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
| `.panel` | 弹窗内容面板；`h1` / `p` / `kbd` / `.btn` 有统一样式 | 否 |
| `.btn` / `.btn.ghost` | 主按钮 / 次级按钮 | 否 |

游戏内绘制用**世界坐标**，`#stage` 的尺寸由你按画布尺寸设置（见 `../proF/example.html`）。

## 交互脚本 `yc-ui.js`

```html
<script src="../ui/yc-ui.js"></script>
```

- 自动判断手机 / 平板（UA、`pointer: coarse`、触控点、UA-CH），暴露 `window.YCUI.isMobile()`；
- 若 `<body data-pc-only="1">` 且当前是手机 / 平板，会隐藏 `#hud`、`#hint`、`#banner`
  （配合页面自己的「只能在电脑上玩」拦截面板使用，面板要自己写）；
- 不含全屏 / 横竖屏逻辑（本项目已移除全屏按钮）。

## 手机适配（CSS 已内置）

- `@media (max-width: 760px), (max-height: 620px)`：面板、字号、`kbd`、按钮整体压紧，
  `.panel` 加 `max-height: 100%; overflow: auto`，保证开场说明不会超出画布；
- `@media (max-width: 560px)`：HUD 字号缩小，`.chip` 收窄，关闭毛玻璃（部分机型
  `backdrop-filter` 会在图标下糊出阴影），`.dot` 缩到 7px；`#hint` 允许换行。

## 画布自适应（照抄即可）

```js
function resize() {
  /* 可用区域 = 视口减去 #wrap 的内边距（本文件里 padding:10px，两侧共 20px） */
  var availW = Math.max(160, window.innerWidth - 20);
  var availH = Math.max(160, window.innerHeight - 20);
  var s = Math.min(availW / W, availH / H);
  var dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(W * s * dpr);
  cv.height = Math.round(H * s * dpr);
  cv.style.width = Math.min(availW, Math.round(W * s)) + 'px';
  cv.style.height = Math.min(availH, Math.round(H * s)) + 'px';
  st.style.width = cv.style.width;
  st.style.height = cv.style.height;
  UNIT = s * dpr;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
```

> 别给缩放加下限（`s = Math.max(0.4, s)`）。窄屏上会把画布顶得比容器宽，
> `#stage` 是 flex item 会被压扁，画布右侧被 `overflow: hidden` 以方角裁掉，
> `.overlay` 的圆角就盖不住右上 / 右下两个角。

## 许可

项目内部复用即可，没有额外依赖。
