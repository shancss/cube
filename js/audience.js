// 觀眾頁：只有「劉徽的極限」，給台下用手機橫向操作。
(function (JZ) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  // 固定用劉徽原文的棊：廣、袤、高各二尺
  JZ.dims = { a: 2, b: 2, h: 2 };

  var viewer = new JZ.Viewer($('stage'), $('labels'));
  viewer.orbit.theta = 0.25;
  viewer.orbit.phi = 1.1;
  var lm = new JZ.Limit(viewer);
  lm.active = true;
  lm.rebuild();
  lm.setActive(true);
  viewer.mode = lm.mode();

  // 左右留給上一步／下一步的大按鈕，下面留給字幕
  function refit() {
    var side = Math.min(84, window.innerWidth * 0.11);
    viewer.setInsets({ left: side, right: side, top: 28, bottom: $('au-bottom').offsetHeight + 8 });
    lm.frame(false);
  }
  viewer.onResize = refit;
  refit();

  // 網址加 ?step=5 可以直接跳到第 5 步（從 1 算起）
  var m = /[?&]step=(\d+)/.exec(location.search);
  if (m) lm.goTo(+m[1] - 1, false);
  JZ.audience = { viewer: viewer, limit: lm };

  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); lm.next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); lm.prev(); }
  });

  // ---------- 全螢幕與橫向 ----------
  // iPhone 的 Safari 不支援網頁全螢幕，按鈕就不出現
  var root = document.documentElement;
  var canFull = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  var isFull = function () { return !!(document.fullscreenElement || document.webkitFullscreenElement); };

  function enterFull() {
    var req = root.requestFullscreen || root.webkitRequestFullscreen;
    var lock = function () {
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {});
    };
    try {
      var p = req.call(root);
      if (p && p.then) p.then(lock).catch(function () {});
      else lock();
    } catch (err) { /* 不支援就維持原樣 */ }
  }
  function exitFull() {
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document);
  }
  ['au-full', 'au-full2'].forEach(function (id) {
    var btn = $(id);
    btn.hidden = !canFull;
    btn.addEventListener('click', function () { if (isFull()) exitFull(); else enterFull(); });
  });
  var onFullChange = function () { $('au-full').textContent = isFull() ? '結束全螢幕' : '全螢幕'; };
  document.addEventListener('fullscreenchange', onFullChange);
  document.addEventListener('webkitfullscreenchange', onFullChange);

  // ---------- 直拿手機時提示轉橫向 ----------
  var skipped = false;
  function checkOrientation() {
    $('au-rotate').hidden = skipped || window.innerWidth >= window.innerHeight;
  }
  $('au-skip').addEventListener('click', function () { skipped = true; checkOrientation(); });
  window.addEventListener('resize', checkOrientation);
  checkOrientation();
})(window.JZ);
