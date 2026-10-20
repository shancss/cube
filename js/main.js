// 分頁切換、尺寸、字幕、鍵盤操作、自我檢查。
(function (JZ) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  // 兩個分頁各記自己的尺寸：「立體與拆解」預設用陽馬題（廣五、袤七、高八），
  // 「劉徽的極限」用原文的棊（廣、袤、高各二尺）。JZ.dims 指向目前分頁的那一組。
  // 方亭另有一組（a 是下方、b 是上方），預設用劉徽的例子：下方三尺、上方一尺、高一尺。
  var dimsOf = { explore: { a: 5, b: 7, h: 8 }, fangting: { a: 3, b: 1, h: 1 }, limit: { a: 2, b: 2, h: 2 } };
  JZ.dims = dimsOf.explore;

  var viewer = new JZ.Viewer($('stage'), $('labels'));
  var tabs = { explore: new JZ.Explore(viewer), limit: new JZ.Limit(viewer) };
  var current = 'explore';

  function insets() {
    if (document.body.classList.contains('clean')) return { left: 0, right: 0, top: 30, bottom: 130 };
    var wide = window.innerWidth > 760;
    return current === 'explore'
      ? { left: wide ? 266 : 232, right: 0, top: 50, bottom: 140 }
      : { left: 0, right: $('lm-panel').offsetWidth + 30, top: 60 + $('lm-loop').offsetHeight, bottom: 170 };
  }

  // 目前該用哪一組尺寸
  function dimsKey() {
    if (current === 'limit') return 'limit';
    return tabs.explore.isFangting() ? 'fangting' : 'explore';
  }
  function isFangting() { return dimsKey() === 'fangting'; }

  // 「立體與拆解」換到方亭或換回來時，尺寸跟著換成那一組
  JZ.syncDims = function () {
    JZ.dims = dimsOf[dimsKey()];
    showDims();
  };

  // 在立體外側標出廣、袤、高。鱉臑照原題標成「下廣、上袤」，方亭標下方、上方、高。
  JZ.updateMarks = function () {
    var V3 = THREE.Vector3, d = JZ.dims, a = d.a, b = d.b, h = d.h;
    var text = function (name, v) { return name + ' <b>' + v + '</b>'; };
    markDimsPreset();
    if (current === 'explore' && tabs.explore.noMarks()) return viewer.setMarks([]);
    if (isFangting()) {
      var e = (a - b) / 2, mf = 0.07 * Math.sqrt(2 * a * a + h * h);
      return viewer.setMarks([
        { from: new V3(0, 0, a), to: new V3(a, 0, a), off: new V3(0, 0, mf), html: text('下方', a) },
        { from: new V3(e, h, e + b), to: new V3(e + b, h, e + b), off: new V3(0, mf, 0), html: text('上方', b) },
        { from: new V3(0, 0, a), to: new V3(0, h, a), off: new V3(-mf, 0, 0), html: text('高', h) }
      ]);
    }
    var m = 0.07 * Math.sqrt(a * a + b * b + h * h);
    var bienao = current === 'explore' && tabs.explore.presetId === 'bienao';
    viewer.setMarks([
      { from: new V3(0, 0, b), to: new V3(a, 0, b), off: new V3(0, 0, m), html: text(bienao ? '下廣' : '廣', a) },
      bienao
        ? { from: new V3(0, h, 0), to: new V3(0, h, b), off: new V3(0, m, 0), html: text('上袤', b) }
        : { from: new V3(a, 0, 0), to: new V3(a, 0, b), off: new V3(m, 0, 0), html: text('袤', b) },
      { from: new V3(0, 0, b), to: new V3(0, h, b), off: new V3(-m, 0, 0), html: text('高', h) }
    ]);
  };

  function showDims() {
    var d = JZ.dims, ft = isFangting();
    ['lab-a', 'top-a'].forEach(function (id) { $(id).textContent = ft ? '下方' : '廣'; });
    ['lab-b', 'top-b'].forEach(function (id) { $(id).textContent = ft ? '上方' : '袤'; });
    $('dim-a').value = d.a; $('dim-b').value = d.b; $('dim-h').value = d.h;
    $('now-a').textContent = d.a; $('now-b').textContent = d.b; $('now-h').textContent = d.h;
  }

  // 兩個分頁各記自己的視角；極限頁從比較正面的角度看，左右兩欄才不會重疊
  var angles = { explore: { theta: 0.62, phi: 1.12 }, limit: { theta: 0.25, phi: 1.1 } }, shown = null;

  function show(name) {
    if (shown) angles[shown] = { theta: viewer.orbit.theta, phi: viewer.orbit.phi };
    shown = name;
    viewer.orbit.theta = angles[name].theta;
    viewer.orbit.phi = angles[name].phi;
    current = name;
    JZ.syncDims();
    document.body.setAttribute('data-tab', name);
    for (var k in tabs) tabs[k].setActive(k === name);
    JZ.updateMarks();
    viewer.mode = tabs[name].mode();
    viewer.setInsets(insets());
    tabs[name].frame(false);
  }

  // 尺寸改了：只重建目前這個分頁
  function applyDims() {
    showDims();
    tabs[current].rebuild();
    JZ.updateMarks();
    tabs[current].frame(false);
  }

  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (btn) {
    btn.addEventListener('click', function () { show(btn.getAttribute('data-tab')); });
  });

  $('dims-toggle').addEventListener('click', function () { $('dims-pop').hidden = !$('dims-pop').hidden; });
  ['a', 'b', 'h'].forEach(function (key) {
    $('dim-' + key).addEventListener('change', function () {
      var v = Math.max(0.5, Math.min(500, +this.value || JZ.dims[key]));
      JZ.dims[key] = v;
      // 方亭的上方必須比下方小
      if (isFangting() && JZ.dims.b >= JZ.dims.a) {
        if (key === 'a') JZ.dims.b = JZ.dims.a / 2;
        else JZ.dims.a = JZ.dims.b * 2;
      }
      applyDims();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-dims]'), function (btn) {
    btn.addEventListener('click', function () {
      var v = btn.getAttribute('data-dims').split(',').map(Number);
      // 在「立體與拆解」按原題數據，同時換成該題的立體
      if (current === 'explore') tabs.explore.presetId = btn.getAttribute('data-shape');
      dimsOf[dimsKey()] = JZ.dims = { a: v[0], b: v[1], h: v[2] };
      applyDims();
    });
  });

  // 目前的尺寸與立體若正好是某一題，就把那一題標亮
  function markDimsPreset() {
    var d = JZ.dims, now = [d.a, d.b, d.h].join(',');
    Array.prototype.forEach.call(document.querySelectorAll('[data-dims]'), function (btn) {
      btn.classList.toggle('on', btn.getAttribute('data-dims') === now &&
        (current === 'limit' || btn.getAttribute('data-shape') === tabs.explore.presetId));
    });
  }

  function toggleClean() {
    var on = document.body.classList.toggle('clean');
    $('ui-toggle').textContent = on ? '顯示介面' : '隱藏介面';
    viewer.setInsets(insets());
  }
  $('ui-toggle').addEventListener('click', toggleClean);

  // 觀眾 QR：全螢幕顯示觀眾頁網址的 QR code，投影時給台下掃
  var AUDIENCE_URL = 'https://shancss.github.io/cube/audience.html';
  function toggleQR(on) {
    var box = $('qr-overlay');
    if (on && !$('qr-code').firstChild && window.qrcode) {
      var qr = window.qrcode(0, 'M');
      qr.addData(AUDIENCE_URL);
      qr.make();
      $('qr-code').innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
    }
    box.hidden = !on;
  }
  $('qr-toggle').addEventListener('click', function () { toggleQR(true); });
  $('qr-overlay').addEventListener('click', function () { toggleQR(false); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggleQR(false); });
  $('marks-toggle').addEventListener('click', function () {
    viewer.showMarks(!viewer.marksOn);
    this.textContent = viewer.marksOn ? '隱藏標示' : '顯示標示';
  });

  window.addEventListener('keydown', function (e) {
    var tag = e.target.tagName;
    if (tag === 'INPUT' && e.target.type === 'number') return;
    if (e.key === 'h' || e.key === 'H') return toggleClean();
    if (e.key === '1') return show('explore');
    if (e.key === '2') return show('limit');
    if (current !== 'limit') return;
    var lm = tabs.limit;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); lm.setPlaying(false); lm.next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); lm.setPlaying(false); lm.prev(); }
    else if (e.key === ' ') { e.preventDefault(); lm.setPlaying(!lm.playing); }
  });
  viewer.onResize = function (wasEmpty) {
    viewer.setInsets(insets());
    if (wasEmpty) tabs[current].frame(false);
  };

  ['explore', 'limit'].forEach(function (name) {
    current = name;
    JZ.dims = dimsOf[dimsKey()];
    tabs[name].rebuild();
  });
  show(/[#&]limit/.test(location.hash) ? 'limit' : 'explore');
  window.addEventListener('hashchange', function () {
    show(/[#&]limit/.test(location.hash) ? 'limit' : 'explore');
  });

  // 網址加 ?selftest 時檢查幾何與體積
  JZ.selftest = function () {
    var G = JZ.geo, V3 = THREE.Vector3, out = [], ok = true;
    var check = function (name, got, want) {
      var pass = Math.abs(got - want) < 1e-6 * Math.max(1, Math.abs(want));
      if (!pass) ok = false;
      out.push((pass ? 'ok   ' : 'FAIL ') + name + ': ' + got + (pass ? '' : ' (應為 ' + want + ')'));
    };
    [[2, 2, 2], [5, 7, 8], [5, 4, 7], [20, 186, 25]].forEach(function (v) {
      var a = v[0], b = v[1], h = v[2], abh = a * b * h, tag = ' [' + v.join('・') + ']';
      var yang = G.yangma(a, h, b), bie = G.bienao(a, h, b);
      check('塹堵' + tag, G.qiandu(a, h, b).volume, abh / 2);
      check('陽馬' + tag, yang.volume, abh / 3);
      check('鱉臑' + tag, bie.volume, abh / 6);

      var count = function (parts, frac) {
        return parts.filter(function (p) { return Math.abs(p.volume / abh - frac) < 1e-6; }).length;
      };
      var ys = G.halve(yang, a, h, b), bs = G.halve(bie, a, h, b);
      check('陽馬中分塊數' + tag, ys.length, 5);
      check('　立方 1' + tag, count(ys, 1 / 8), 1);
      check('　塹堵 2' + tag, count(ys, 1 / 16), 2);
      check('　小陽馬 2' + tag, count(ys, 1 / 24), 2);
      check('鱉臑中分塊數' + tag, bs.length, 4);
      check('　塹堵 2' + tag, count(bs, 1 / 16), 2);
      check('　小鱉臑 2' + tag, count(bs, 1 / 48), 2);
      var sum = function (parts) { return parts.reduce(function (s, p) { return s + p.volume; }, 0); };
      check('陽馬各塊加總' + tag, sum(ys), abh / 3);
      check('鱉臑各塊加總' + tag, sum(bs), abh / 6);

      // 已定的部分：藍 2、紅 1，合計佔塹堵的 3/4
      var blue = abh / 8 + 2 * abh / 16, red = 2 * abh / 16;
      check('已定 藍:紅' + tag, blue / red, 2);
      check('已定比例' + tag, (blue + red) / (abh / 2), 3 / 4);

      var P = G.planes(a, h, b), six = [G.box(a, h, b)];
      ['p1', 'p2', 'p3'].forEach(function (k) { six = G.splitAll(six, P[k].n, P[k].d); });
      check('六鱉臑塊數' + tag, six.length, 6);
      six.forEach(function (p, i) { check('　鱉臑 ' + (i + 1) + tag, p.volume, abh / 6); });

      var n = new V3(0.3, 0.8, -0.5), parts = G.split(G.box(a, h, b), n, n.dot(new V3(a / 2, h / 2, b / 3)));
      check('任意平面切割體積守恆' + tag, parts[0].volume + parts[1].volume, abh);
    });
    // 方亭：下方、上方、高
    [[3, 1, 1], [50, 40, 50], [7, 2.5, 4]].forEach(function (v) {
      var a = v[0], b = v[1], h = v[2], e = (a - b) / 2, vol = (a * b + a * a + b * b) * h / 3, tag = ' [方亭 ' + v.join('・') + ']';
      check('方亭體積' + tag, G.fangting(a, h, b).volume, vol);
      var nine = G.fangtingParts(a, h, b), tp = G.threePrisms(a, h, b).parts;
      var num = function (list, kind) { return list.filter(function (p) { return p.kind === kind; }).length; };
      var tot = function (list) { return list.reduce(function (s, p) { return s + p.poly.volume; }, 0); };
      check('九塊棊' + tag, nine.length, 9);
      check('　立方 1' + tag, num(nine, '立方'), 1);
      check('　塹堵 4' + tag, num(nine, '塹堵'), 4);
      check('　陽馬 4' + tag, num(nine, '陽馬'), 4);
      check('　九塊加總' + tag, tot(nine), vol);
      check('三方柱棊數' + tag, tp.length, 27);
      check('　立方 3' + tag, num(tp, '立方'), 3);
      check('　塹堵 12' + tag, num(tp, '塹堵'), 12);
      check('　陽馬 12' + tag, num(tp, '陽馬'), 12);
      check('　三方柱 = 三方亭' + tag, tot(tp), 3 * vol);
      var plan = G.planAssembly(tp, a, h, b, G.threePrisms(a, h, b).pitch);
      check('　27 塊都有位置' + tag, plan.filter(function (p) { return p; }).length, 27);
      check('　需要搬動的塊數' + tag, plan.filter(function (p) { return p && p.moved; }).length, 14);
      check('　需要變形的塊數' + tag, plan.filter(function (p) { return p && p.stretched; }).length, Math.abs(e - h) < 1e-9 ? 0 : 8);
      tp.forEach(function (p) {
        var want = p.kind === '立方' ? b * b * h : p.kind === '塹堵' ? e * b * h / 2 : e * e * h / 3;
        if (Math.abs(p.poly.volume - want) > 1e-6 * want) check('　' + p.kind + '體積' + tag, p.poly.volume, want);
      });
    });
    for (var lv = 1; lv <= 6; lv++) {
      var done = 0;
      for (var L = 1; L <= lv; L++) done += 0.75 * Math.pow(0.25, L - 1);
      check('第 ' + lv + ' 層已定比例', done, 1 - Math.pow(4, -lv));
    }
    out.push(ok ? '全部通過' : '有項目失敗');
    console.log(out.join('\n'));
    JZ.selftestResult = { ok: ok, lines: out };
    return JZ.selftestResult;
  };
  if (/selftest/.test(location.search)) JZ.selftest();

  JZ.app = { viewer: viewer, tabs: tabs, show: show };
})(window.JZ);
