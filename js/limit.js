// 分頁二「劉徽的極限」：陽馬、鱉臑分欄 → 中分 → 會算的搬上去比 → 剩下的再分；上方循環圖、3D 與四分圖同步。
window.JZ = window.JZ || {};
(function (JZ) {
  'use strict';
  var V3 = THREE.Vector3, C = JZ.colors, G = JZ.geo, U = JZ.util;
  var $ = function (id) { return document.getElementById(id); };
  var SVG = 'http://www.w3.org/2000/svg';

  var MAX = 6;                       // 最多分割幾層
  var SOLID = 0.92, DIM = 0.2, GHOST = 0.08;

  // 每一步的畫面狀態。陽馬（藍）在左欄、鱉臑（紅）在右欄，會算的棊搬到上方排成一排排。
  // u[L]/d[L]：第 L 層「未定／已定」棊的不透明度；k[L]：第 L 層散開的程度；
  // known[L]：第 L 層已定的棊是否已經搬到上方；view：鏡頭要看哪一塊。
  // loop：上方循環圖要亮哪幾格（1 開頭、2 中分、3 會算的、4 剩下）、第幾輪、這一輪切的與切完剩下的份量。
  var STEPS = [
    {
      title: '塹堵',
      quote: '邪解立方得兩塹堵。',
      plain: '從一個塹堵開始：它是立方的一半。',
      loop: { nodes: [1], round: 1, cut: 0 },
      set: function (s) { s.u[0] = SOLID; s.view = 'whole'; }
    },
    {
      title: '分開',
      quote: '邪解塹堵，其一爲陽馬，一爲鱉臑。陽馬居二，鱉臑居一，不易之率也。',
      plain: '斜切一刀，分成陽馬（藍）和鱉臑（紅），先把它們分開來看。要證明的是：陽馬的體積永遠是鱉臑的 2 倍。',
      loop: { nodes: [1], round: 1, cut: 0 },
      set: function (s) { s.u[0] = SOLID; s.labels = 'head'; }
    },
    {
      title: '中分',
      quote: '於是中效其廣、袤，又中分其高。',
      plain: '兩塊都把廣、袤、高從正中切一刀。陽馬裂成 5 塊，鱉臑裂成 4 塊。',
      loop: { nodes: [2], round: 1, cut: 0 },
      set: function (s) { s.u[1] = SOLID; s.d[1] = SOLID; s.k[1] = 0.32; s.planes = 1; s.labels = 'head stack'; }
    },
    {
      title: '辨形',
      quote: '陽馬……用立方之棊一，塹堵、陽馬之棊各二。鱉臑……用塹堵、鱉臑之棊各二。',
      plain: '亮著的是會算的：立方算 1，塹堵是半個立方算 ½。暗的小陽馬、小鱉臑還不知道。',
      loop: { nodes: [3], round: 1, cut: 0 },
      set: function (s) { s.u[1] = DIM; s.d[1] = SOLID; s.k[1] = 0.32; s.labels = 'head stack frac'; }
    },
    {
      title: '合方',
      quote: '按餘數具而可知者有一、二分之別，即一、二之爲率定矣。',
      plain: '把會算的搬到右邊疊好：藍色湊成 2 個小方，紅色湊成 1 個小方，正好 2 : 1。左邊原位留下淡淡的格子。',
      loop: { nodes: [3], round: 1, cut: 0, left: 1 },
      set: function (s) { s.u[1] = DIM; s.d[1] = SOLID; s.known[1] = 1; s.lv = 1; s.view = 'all'; s.labels = 'head stack tally ratio'; }
    },
    {
      title: '其餘',
      quote: '其餘兩端各積本體。',
      plain: '剩下 2 個小陽馬和 2 個小鱉臑。和淡色的原形比，只佔原本的 1/4，而且是同一個問題縮小一半。',
      loop: { nodes: [4], round: 1, cut: 0, left: 1 },
      set: function (s) { s.u[1] = SOLID; s.d[1] = SOLID; s.known[1] = 1; s.lv = 1; s.view = 'all'; s.labels = 'head stack rest ratio'; }
    },
    {
      title: '再分',
      quote: '若爲數而窮之，置餘廣、袤、高之數各半之，則四分之三又可知也。',
      plain: '回到循環的開頭，對剩下的每一塊做同樣的事：再從正中切開。',
      loop: { nodes: [2], round: 2, cut: 1 },
      set: function (s) {
        s.d[1] = SOLID; s.known[1] = 1;
        s.u[2] = SOLID; s.d[2] = SOLID; s.k[2] = 0.32; s.lv = 1; s.view = 'all'; s.labels = 'head stack ratio';
      }
    }
  ];
  var DEEP = [
    ['若爲數而窮之，置餘廣、袤、高之數各半之，則四分之三又可知也。', '會算的又搬到右邊，疊成第二排：藍色仍然是紅色的 2 倍。'],
    ['半之彌少，其餘彌細。', '第 3 輪：上面每一排，藍色都正好是紅色的 2 倍寬。'],
    ['半之彌少，其餘彌細。', '第 4 輪：切的部分越來越小。'],
    ['至細曰微，微則無形。', '第 5 輪：剩下的縮成斜線上的細珠。'],
    ['至細曰微，微則無形。', '第 6 輪：剩下的幾乎看不見了。']
  ];
  DEEP.forEach(function (text, i) {
    var n = i + 2;
    STEPS.push({
      title: '第 ' + n + ' 輪', quote: text[0], plain: text[1],
      loop: { nodes: [2, 3, 4], round: n, cut: n - 1, left: n },
      set: function (s) {
        for (var L = 1; L <= n; L++) { s.d[L] = SOLID; s.known[L] = 1; }
        s.u[n] = SOLID; s.lv = n; s.view = 'all'; s.labels = 'head stack ratio';
      }
    });
  });
  STEPS.push({
    title: '極限',
    quote: '由是言之，安取餘哉？',
    plain: '一直循環下去，剩下的趨近於零，右邊兩座塔就是全部：藍色永遠是紅色的 2 倍。所以陽馬是立方的 1/3，鱉臑是 1/6。',
    loop: { nodes: [], round: 0, cut: null },
    set: function (s) {
      for (var L = 1; L <= MAX; L++) { s.d[L] = SOLID; s.known[L] = 1; }
      s.u[0] = 0.12; s.lv = MAX; s.final = true; s.view = 'all'; s.labels = 'head stack ratio';
    }
  });

  function stateOf(step) {
    var s = { u: [], d: [], k: [], known: [], sep: step >= 1 ? 1 : 0, planes: 0, lv: 0, final: false, labels: '', view: 'cols' };
    for (var L = 0; L <= MAX; L++) { s.u.push(0); s.d.push(0); s.k.push(0); s.known.push(0); }
    STEPS[step].set(s);
    s.g = s.known.map(function (k) { return k ? GHOST : 0; });
    return s;
  }

  function Limit(viewer) {
    this.viewer = viewer;
    this.group = new THREE.Group();
    viewer.scene.add(this.group);
    this.step = 0;
    this.objs = [];
    this.mats = [];
    this.labels = [];
    this.planes = null;
    this._buildDiagram();
    this._bindUI();
  }

  Limit.prototype.mode = function () {
    var self = this;
    return {
      pickables: function () {
        return self.objs.filter(function (o) { return !o.twin && o.mat.op > 0.05; }).map(function (o) { return o.mesh; });
      },
      canDrag: function () { return false; },
      onHover: function (mesh) { self._hover(mesh ? mesh.userData.obj : null); },
      onClick: function () {}
    };
  };

  // ---------- 建立場景 ----------
  Limit.prototype._clear = function () {
    var self = this;
    if (this._tween) this._tween.dead = true;
    this.objs.forEach(function (o) { self.group.remove(o.mesh); });
    this.mats.forEach(function (m) { m.face.dispose(); m.edge.dispose(); m.hidden.dispose(); });
    (this.geoms || []).forEach(function (g) { g.faces.dispose(); g.edges.dispose(); });
    this.labels.forEach(function (l) { self.viewer.removeLabel(l.label); });
    if (this.planes) {
      this.group.remove(this.planes.group);
      this.planes.fill.dispose(); this.planes.line.dispose();
    }
    this.objs = []; this.mats = []; this.geoms = []; this.labels = [];
  };

  Limit.prototype._mat = function (key, L, color) {
    var id = key + L;
    for (var i = 0; i < this.mats.length; i++) if (this.mats[i].id === id) return this.mats[i];
    var m = {
      id: id, op: 0,
      face: new THREE.MeshLambertMaterial({
        color: color, transparent: true, opacity: 0,
        polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
      }),
      edge: new THREE.LineBasicMaterial({ color: C.white, transparent: true, opacity: 0 }),
      hidden: new THREE.LineBasicMaterial({
        color: C.white, transparent: true, opacity: 0, depthFunc: THREE.GreaterDepth, depthWrite: false
      }),
      known: key.charAt(0) === 'd', ghost: key.charAt(0) === 'g', L: L
    };
    this.mats.push(m);
    return m;
  };

  Limit.prototype.rebuild = function () {
    this._clear();
    var self = this, d = JZ.dims, a = d.a, h = d.h, b = d.b, unit = a * h * b;
    var a2 = a / 2, h2 = h / 2, b2 = b / 2;
    var near = function (v, f) { return Math.abs(v / unit - f) < 1e-6; };
    var yang = G.yangma(a, h, b), bie = G.bienao(a, h, b);

    // 版面：左邊是剩下的（陽馬欄 x∈[0,a]、鱉臑欄 x∈[Dx,Dx+a]，原位留淡影）；
    // 右邊是會算的，拼成小方疊成兩座塔：藍塔在左、紅塔在右，並排方便比 2 : 1。第 L 排的底在 rowY[L]。
    var Dx = a * 1.4, gapK = a * 0.7, sp = a * 0.08, gapY = h * 0.08;
    var blueX = Dx + a + gapK, redX = blueX + a + a * 0.4;
    var rowY = [0, 0];
    for (var r = 2; r <= MAX + 1; r++) rowY.push(rowY[r - 1] + h / Math.pow(2, r - 1) + gapY / Math.pow(2, r - 2));
    var towerTop = rowY[MAX + 1];
    this.layout = { Dx: Dx, right: redX + a2 + a * 0.2, top: towerTop };

    // 一個塹堵的「補塊」：在 a/2 × h/2 × b/2 的小方裡，和斜面另一側的塹堵合起來剛好是這個小方
    var fill = G.keep(G.box(a2, h2, b2), new V3(1 / a, 1 / h, 0), 0.5, true);

    // 第一層會算的棊。slot 是它在上方那一排的格子；base 的原樣放進格子，fill 轉過來補滿同一格。
    var known = [];
    G.halve(yang, a, h, b).forEach(function (p) {
      if (near(p.volume, 1 / 8)) {
        known.push({ poly: p, key: 'dC', color: C.blueDark, cell: 'c', label: '1', col: 0, slot: 0, origin: new V3(0, 0, 0) });
      } else if (near(p.volume, 1 / 16)) {
        var alongX = p.centroid.x > a2;
        known.push({
          poly: p, key: 'dK', color: C.blueLight, cell: alongX ? 'x' : 'z', label: '\\tfrac12', col: 0, slot: 1,
          origin: alongX ? new V3(a2, 0, 0) : null
        });
      }
    });
    G.halve(bie, a, h, b).forEach(function (p) {
      if (!near(p.volume, 1 / 16)) return;
      var upper = p.centroid.y > h2;
      known.push({
        poly: p, key: 'dR', color: C.redLight, cell: upper ? 'x' : 'z', label: '\\tfrac12', col: 1, slot: 0,
        origin: upper ? new V3(0, h2, b2) : null
      });
    });
    known.forEach(function (kn) {
      if (kn.origin) {
        kn.rel = kn.poly.centroid.clone().sub(kn.origin);
        kn.quat = new THREE.Quaternion();
        kn.scale = new V3(1, 1, 1);
      } else {
        var m = G.matchTransform(kn.poly, fill);
        kn.rel = fill.centroid.clone();
        kn.quat = m ? m.quat : new THREE.Quaternion();
        kn.scale = m ? m.scale : new V3(1, 1, 1);
      }
    });

    var gY = G.toGeometry(yang), gB = G.toGeometry(bie);
    this.geoms.push(gY, gB);
    known.forEach(function (kn) { kn.geom = G.toGeometry(kn.poly); self.geoms.push(kn.geom); });

    // 第 L 層各小塊的位置：每一塊留下兩個縮小一半的自己
    var offs = [[new V3()]];
    for (var L = 0; L < MAX; L++) {
      var s = Math.pow(0.5, L), next = [];
      offs[L].forEach(function (o) {
        next.push(o.clone().add(new V3(0, h2 * s, 0)));
        next.push(o.clone().add(new V3(a2 * s, 0, b2 * s)));
      });
      offs.push(next);
    }
    var colOff = function (col) { return new V3(col ? Dx : 0, 0, 0); };

    var add = function (geom, mat, L, home, scale, dir, extra) {
      var mesh = new THREE.Mesh(geom.faces, mat.face);
      mesh.add(new THREE.LineSegments(geom.edges, mat.edge));
      var hidden = JZ.hiddenEdges(geom.edges, 0, mat.hidden);
      mesh.add(hidden);
      mesh.scale.setScalar(scale);
      mesh.position.copy(home);
      mesh.visible = false;
      var obj = {
        mesh: mesh, hidden: hidden, mat: mat, L: L, home: home, dir: dir, base: scale, shift: new V3(),
        slotPos: null, quat: null, scaleTo: null, cell: 'r',
        from: new V3(), to: new V3(), qFrom: new THREE.Quaternion(), qTo: new THREE.Quaternion(),
        sFrom: new V3(1, 1, 1), sTo: new V3(1, 1, 1), sNow: new V3(1, 1, 1)
      };
      for (var k in extra) obj[k] = extra[k];
      mesh.userData.obj = obj;
      self.group.add(mesh);
      self.objs.push(obj);
      return obj;
    };

    for (L = 0; L <= MAX; L++) {
      var sc = Math.pow(0.5, L);
      offs[L].forEach(function (o, i) {
        [[gY, yang, 'uY', C.blue, 0], [gB, bie, 'uB', C.red, 1]].forEach(function (u) {
          var col = u[4];
          // 整塊的鱉臑一開始在原位，分開時才往右移
          var home = o.clone().addScaledVector(u[1].centroid, sc).add(L === 0 ? new V3() : colOff(col));
          var dir = new V3();
          if (L > 0) {
            var parent = colOff(col).add(offs[L - 1][i >> 1]).addScaledVector(u[1].centroid, sc * 2);
            dir = home.clone().sub(parent);
          }
          var obj = add(u[0], self._mat(u[2], L, u[3]), L, home, sc, dir, {});
          if (L === 0 && col) obj.shift = colOff(1);
          if (L === 0) (col ? (self.wholeB = obj) : (self.wholeY = obj));
        });
      });
      if (L === 0) continue;
      var ps = Math.pow(0.5, L - 1), w = a2 * ps, step = w + sp * ps;
      offs[L - 1].forEach(function (o, i) {
        known.forEach(function (kn) {
          var src = kn.col ? bie : yang;
          var home = colOff(kn.col).add(o).addScaledVector(kn.poly.centroid, ps);
          var parent = colOff(kn.col).add(o).addScaledVector(src.centroid, ps);
          var slot = kn.col ? i : 2 * i + kn.slot;
          var corner = new V3((kn.col ? redX : blueX) + slot * step, rowY[L], b2 - b2 * ps / 2);
          add(kn.geom, self._mat(kn.key, L, kn.color), L, home, ps, home.clone().sub(parent), {
            cell: kn.cell, label: kn.label,
            slotPos: corner.addScaledVector(kn.rel, ps), quat: kn.quat, scaleTo: kn.scale
          });
          // 搬走之後原位留下的淡影，看得出剩下的佔原本多少
          add(kn.geom, self._mat('g' + kn.key, L, kn.color), L, home, ps, new V3(), { twin: true });
        });
      });
    }

    // 中分的三個平面，左右兩欄各一組
    var fillMat = new THREE.MeshBasicMaterial({ color: C.yellow, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    var line = new THREE.LineBasicMaterial({ color: C.yellow, transparent: true, opacity: 0 });
    var pg = new THREE.Group();
    var quad = function (wd, ht, rx, ry, pos) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(wd * 1.12, ht * 1.12), fillMat);
      m.rotation.set(rx, ry, 0);
      m.position.copy(pos);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), line));
      pg.add(m);
    };
    [0, Dx].forEach(function (x) {
      var c = new V3(x + a2, h2, b2);
      quad(a, b, -Math.PI / 2, 0, c);
      quad(b, h, 0, Math.PI / 2, c);
      quad(a, h, 0, 0, c);
    });
    pg.visible = false;
    pg.renderOrder = 10;
    this.group.add(pg);
    this.planes = { group: pg, fill: fillMat, line: line, op: 0 };

    // 標籤。pos 可以是固定位置，或依步驟決定位置的函式。
    var label = function (html, when, follow, pos, cls) {
      self.labels.push({ label: self.viewer.addLabel(html, cls), when: when, follow: follow, pos: pos, pFrom: new V3(), pTo: new V3() });
    };
    var headY = function () { return capY; };
    label('陽馬（藍）', 'head', null, function (st) { return new V3(a2, headY(st), b2); }, 'head');
    label('鱉臑（紅）', 'head', null, function (st) { return new V3(Dx + a2, headY(st), b2); }, 'head');
    this.objs.forEach(function (o) { if (o.L === 1 && o.mat.known) label(U.tex(o.label), 'frac', o, null, 'big'); });
    var capY = Math.max(towerTop, h) + h * 0.25;
    label('會算的（拼成小方）', 'stack', null, new V3((blueX + redX + a2) / 2, capY, b2), 'head');
    label(U.tex('1+\\tfrac12+\\tfrac12=2'), 'tally', null, new V3(blueX + a2, h2 + h * 0.2, b2), 'dim');
    label(U.tex('\\tfrac12+\\tfrac12=1'), 'tally', null, new V3(redX + a2 / 2, h2 + h * 0.2, b2), 'dim');
    label('2 ： 1', 'ratio', null, new V3((blueX + a + redX) / 2, capY + h * 0.3, b2), 'big');
    label('2 個小陽馬', 'rest', null, new V3(a2, h * 0.5, b2), '');
    label('2 個小鱉臑', 'rest', null, new V3(Dx + a2, h * 0.5, b2), '');
    this.labels.forEach(function (l) { l.label.el.style.display = self.active ? '' : 'none'; });

    this.dims = { a: a, h: h, b: b };
    this.state = null;
    this.goTo(this.step, false);
  };

  // ---------- 步驟切換 ----------
  Limit.prototype._target = function (o, st) {
    if (o.slotPos && st.known[o.L]) {
      o.to.copy(o.slotPos);
      o.qTo.copy(o.quat);
      o.sTo.copy(o.scaleTo);
    } else {
      o.to.copy(o.home).addScaledVector(o.dir, st.k[o.L]).addScaledVector(o.shift, st.sep);
      o.qTo.identity();
      o.sTo.set(1, 1, 1);
    }
  };

  Limit.prototype.goTo = function (step, animate) {
    var self = this;
    step = Math.max(0, Math.min(STEPS.length - 1, step));
    var prev = this.state, st = stateOf(step);
    this.step = step;
    this.state = st;
    if (this._tween) this._tween.dead = true;

    this.objs.forEach(function (o) {
      o.from.copy(o.mesh.position);
      o.qFrom.copy(o.mesh.quaternion);
      o.sFrom.copy(o.sNow);
      self._target(o, st);
    });
    this.mats.forEach(function (m) {
      m.from = m.op;
      m.to = (m.ghost ? st.g : m.known ? st.d : st.u)[m.L];
    });
    var pl = this.planes;
    pl.from = pl.op; pl.to = st.planes;
    var tags = ' ' + st.labels + ' ';
    this.labels.forEach(function (l) {
      l.from = l.label.opacity;
      l.to = tags.indexOf(' ' + l.when + ' ') >= 0 ? 1 : 0;
      l.pFrom.copy(l.label.pos);
      if (l.pos) l.pTo.copy(typeof l.pos === 'function' ? l.pos(st) : l.pos);
      if (!l.from) l.pFrom.copy(l.pTo);
    });

    var apply = function (t) {
      self.mats.forEach(function (m) {
        m.op = m.from + (m.to - m.from) * t;
        m.face.opacity = m.op;
        m.face.depthWrite = m.op > 0.5;
        m.edge.opacity = Math.min(0.85, m.op * 2.2);
        // 實心的棊才畫被擋住的稜線；淡化的本來就看得穿
        m.hidden.opacity = m.op > 0.5 ? 0.2 * m.op : 0;
      });
      self.objs.forEach(function (o) {
        var show = o.mat.op > 0.01;
        o.mesh.visible = show;
        o.hidden.visible = o.mat.op > 0.5;
        if (!show && t < 1) return;
        o.mesh.position.lerpVectors(o.from, o.to, t);
        o.mesh.quaternion.slerpQuaternions(o.qFrom, o.qTo, t);
        o.sNow.lerpVectors(o.sFrom, o.sTo, t);
        o.mesh.scale.copy(o.sNow).multiplyScalar(o.base);
      });
      pl.op = pl.from + (pl.to - pl.from) * t;
      pl.fill.opacity = pl.op * 0.13;
      pl.line.opacity = pl.op * 0.9;
      pl.group.visible = pl.op > 0.01;
      self.labels.forEach(function (l) {
        l.label.opacity = l.from + (l.to - l.from) * t;
        if (l.follow) l.label.pos.copy(l.follow.mesh.position);
        else l.label.pos.lerpVectors(l.pFrom, l.pTo, t);
      });
    };
    if (animate) this._tween = this.viewer.tween(1.6, apply);
    else apply(1);

    if (!prev || prev.view !== st.view) this.frame(animate);
    this._updateDiagram();
    this._updateLoop();
    this._updateUI();
  };

  Limit.prototype.next = function () { this.goTo(this.step + 1, true); };
  Limit.prototype.prev = function () { this.goTo(this.step - 1, true); };

  // 依步驟對準：只看塹堵、看左右兩欄、或連上方排好的棊一起看
  Limit.prototype.frame = function (animate) {
    if (!this.layout) return;
    var d = this.dims, lay = this.layout, view = this.state ? this.state.view : 'whole';
    var lo = new V3(0, 0, 0), hi = new V3(d.a, d.h, d.b);
    if (view !== 'whole') { hi.x = lay.right; hi.y = Math.max(d.h, lay.top) + d.h * 0.7; }
    var box = new THREE.Box3(lo, hi);
    this.viewer.frame(box.getCenter(new V3()), box.getSize(new V3()).length() * (view === 'whole' ? 0.62 : 0.34), animate);
  };

  // ---------- 上方的循環圖 ----------
  Limit.prototype._buildLoop = function () {
    var svg = $('lm-loop-svg');
    var el = function (name, attrs, parent) {
      var e = document.createElementNS(SVG, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(e);
      return e;
    };
    var tri = function (g, x0, x1, y0, y1, cls, apexX) {
      el('polygon', { points: [x0, y1, x1, y1, apexX === undefined ? (x0 + x1) / 2 : apexX, y0].join(' '), 'class': cls }, g);
    };
    var defs = el('defs', {});
    var mk = el('marker', { id: 'lm-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', 'class': 'lp-head' }, mk);

    var X = [70, 210, 350, 490], Y = 62;
    var names = ['陽馬 ＋ 鱉臑', '從正中切開', '會算的 2 : 1', '剩下的縮小一半'];
    this.loopNodes = X.map(function (x, i) {
      var g = el('g', { 'class': 'lp-node', transform: 'translate(' + x + ',' + Y + ')' });
      el('rect', { x: -56, y: -30, width: 112, height: 76, rx: 8, 'class': 'lp-box' }, g);
      var icon = el('g', { transform: 'translate(0,-6)' }, g);
      if (i === 0 || i === 1) {
        tri(icon, -30, -4, -18, 16, 'lp-blue', -26);
        tri(icon, 4, 30, -18, 16, 'lp-red', 8);
        if (i === 1) {
          el('line', { x1: -36, y1: 0, x2: 36, y2: 0, 'class': 'lp-cut' }, icon);
          el('line', { x1: -17, y1: -22, x2: -17, y2: 20, 'class': 'lp-cut' }, icon);
          el('line', { x1: 17, y1: -22, x2: 17, y2: 20, 'class': 'lp-cut' }, icon);
        }
      } else if (i === 2) {
        el('rect', { x: -34, y: -8, width: 16, height: 16, 'class': 'lp-blue' }, icon);
        el('rect', { x: -16, y: -8, width: 16, height: 16, 'class': 'lp-blue' }, icon);
        el('rect', { x: 10, y: -8, width: 16, height: 16, 'class': 'lp-red' }, icon);
      } else {
        tri(icon, -32, -20, -2, 14, 'lp-blue', -30);
        tri(icon, -17, -5, -2, 14, 'lp-blue', -15);
        tri(icon, 5, 17, -2, 14, 'lp-red', 7);
        tri(icon, 20, 32, -2, 14, 'lp-red', 22);
      }
      el('text', { x: 0, y: 34, 'class': 'lp-text' }, g).textContent = names[i];
      return g;
    });
    for (var i = 0; i < 3; i++) {
      el('line', { x1: X[i] + 58, y1: Y, x2: X[i + 1] - 60, y2: Y, 'class': 'lp-arrow', 'marker-end': 'url(#lm-arrow)' });
    }
    // 回到開頭的弧線
    el('path', { d: 'M ' + X[3] + ' ' + (Y - 32) + ' C ' + X[3] + ' 4, ' + X[0] + ' 4, ' + X[0] + ' ' + (Y - 34), 'class': 'lp-arrow lp-back', 'marker-end': 'url(#lm-arrow)' });
    this.loopBack = el('text', { x: (X[0] + X[3]) / 2, y: 26, 'class': 'lp-text lp-back-text' });
    this.loopBack.textContent = '放大 2 倍，又是同一個問題 → 再一輪';
  };

  Limit.prototype._updateLoop = function () {
    if (!this.loopNodes) this._buildLoop();
    var lp = STEPS[this.step].loop, quarter = function (n) {
      return n === 0 ? '整個塹堵' : U.tex('\\tfrac{1}{' + Math.pow(4, n) + '}') + ' 個塹堵';
    };
    this.loopNodes.forEach(function (g, i) { g.classList.toggle('on', lp.nodes.indexOf(i + 1) >= 0); });
    $('lm-round').textContent = lp.round ? '↻ 第 ' + lp.round + ' 輪' : '↻ 一直循環下去';
    var parts = [];
    if (lp.cut === null) parts.push('剩下的趨近於 0');
    else {
      parts.push('這一輪要切：' + quarter(lp.cut));
      if (lp.left) parts.push('切完剩下：' + quarter(lp.left));
    }
    $('lm-cut').innerHTML = parts.join('<span class="sep">｜</span>');
  };

  Limit.prototype.setPlaying = function (on) {
    var self = this;
    clearInterval(this._timer);
    this.playing = on;
    $('lm-play').textContent = on ? '暫停' : '播放';
    $('lm-play').classList.toggle('on', on);
    if (!on) return;
    if (this.step >= STEPS.length - 1) this.goTo(0, true);
    this._timer = setInterval(function () {
      if (self.step >= STEPS.length - 1) return self.setPlaying(false);
      self.next();
    }, 3800);
  };

  // ---------- 四分圖 ----------
  Limit.prototype._buildDiagram = function () {
    var svg = $('lm-svg');
    var el = function (name, attrs, parent) {
      var e = document.createElementNS(SVG, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(e);
      return e;
    };
    var poly = function (pts, cls, parent) { return el('polygon', { points: pts.join(' '), 'class': cls }, parent); };
    el('rect', { x: 0, y: 0, width: 100, height: 100, 'class': 'dg-bg' });
    this.dgLevels = [];
    for (var L = 1; L <= MAX; L++) {
      var s = 100 * Math.pow(0.5, L - 1), x = 100 - s, hs = s / 2;
      var g = el('g', { 'class': 'dg-level', 'stroke-width': Math.max(0.06, 0.5 * Math.pow(0.5, L - 1)) });
      var c = el('g', { 'data-cell': 'c' }, g);
      poly([x, x, x + hs, x, x + hs, x + hs, x, x + hs], 'dg-blue', c);
      var cx = el('g', { 'data-cell': 'x' }, g);
      poly([x + hs, x, x + s, x, x + hs, x + hs], 'dg-blue', cx);
      poly([x + s, x, x + s, x + hs, x + hs, x + hs], 'dg-red', cx);
      var cz = el('g', { 'data-cell': 'z' }, g);
      poly([x, x + hs, x + hs, x + hs, x, x + s], 'dg-blue', cz);
      poly([x + hs, x + hs, x + hs, x + s, x, x + s], 'dg-red', cz);
      if (L === 1) {
        el('text', { x: 25, y: 27, 'class': 'dg-text' }, g).textContent = '立方';
        el('text', { x: 66, y: 19, 'class': 'dg-text' }, g).textContent = '塹堵';
        el('text', { x: 86, y: 38, 'class': 'dg-text' }, g).textContent = '塹堵';
        el('text', { x: 16, y: 69, 'class': 'dg-text' }, g).textContent = '塹堵';
        el('text', { x: 36, y: 88, 'class': 'dg-text' }, g).textContent = '塹堵';
      }
      this.dgLevels.push(g);
    }
    this.dgRest = el('rect', { 'class': 'dg-rest' });
    this.dgRestText = el('text', { 'class': 'dg-text dg-rest-text' });
  };

  Limit.prototype._updateDiagram = function () {
    var st = this.state, n = st.lv, d = JZ.dims;
    this.dgLevels.forEach(function (g, i) { g.classList.toggle('on', i < n); });
    var s = 100 * Math.pow(0.5, n), x = 100 - s;
    var r = this.dgRest;
    r.style.x = x + 'px'; r.style.y = x + 'px';
    r.style.width = s + 'px'; r.style.height = s + 'px';
    r.style.strokeWidth = Math.max(0.25, 1.2 * Math.pow(0.6, n)) + 'px';
    r.classList.toggle('off', st.final);
    var t = this.dgRestText;
    t.setAttribute('x', x + s / 2); t.setAttribute('y', x + s / 2 + (n ? 2 : 3));
    t.textContent = n === 0 ? '塹堵（未定）' : '餘';
    t.style.fontSize = (n === 0 ? 7 : 7 * Math.pow(0.62, n - 1)) + 'px';
    t.classList.toggle('off', n > 3 || st.final);

    var rest = st.final ? 0 : Math.pow(0.25, n), done = 1 - rest;
    $('lm-bar-blue').style.width = (done * 2 / 3 * 100) + '%';
    $('lm-bar-red').style.width = (done / 3 * 100) + '%';

    var q = d.a * d.h * d.b / 2, den = Math.pow(4, n);
    var rows = [];
    if (st.final) {
      rows.push(['陽馬', U.tex('=\\tfrac{1}{3}') + ' 廣袤高 ' + U.tex('=' + U.numTex(q * 2 / 3))]);
      rows.push(['鱉臑', U.tex('=\\tfrac{1}{6}') + ' 廣袤高 ' + U.tex('=' + U.numTex(q / 3))]);
      rows.push(['陽馬 : 鱉臑', U.tex('=2:1')]);
    } else {
      rows.push(['已定', n === 0 ? U.tex('=0') : U.tex('=1-\\left(\\tfrac{1}{4}\\right)^{' + n + '}=\\tfrac{' + (den - 1) + '}{' + den + '}')]);
      rows.push(['未定', n === 0 ? U.tex('=1') : U.tex('=\\tfrac{1}{' + den + '}')]);
      rows.push(['已定之中　藍 : 紅', n === 0 ? '—' : U.tex('=2:1')]);
    }
    $('lm-rows').innerHTML = rows.map(function (row) {
      return '<div class="row"><span>' + row[0] + '</span><span>' + row[1] + '</span></div>';
    }).join('');
    $('lm-vol-blue').innerHTML = U.tex(U.numTex(q * done * 2 / 3, 6));
    $('lm-vol-red').innerHTML = U.tex(U.numTex(q * done / 3, 6));
    $('lm-vol-rest').innerHTML = U.tex(U.numTex(q * rest, 6));
  };

  Limit.prototype._hover = function (obj) {
    var svg = $('lm-svg');
    Array.prototype.forEach.call(svg.querySelectorAll('.hl'), function (e) { e.classList.remove('hl'); });
    if (!obj) return;
    if (obj.mat.known) {
      var g = this.dgLevels[obj.L - 1];
      if (g.classList.contains('on')) g.querySelector('[data-cell="' + obj.cell + '"]').classList.add('hl');
    } else if (obj.L === this.state.lv && !this.state.final) {
      this.dgRest.classList.add('hl');
    }
  };

  // ---------- 介面 ----------
  Limit.prototype._updateUI = function () {
    var step = STEPS[this.step], d = JZ.dims, math = '';
    if (this.step === 0) math = '塹堵 ' + U.tex('=\\tfrac{1}{2}') + ' 廣袤高 ' + U.tex('=' + U.numTex(d.a * d.h * d.b / 2)) + ' 立方尺';
    if (this.state.final) {
      math = '陽馬 ' + U.tex('=\\tfrac{1}{3}') + ' 廣袤高 ' + U.tex('=' + U.numTex(d.a * d.h * d.b / 3)) +
        '　　鱉臑 ' + U.tex('=\\tfrac{1}{6}') + ' 廣袤高 ' + U.tex('=' + U.numTex(d.a * d.h * d.b / 6));
    }
    $('lm-slider').max = STEPS.length - 1;
    $('lm-slider').value = this.step;
    $('lm-title').textContent = (this.step + 1) + ' / ' + STEPS.length + '　' + step.title;
    $('lm-prev').disabled = this.step === 0;
    $('lm-next').disabled = this.step === STEPS.length - 1;
    if (this.active) JZ.caption.set(step.quote, step.plain, math);
  };

  Limit.prototype._bindUI = function () {
    var self = this;
    $('lm-prev').addEventListener('click', function () { self.setPlaying(false); self.prev(); });
    $('lm-next').addEventListener('click', function () { self.setPlaying(false); self.next(); });
    $('lm-play').addEventListener('click', function () { self.setPlaying(!self.playing); });
    $('lm-slider').addEventListener('input', function () { self.setPlaying(false); self.goTo(+this.value, true); });
  };

  Limit.prototype.setActive = function (on) {
    this.active = on;
    this.group.visible = on;
    this.labels.forEach(function (l) { l.label.el.style.display = on ? '' : 'none'; });
    if (!on) this.setPlaying(false);
    else this._updateUI();
  };

  JZ.Limit = Limit;
  JZ.Limit.STEPS = STEPS;
})(window.JZ);
