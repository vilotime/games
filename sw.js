/* 叶初小游戏 · Service Worker
 * ------------------------------------------------------------
 * 它只干一件事：让浏览器认可「这个站点可以安装成应用」。
 *
 * 为什么需要它：Chrome / Edge 判定「可安装」的条件是「manifest 合格（name、192/512 图标、
 * start_url、display: standalone）+ 注册了带 fetch 处理器的 Service Worker」。
 * 少了 SW，菜单里的「添加到主屏幕」只会生成一个快捷方式，点开还是带地址栏的浏览器标签；
 * 有了它才会做成独立窗口的应用（Android 上是 WebAPK）。
 *
 * 故意不做缓存：
 *   · 站点是纯静态、没有构建，页面靠浏览器缓存和 Ctrl+F5 就够了，
 *     SW 再叠一层缓存只会制造「改了看不到 / 半小时后还是旧版」这类问题；
 *   · 安装能力只要求「有 fetch 处理器」，不要求 offline 缓存。
 *   所以这里所有请求照常走网络，只在真断网时给一句提示。
 *
 * 以后真要离线可玩，再在这里加 precache + fetch 里读缓存即可，
 * 但记得同时处理版本号（改 assets 时换 CACHE 名）和「HTML 永远 network-first」。
 *
 * 这个文件必须放在站点根目录（本站是 /games/sw.js），它的作用域就是所在目录。
 * ------------------------------------------------------------ */
'use strict';

self.addEventListener('install', function () {
  /* 新版本就绪后立刻待命，不用等所有页面都关掉 */
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  /* 立刻接管已经打开的页面，避免「装好了但这次没生效」 */
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  /* 只处理同源的 GET；其余（POST、跨域）不插手，交给浏览器默认行为 */
  if (req.method !== 'GET') { return; }
  var url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) { return; }

  /* 照常走网络（不读缓存），断网时给一句人话，而不是让页面白屏 */
  event.respondWith(fetch(req).catch(function () {
    return new Response(
      '这个站点需要联网：当前没网，连上后再刷新。',
      { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }));
});
