// 場景、相機操作、點選與拖動、補間動畫、畫面上的文字標籤。
window.JZ = window.JZ || {};
(function (JZ) {
  'use strict';
  var V3 = THREE.Vector3;

  // 3Blue1Brown 的標誌色
  JZ.colors = {
    bg: 0x111111,
    blue: 0x58C4DD, blueLight: 0x9CDCEB, blueDark: 0x29ABCA, blueDeep: 0x1C758A,
    red: 0xFC6255, redLight: 0xFF8080, redDark: 0xCF5044,
    green: 0x83C167, teal: 0x5CD0B3, gold: 0xF0AC5F, purple: 0x9A72AC,
    maroon: 0xC55F73, pink: 0xD147BD, orange: 0xFF862F,
    yellow: 0xFFFF00, grey: 0xBBBBBB, white: 0xFFFFFF
  };

  // ---------- 小工具 ----------
  function smooth(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

  function fracApprox(x, maxDen) {
    for (var q = 1; q <= maxDen; q++) {
      var p = Math.round(x * q);
      if (Math.abs(x - p / q) < 1e-9 * Math.max(1, Math.abs(x))) return [p, q];
    }
    return null;
  }

  // 數值 → TeX（能寫成帶分數就寫成帶分數）
  function numTex(v, maxDen) {
    var f = fracApprox(v, maxDen || 96);
    if (!f) return String(Math.round(v * 100) / 100);
    if (f[1] === 1) return String(f[0]);
    var whole = Math.floor(f[0] / f[1]), r = f[0] - whole * f[1];
    return (whole ? whole : '') + '\\tfrac{' + r + '}{' + f[1] + '}';
  }

  // 比例 → TeX 分數
  function ratioTex(r) {
    var f = fracApprox(r, 4096);
    if (!f) return (r * 100).toFixed(2) + '\\%';
    if (f[1] === 1) return String(f[0]);
    return '\\tfrac{' + f[0] + '}{' + f[1] + '}';
  }

  function tex(s) {
    if (window.katex) return window.katex.renderToString(s, { throwOnError: false, strict: false });
    return '<span class="tex-fallback">' + s.replace(/\\[td]?frac\{(\d+)\}\{(\d+)\}/g, '$1/$2').replace(/\\[a-z]+|[{}]/g, ' ') + '</span>';
  }

  JZ.util = { smooth: smooth, numTex: numTex, ratioTex: ratioTex, tex: tex };

  // 被擋住的稜線：只在線落在別的面後方時才畫，而且畫得很淡。
  // 這樣透過半透明的面看到後面的形體時，它的稜線也看得到。
  JZ.hiddenEdges = function (edgeGeometry, opacity, material) {
    var lines = new THREE.LineSegments(edgeGeometry, material || new THREE.LineBasicMaterial({
      color: JZ.colors.white, transparent: true, opacity: opacity,
      depthFunc: THREE.GreaterDepth, depthWrite: false
    }));
    lines.renderOrder = 5;      // 等所有的面都畫完再畫
    return lines;
  };

  // ---------- Viewer ----------
  function Viewer(canvas, labelLayer) {
    var self = this;
    this.canvas = canvas;
    this.labelLayer = labelLayer;
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(JZ.colors.bg);

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000);
    this.scene.add(this.camera);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.9));
    var sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(-1, 1.3, 0.6);
    sun.target.position.set(0, 0, -1);
    this.camera.add(sun);
    this.camera.add(sun.target);

    this.orbit = { theta: 0.62, phi: 1.12, radius: 10, target: new V3() };
    this.insets = { left: 0, right: 0, top: 0, bottom: 0 };
    this.tweens = [];
    this.labels = [];
    this.mode = null;       // { pickables(), canDrag(mesh), onDrag(mesh, delta), onHover(mesh), onClick(mesh) }
    this.raycaster = new THREE.Raycaster();
    this._pointer = null;
    this._hover = null;

    canvas.addEventListener('pointerdown', function (e) { self._down(e); });
    canvas.addEventListener('pointermove', function (e) { self._move(e); });
    canvas.addEventListener('pointerup', function (e) { self._up(e); });
    canvas.addEventListener('pointercancel', function (e) { self._up(e); });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.orbit.radius *= Math.exp(e.deltaY * 0.001);
    }, { passive: false });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    this.resize();
    var loop = function (now) {
      self._frame(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  Viewer.prototype.resize = function () {
    var w = window.innerWidth, h = window.innerHeight;
    this.width = w; this.height = h;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this._applyInsets();
  };

  // 讓場景中心落在沒被面板蓋住的區域中央
  Viewer.prototype.setInsets = function (insets) {
    this.insets = insets;
    if (this.width && this.height) this._applyInsets();
  };

  Viewer.prototype._applyInsets = function () {
    var i = this.insets, w = this.width, h = this.height;
    this.camera.setViewOffset(w, h, (i.right - i.left) / 2, (i.bottom - i.top) / 2, w, h);
    this.camera.updateProjectionMatrix();
  };

  // 把相機對準半徑 bound 的球；animate 時平滑移過去
  Viewer.prototype.frame = function (center, bound, animate) {
    var i = this.insets;
    var freeW = Math.max(200, this.width - i.left - i.right);
    var freeH = Math.max(200, this.height - i.top - i.bottom);
    var half = THREE.MathUtils.degToRad(this.camera.fov / 2);
    var halfH = Math.atan(Math.tan(half) * this.camera.aspect);
    var radius = bound * 1.12 * Math.max(
      (this.height / freeH) / Math.sin(half),
      (this.width / freeW) / Math.sin(halfH)
    );
    this.camera.near = radius / 200;
    this.camera.far = radius * 20;
    this.camera.updateProjectionMatrix();
    if (this._frameTween) this._frameTween.dead = true;
    var o = this.orbit;
    if (!animate) { o.target.copy(center); o.radius = radius; return; }
    var from = o.target.clone(), r0 = o.radius;
    this._frameTween = this.tween(1.2, function (t) {
      o.target.lerpVectors(from, center, t);
      o.radius = r0 + (radius - r0) * t;
    });
  };

  // 補間：fn 收到緩動後的 0→1
  Viewer.prototype.tween = function (seconds, fn, done) {
    var tw = { start: performance.now(), dur: seconds * 1000, fn: fn, done: done, dead: false };
    this.tweens.push(tw);
    return tw;
  };

  Viewer.prototype.addLabel = function (text, className) {
    var el = document.createElement('div');
    el.className = 'label3d ' + (className || '');
    el.innerHTML = text;
    this.labelLayer.appendChild(el);
    var label = { el: el, pos: new V3(), opacity: 0 };
    this.labels.push(label);
    return label;
  };

  Viewer.prototype.removeLabel = function (label) {
    var i = this.labels.indexOf(label);
    if (i >= 0) this.labels.splice(i, 1);
    if (label.el.parentNode) label.el.parentNode.removeChild(label.el);
  };

  // 尺寸標示：marks 是 [{ from, to, off, html }]，off 是標示線往外移的向量
  Viewer.prototype.setMarks = function (marks) {
    var self = this;
    if (this.marks) {
      this.scene.remove(this.marks.lines);
      this.marks.lines.geometry.dispose();
      this.marks.lines.material.dispose();
      this.marks.labels.forEach(function (l) { self.removeLabel(l); });
    }
    var pts = [], labels = [];
    marks.forEach(function (m) {
      var a = m.from.clone().add(m.off), b = m.to.clone().add(m.off);
      pts.push(a, b);
      // 兩端的引出線
      [m.from, m.to].forEach(function (p) {
        pts.push(p.clone().addScaledVector(m.off, 0.25), p.clone().addScaledVector(m.off, 1.25));
      });
      var label = self.addLabel(m.html, 'dim');
      label.pos.copy(a).add(b).multiplyScalar(0.5).addScaledVector(m.off, 0.9);
      label.opacity = 1;
      labels.push(label);
    });
    var lines = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.75 })
    );
    this.scene.add(lines);
    this.marks = { lines: lines, labels: labels };
    this.showMarks(this.marksOn !== false);
  };

  Viewer.prototype.showMarks = function (on) {
    this.marksOn = on;
    if (!this.marks) return;
    var vis = on && !this.marksHeld;
    this.marks.lines.visible = vis;
    this.marks.labels.forEach(function (l) { l.el.style.display = vis ? '' : 'none'; });
  };

  // 畫面暫時太擠時先收起尺寸標示（不改使用者的開關）
  Viewer.prototype.holdMarks = function (held) {
    this.marksHeld = held;
    this.showMarks(this.marksOn !== false);
  };

  Viewer.prototype._frame = function (now) {
    // 視窗一開始可能還沒有大小（例如在背景分頁載入），之後才補上
    if (window.innerWidth !== this.width || window.innerHeight !== this.height) {
      var wasEmpty = !this.width || !this.height;
      this.resize();
      if (this.onResize) this.onResize(wasEmpty);
    }
    if (!this.width || !this.height) return;

    // 回呼裡可能又加了新的補間，所以先複製一份再跑
    var list = this.tweens.slice();
    for (var i = 0; i < list.length; i++) {
      var tw = list[i];
      if (tw.dead) continue;
      var t = Math.max(0, Math.min(1, (now - tw.start) / tw.dur));
      tw.fn(smooth(t));
      if (t >= 1) {
        tw.dead = true;
        if (tw.done) tw.done();
      }
    }
    this.tweens = this.tweens.filter(function (tw) { return !tw.dead; });

    var o = this.orbit, cam = this.camera;
    cam.position.set(
      o.target.x + o.radius * Math.sin(o.phi) * Math.sin(o.theta),
      o.target.y + o.radius * Math.cos(o.phi),
      o.target.z + o.radius * Math.sin(o.phi) * Math.cos(o.theta)
    );
    cam.lookAt(o.target);
    cam.updateMatrixWorld();

    var v = new V3();
    for (var k = 0; k < this.labels.length; k++) {
      var lb = this.labels[k];
      if (lb.opacity < 0.01) { lb.el.style.opacity = 0; continue; }
      v.copy(lb.pos).project(cam);
      lb.el.style.opacity = lb.opacity;
      lb.el.style.transform = 'translate(-50%,-50%) translate(' +
        ((v.x + 1) / 2 * this.width).toFixed(1) + 'px,' + ((1 - v.y) / 2 * this.height).toFixed(1) + 'px)';
    }
    this.renderer.render(this.scene, cam);
  };

  // ---------- 指標操作 ----------
  Viewer.prototype._pick = function (e) {
    if (!this.mode || !this.mode.pickables) return null;
    var ndc = new THREE.Vector2(e.clientX / this.width * 2 - 1, -(e.clientY / this.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    var hits = this.raycaster.intersectObjects(this.mode.pickables(), false);
    return hits.length ? hits[0] : null;
  };

  Viewer.prototype._down = function (e) {
    this.canvas.setPointerCapture(e.pointerId);
    var hit = this._pick(e);
    var p = { x: e.clientX, y: e.clientY, moved: 0, hit: hit, kind: 'orbit' };
    if (e.button === 2 || e.shiftKey) {
      p.kind = 'pan';
    } else if (hit && this.mode.canDrag && this.mode.canDrag(hit.object)) {
      p.kind = 'drag';
      var dir = this.camera.getWorldDirection(new V3());
      p.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(dir, hit.point);
      p.last = hit.point.clone();
    }
    this._pointer = p;
  };

  Viewer.prototype._move = function (e) {
    var p = this._pointer;
    if (!p) {
      var hit = this._pick(e);
      var obj = hit ? hit.object : null;
      if (obj !== this._hover) {
        this._hover = obj;
        if (this.mode && this.mode.onHover) this.mode.onHover(obj);
      }
      this.canvas.style.cursor = obj && this.mode.canDrag && this.mode.canDrag(obj) ? 'grab' : '';
      return;
    }
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    p.moved += Math.abs(dx) + Math.abs(dy);
    var o = this.orbit;
    if (p.kind === 'orbit') {
      o.theta -= dx * 0.008;
      o.phi = Math.min(Math.PI - 0.05, Math.max(0.05, o.phi - dy * 0.008));
    } else if (p.kind === 'pan') {
      var scale = 2 * o.radius * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / this.height;
      var right = new V3().setFromMatrixColumn(this.camera.matrixWorld, 0);
      var up = new V3().setFromMatrixColumn(this.camera.matrixWorld, 1);
      o.target.addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale);
    } else if (p.kind === 'drag') {
      var ndc = new THREE.Vector2(e.clientX / this.width * 2 - 1, -(e.clientY / this.height) * 2 + 1);
      this.raycaster.setFromCamera(ndc, this.camera);
      var pt = this.raycaster.ray.intersectPlane(p.plane, new V3());
      if (pt) {
        this.mode.onDrag(p.hit.object, pt.clone().sub(p.last));
        p.last.copy(pt);
      }
    }
  };

  Viewer.prototype._up = function (e) {
    var p = this._pointer;
    this._pointer = null;
    if (p && p.moved < 5 && this.mode && this.mode.onClick) this.mode.onClick(p.hit ? p.hit.object : null);
  };

  JZ.Viewer = Viewer;
})(window.JZ);
