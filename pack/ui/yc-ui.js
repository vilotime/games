/* ============================================================
 * 叶初小游戏 · 统一交互脚本
 * ------------------------------------------------------------
 * 用法：在所有游戏页面 </body> 前加一行
 *     <script src="yc-ui.js"></script>
 *
 * 目前只做一件事：
 *   把 <body data-pc-only="1"> 标成「只能电脑玩」的游戏，在手机 / 平板上
 *   隐藏游戏内的状态栏和提示（这些页面在手机上只会显示“只能在电脑上玩”，
 *   留着状态栏会在窄屏上撑出画布）。
 *
 * 全屏按钮已经全部移除，这里不再有任何全屏 / 横竖屏逻辑。
 * ============================================================ */
(function () {
  'use strict';

  function isMobile() {
    try {
      var mm = window.matchMedia;
      var coarse = !!(mm && (mm('(pointer: coarse)').matches || mm('(any-pointer: coarse)').matches));
      var noHover = !!(mm && mm('(hover: none)').matches);
      var touch = (navigator.maxTouchPoints || 0) > 0;

      try {
        if (navigator.userAgentData && navigator.userAgentData.mobile === true) { return true; }
      } catch (e) {}

      var ua = navigator.userAgent || '';
      if (/Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle|HarmonyOS|OpenHarmony|ArkWeb|Windows Phone/i.test(ua)) { return true; }
      if (touch && (coarse || noHover)) { return true; }
      if (coarse && noHover) { return true; }
      if (window.innerWidth <= 820 && (touch || noHover)) { return true; }
      return false;
    } catch (e) { return false; }
  }

  var MOBILE = isMobile();

  function init() {
    var pcOnly = false;
    try { pcOnly = document.body.getAttribute('data-pc-only') === '1'; } catch (e) {}
    if (!MOBILE || !pcOnly) { return; }

    /* 只能在电脑上玩的游戏：手机上看不到游戏内 UI，只留拦截面板 */
    var hideList = ['#hud', '#hint', '#banner'];
    for (var i = 0; i < hideList.length; i++) {
      var el = document.querySelector(hideList[i]);
      if (el) { el.style.display = 'none'; }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.YCUI = { isMobile: function () { return MOBILE; } };
})();