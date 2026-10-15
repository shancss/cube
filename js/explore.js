// 分頁一「立體與拆解」：九章拆解、分開拼合、拖動、自由切割、體積。
window.JZ = window.JZ || {};
(function (JZ) {
  'use strict';
  var V3 = THREE.Vector3, C = JZ.colors, G = JZ.geo, U = JZ.util;
  var $ = function (id) { return document.getElementById(id); };

  var PRESETS = {
    box: {
      k: 0,
      quote: '假令廣袤各一尺，高一尺，相乘之，得立方積一尺。',
      plain: '立方（長方體）：體積 ＝ 廣 × 袤 × 高。',
      build: function (a, h, b) { return [{ poly: G.box(a, h, b), name: '立方', color: C.grey }]; }
    },
    qiandu: {
      k: 0,
      quote: '術曰：廣袤相乘，以高乘之，二而一。',
      plain: '塹堵：立方沿對角面斜切一半得到的三角柱。',
      build: function (a, h, b) { return [{ poly: G.qiandu(a, h, b), name: '塹堵', color: C.green }]; }
    },
    yangma: {
      k: 0,
      quote: '術曰：廣袤相乘，以高乘之，三而一。',
      plain: '陽馬：底面是長方形、頂點在一個角正上方的四角錐。',
      build: function (a, h, b) { return [{ poly: G.yangma(a, h, b), name: '陽馬', color: C.blue }]; }
    },
    bienao: {
      k: 0,
      quote: '術曰：廣袤相乘，以高乘之，六而一。',
      plain: '鱉臑：四個面都是直角三角形的四面體。',
      build: function (a, h, b) { return [{ poly: G.bienao(a, h, b), name: '鱉臑', color: C.red }]; }
    },
    box2: {
      k: 0.3,
      quote: '邪解立方得兩塹堵。雖復隨方，亦爲塹堵，故二而一。',
      plain: '立方斜切一刀，得到兩個一樣的塹堵，所以塹堵是立方的一半。',
      build: function (a, h, b) {
        var P = G.planes(a, h, b), parts = G.split(G.box(a, h, b), P.p1.n, P.p1.d);
        return [
          { poly: parts[1], name: '塹堵', color: C.green },
          { poly: parts[0], name: '塹堵', color: C.teal }
        ];
      }
    },
    qd2: {
      k: 0.3,
      quote: '邪解塹堵，其一爲陽馬，一爲鱉臑。陽馬居二，鱉臑居一，不易之率也。',
      plain: '塹堵再斜切一刀，分成陽馬和鱉臑，體積恆為 2 : 1。證明在「劉徽的極限」。',
      build: function (a, h, b) {
        return [
          { poly: G.yangma(a, h, b), name: '陽馬', color: C.blue },
          { poly: G.bienao(a, h, b), name: '鱉臑', color: C.red }
        ];
      }
    },
    box3: {
      k: 0.3,
      quote: '合兩鱉臑成一陽馬，合三陽馬而成一立方，故三而一。',
      plain: '三個陽馬拼成一個立方。廣袤高相等時三個全等；不相等時形狀各異，體積是否仍相等就要靠極限論證。',
      build: function (a, h, b) {
        var P = G.planes(a, h, b), bx = G.box(a, h, b);
        return [
          { poly: G.yangma(a, h, b), name: '陽馬', color: C.blue },
          { poly: G.keep(G.keep(bx, P.p1.n, P.p1.d, true), P.p3.n, P.p3.d, true), name: '陽馬', color: C.green },
          { poly: G.keep(G.keep(bx, P.p2.n, P.p2.d, true), P.p3.n, P.p3.d, false), name: '陽馬', color: C.gold }
        ];
      }
    },
    ym2: {
      k: 0.3,
      quote: '中破陽馬得兩鱉臑。',
      plain: '陽馬沿對角面切開，得到兩個鱉臑，所以鱉臑是陽馬的一半。',
      build: function (a, h, b) {
        var P = G.planes(a, h, b), parts = G.split(G.yangma(a, h, b), P.p3.n, P.p3.d);
        return [
          { poly: parts[0], name: '鱉臑', color: C.red },
          { poly: parts[1], name: '鱉臑', color: C.gold }
        ];
      }
    },
    box6: {
      k: 0.35,
      quote: '悉割陽馬，凡爲六鱉臑。觀其割分，則體勢互通，蓋易了也。',
      plain: '三個陽馬各切成兩半，立方共分成六個鱉臑，每個都是立方的六分之一。',
      build: function (a, h, b) {
        var P = G.planes(a, h, b), parts = [G.box(a, h, b)];
        ['p1', 'p2', 'p3'].forEach(function (k) { parts = G.splitAll(parts, P[k].n, P[k].d); });
        var palette = [C.red, C.gold, C.pink, C.blue, C.green, C.purple];
        return parts.map(function (poly, i) { return { poly: poly, name: '鱉臑', color: palette[i % palette.length] }; });
      }
    },

    // ---- 方亭：這一組的 a 是下方、b 是上方 ----
    fangting: {
      k: 0, family: 'ft', thumb: [3, 1.8, 1.3],
      quote: '術曰：上下方相乘，又各自乘，并之，以高乘之，三而一。',
      plain: '方亭：上下兩面都是正方形的方錐臺。',
      build: function (a, h, b) { return [{ poly: G.fangting(a, h, b), name: '方亭', color: C.gold }]; }
    },
    ft9: {
      k: 0.3, family: 'ft', thumb: [3, 1.8, 1.3],
      quote: '其用棊也，中央立方一，四面塹堵四，四角陽馬四。',
      plain: '方亭可以切成九塊已經會算的棊：中間 1 個立方，四邊 4 個塹堵，四角 4 個陽馬。',
      build: function (a, h, b) {
        return G.fangtingParts(a, h, b).map(function (p) { return { poly: p.poly, name: p.kind, color: KIND[p.kind] }; });
      }
    },
    ft27: {
      k: 0.22, family: 'ft', thumb: [3, 1.8, 1.3], noMarks: true, assemble: true,
      quote: '凡三品棊皆一而爲三。故三而一，得積尺。用棊之數：立方三，塹堵、陽馬各十二，凡二十七。',
      plain: '術文的三項各是一個方柱。切開後共有立方 3、塹堵 12、陽馬 12，正好是三個方亭的棊數，所以加起來要除以三。',
      quoteDone: '更差次之，而成方亭者三，驗矣。',
      plainDone: '把 27 塊棊重新排過，正好拼成三個一樣的方亭，所以三個方柱的體積加起來是方亭的三倍。',
      build: function (a, h, b) {
        return G.threePrisms(a, h, b).parts.map(function (p) {
          return { poly: p.poly, name: p.kind, color: KIND[p.kind], center: p.center };
        });
      },
      labels: function (a, h, b) {
        return G.threePrisms(a, h, b).boxes.map(function (bx) {
          return {
            html: bx.name + ' × 高 ' + U.tex('=' + U.numTex(bx.w * bx.l * h)),
            pos: new V3(bx.center.x, h + a * 0.42, bx.center.z)
          };
        });
      }
    }
  };
  var KIND = { '立方': C.grey, '塹堵': C.green, '陽馬': C.blue };

  function fangtingVolume(d) { return (d.a * d.b + d.a * d.a + d.b * d.b) * d.h / 3; }

  function Explore(viewer) {
    this.viewer = viewer;
    this.group = new THREE.Group();
    viewer.scene.add(this.group);
    this.pieces = [];
    this.selected = null;
    this.k = 0;
    this.presetId = 'qd2';
    this.cut = { on: false, tilt: 90, azim: 0, pos: 0 };
    this._buildCutPlane();
    this._bindUI();
    this._renderThumbs();
  }

  // 選單上的小縮圖：用固定比例把每個選項實際畫一次
  Explore.prototype._renderThumbs = function () {
    var size = 144, renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
    renderer.setPixelRatio(1);
    renderer.setSize(size, size, false);
    renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(camera);
    scene.add(new THREE.AmbientLight(0xffffff, 1.9));
    var sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(-1, 1.3, 0.6);
    sun.target.position.set(0, 0, -1);
    camera.add(sun);
    camera.add(sun.target);
    var theta = 0.62, phi = 1.12;
    var view = new V3(Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta));

    Array.prototype.forEach.call(document.querySelectorAll('#ex-panel [data-preset]'), function (btn) {
      var img = btn.querySelector('img'), preset = PRESETS[btn.getAttribute('data-preset')];
      if (!img) return;
      var t = preset.thumb || [1, 1.15, 1];
      var specs = preset.build(t[0], t[1], t[2]), group = new THREE.Group(), trash = [];
      var center = new V3(), total = 0, bounds = new THREE.Box3();
      specs.forEach(function (s) { center.addScaledVector(s.poly.centroid, s.poly.volume); total += s.poly.volume; });
      center.divideScalar(total);
      specs.forEach(function (s) {
        var g = G.toGeometry(s.poly);
        var mesh = new THREE.Mesh(g.faces, new THREE.MeshLambertMaterial({
          color: s.color, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
        }));
        var edges = new THREE.LineSegments(g.edges, new THREE.LineBasicMaterial({ color: C.white }));
        mesh.add(edges);
        mesh.position.copy(s.poly.centroid).addScaledVector(s.poly.centroid.clone().sub(s.center || center), preset.k ? 0.28 : 0);
        group.add(mesh);
        g.faces.computeBoundingBox();
        bounds.union(g.faces.boundingBox.clone().translate(mesh.position));
        trash.push(g.faces, g.edges, mesh.material, edges.material);
      });
      scene.add(group);
      var mid = bounds.getCenter(new V3()), radius = bounds.getSize(new V3()).length() / 2;
      camera.position.copy(mid).addScaledVector(view, radius / Math.sin(THREE.MathUtils.degToRad(15)));
      camera.lookAt(mid);
      renderer.render(scene, camera);
      img.src = renderer.domElement.toDataURL('image/png');
      scene.remove(group);
      trash.forEach(function (t) { t.dispose(); });
    });
    renderer.dispose();
    renderer.forceContextLoss();
  };

  Explore.prototype.mode = function () {
    var self = this;
    return {
      pickables: function () { return self.pieces.map(function (p) { return p.mesh; }); },
      canDrag: function () { return true; },
      onDrag: function (mesh, delta) {
        var piece = mesh.userData.piece;
        piece.off.add(delta);
        self._place(piece);
      },
      onClick: function (mesh) { self.select(mesh ? mesh.userData.piece : null); },
      onHover: function () {}
    };
  };

  // ---------- 建立 / 移除 ----------
  Explore.prototype._addPiece = function (spec, dir, off) {
    var g = G.toGeometry(spec.poly);
    var mesh = new THREE.Mesh(g.faces, new THREE.MeshLambertMaterial({
      color: spec.color, transparent: true, opacity: 0.9,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
    }));
    var edges = new THREE.LineSegments(g.edges, new THREE.LineBasicMaterial({ color: C.white, transparent: true, opacity: 0.85 }));
    mesh.add(edges);
    mesh.add(JZ.hiddenEdges(g.edges, 0.2));
    var piece = {
      poly: spec.poly, name: spec.name, color: spec.color,
      mesh: mesh, edges: edges,
      home: spec.poly.centroid.clone(), dir: dir, off: off
    };
    mesh.userData.piece = piece;
    this.group.add(mesh);
    this.pieces.push(piece);
    this._place(piece);
    return piece;
  };

  Explore.prototype._removePiece = function (piece) {
    this.group.remove(piece.mesh);
    piece.mesh.geometry.dispose();
    piece.mesh.material.dispose();
    piece.edges.geometry.dispose();
    piece.mesh.children.forEach(function (child) { child.material.dispose(); });
    this.pieces.splice(this.pieces.indexOf(piece), 1);
  };

  Explore.prototype._place = function (piece) {
    var pos = piece.mesh.position.copy(piece.home).addScaledVector(piece.dir, this.k);
    var asm = piece.asm;
    if (asm && this.asmT > 0) {
      // 要搬動的棊依序出發，各自沿一道弧線飛過去；其餘的只是原地收攏
      var t = asm.moved ? U.smooth(Math.max(0, Math.min(1, (this.asmT - asm.start) / asm.span))) : this.asmT;
      pos.lerp(asm.to.copy(asm.pos).addScaledVector(asm.dir, this.k), t);
      if (asm.moved) pos.y += Math.sin(Math.PI * t) * this.asmLift;
      piece.mesh.quaternion.identity().slerp(asm.quat, t);
      piece.mesh.scale.set(1, 1, 1).lerp(asm.scale, t);
    } else {
      piece.mesh.quaternion.identity();
      piece.mesh.scale.set(1, 1, 1);
    }
    pos.add(piece.off);
  };

  // 27 塊棊拼成三個方亭，或還原成三個方柱
  Explore.prototype.toggleAssemble = function () {
    var self = this, d = JZ.dims, preset = PRESETS[this.presetId];
    if (!preset.assemble) return;
    if (this.wasCut) return JZ.caption.flash('已經切割過了，請先按「全部重來」再拼。');
    if (!this.pieces[0].asm) {
      var tp = G.threePrisms(d.a, d.h, d.b), plan = G.planAssembly(tp.parts, d.a, d.h, d.b, tp.pitch);
      var movers = plan.filter(function (p) { return p && p.moved; }).length, n = 0;
      this.pieces.forEach(function (piece, i) {
        var p = plan[i];
        p.to = new V3();
        p.span = 0.38;
        p.start = p.moved ? (1 - p.span) * (n++) / Math.max(1, movers - 1) : 0;
        piece.asm = p;
      });
      this.asmStretched = plan.some(function (p) { return p.stretched; });
      this.asmLift = Math.max(d.h, d.a * 0.5) * 0.9;
    }
    this.asmOn = !this.asmOn;
    $('ex-assemble').textContent = this.asmOn ? '◀ 還原成三個方柱' : '▶ 拼成三個方亭';
    var from = this.asmT, to = this.asmOn ? 1 : 0;
    if (this._asmTween) this._asmTween.dead = true;
    // 用等速推進，各塊自己的緩動在 _place 裡
    var start = performance.now(), dur = 6500 * Math.abs(to - from);
    this._asmTween = this.viewer.tween(dur / 1000, function () {
      var t = Math.min(1, (performance.now() - start) / Math.max(1, dur));
      self.asmT = from + (to - from) * t;
      self._placeAll();
    }, function () { self.asmT = to; self._placeAll(); });

    var vol = U.tex('=' + U.numTex(fangtingVolume(d)));
    var names = preset.labels(d.a, d.h, d.b);
    this.labels.forEach(function (l, i) { l.el.innerHTML = self.asmOn ? '方亭 ' + vol : names[i].html; });
    this.select(null);
  };

  Explore.prototype._placeAll = function () {
    var self = this;
    this.pieces.forEach(function (p) { self._place(p); });
  };

  Explore.prototype.setPreset = function (id, animate) {
    var self = this, preset = PRESETS[id];
    this.presetId = id;
    // 方亭用自己的一組尺寸（下方、上方、高），先換好再建
    if (this.active && JZ.syncDims) JZ.syncDims();
    var d = JZ.dims;
    this.selected = null;
    while (this.pieces.length) this._removePiece(this.pieces[0]);
    if (this._kTween) this._kTween.dead = true;
    if (this._asmTween) this._asmTween.dead = true;
    this._clearLabels();
    this.asmT = 0;
    this.asmOn = false;
    this.wasCut = false;
    $('ex-asm-row').hidden = !preset.assemble;
    $('ex-assemble').textContent = '▶ 拼成三個方亭';

    var specs = preset.build(d.a, d.h, d.b);
    var center = new V3(), total = 0, bounds = new THREE.Box3();
    specs.forEach(function (s) {
      center.addScaledVector(s.poly.centroid, s.poly.volume);
      total += s.poly.volume;
      s.poly.faces.forEach(function (f) { f.forEach(function (p) { bounds.expandByPoint(p); }); });
    });
    center.divideScalar(total);
    this.k = 0;
    // 有自己中心的棊（三個方柱）各自往外散開
    specs.forEach(function (s) { self._addPiece(s, s.poly.centroid.clone().sub(s.center || center), new V3()); });

    this.diag = bounds.getSize(new V3()).length();
    this.center = bounds.getCenter(new V3());
    // 換成大小或位置不同的立體時，鏡頭跟著重新對準
    var was = this._framed;
    this._framed = { center: this.center.clone(), diag: this.diag };
    if (this.active && was && (was.center.distanceTo(this.center) > 1e-6 * this.diag || Math.abs(was.diag - this.diag) > 1e-6 * this.diag)) {
      this.frame(false);      // 直接對準，不做拉近拉遠的動畫
    }
    if (preset.labels) {
      preset.labels(d.a, d.h, d.b).forEach(function (l) {
        var label = self.viewer.addLabel(l.html, 'dim');
        label.pos.copy(l.pos);
        label.opacity = 1;
        label.el.style.display = self.active ? '' : 'none';
        self.labels.push(label);
      });
    }
    var setK = function (k) {
      self.k = k;
      $('ex-explode').value = Math.round(k / 0.8 * 100);
      self._placeAll();
    };
    if (animate && preset.k) this._kTween = this.viewer.tween(1.4, function (t) { setK(preset.k * t); });
    else setK(preset.k);

    Array.prototype.forEach.call(document.querySelectorAll('#ex-panel [data-preset]'), function (btn) {
      btn.classList.toggle('on', btn.getAttribute('data-preset') === id);
    });
    this._updateCutPlane();
    this._refresh();
    if (this.active) JZ.updateMarks();
  };

  Explore.prototype.rebuild = function () {
    this.setPreset(this.presetId, false);
  };

  Explore.prototype._clearLabels = function () {
    var self = this;
    (this.labels || []).forEach(function (l) { self.viewer.removeLabel(l); });
    this.labels = [];
  };

  Explore.prototype.isFangting = function () { return PRESETS[this.presetId].family === 'ft'; };
  Explore.prototype.noMarks = function () { return !!PRESETS[this.presetId].noMarks; };

  Explore.prototype.frame = function (animate) {
    this.viewer.frame(this.center, this.diag * 0.62, animate);
  };

  // ---------- 選取與體積 ----------
  Explore.prototype.select = function (piece) {
    this.selected = piece;
    this._refresh();
  };

  Explore.prototype._volumeHtml = function (v) {
    var d = JZ.dims;
    if (this.isFangting()) {
      return U.tex(U.numTex(v)) + ' 立方尺 ＝ ' + U.tex(U.ratioTex(v / fangtingVolume(d))) + ' × 方亭';
    }
    return U.tex(U.numTex(v)) + ' 立方尺 ＝ ' + U.tex(U.ratioTex(v / (d.a * d.h * d.b))) + ' × 廣袤高';
  };

  Explore.prototype._refresh = function () {
    var self = this, d = JZ.dims, preset = PRESETS[this.presetId];
    this.pieces.forEach(function (p) {
      var on = p === self.selected;
      p.edges.material.color.setHex(on ? C.yellow : C.white);
      p.edges.material.opacity = on ? 1 : 0.85;
    });

    var list = $('ex-list');
    list.innerHTML = '';
    var swatch = function (p) { return '<i style="background:#' + new THREE.Color(p.color).getHexString() + '"></i>'; };
    if (this.pieces.length > 9) {
      // 塊數多時，同名同體積的合併成一列
      var groups = [];
      this.pieces.forEach(function (p) {
        for (var i = 0; i < groups.length; i++) {
          if (groups[i].p.name === p.name && Math.abs(groups[i].p.poly.volume - p.poly.volume) < 1e-6 * p.poly.volume) {
            groups[i].n++;
            return;
          }
        }
        groups.push({ p: p, n: 1 });
      });
      groups.slice(0, 14).forEach(function (g) {
        var row = document.createElement('div');
        row.className = 'vol-row';
        row.innerHTML = swatch(g.p) + '<span>' + g.p.name + ' × ' + g.n + '</span><span class="num">各 ' +
          U.tex(U.numTex(g.p.poly.volume)) + '</span>';
        list.appendChild(row);
      });
    } else {
      this.pieces.forEach(function (p) {
        var row = document.createElement('button');
        row.className = 'vol-row' + (p === self.selected ? ' on' : '');
        row.innerHTML = swatch(p) + '<span>' + p.name + '</span><span class="num">' + U.tex(U.numTex(p.poly.volume)) + '</span>';
        row.onclick = function () { self.select(p === self.selected ? null : p); };
        list.appendChild(row);
      });
    }

    var quote = preset.quote, plain = preset.plain;
    if (this.asmOn) {
      quote = preset.quoteDone;
      plain = preset.plainDone + (this.asmStretched ? '這組尺寸下角上的陽馬形狀不同，動畫裡讓它變形成同體積的陽馬。' : '');
    }
    var math;
    if (this.selected) {
      math = this.selected.name + '　體積 ' + this._volumeHtml(this.selected.poly.volume);
    } else if (this.isFangting()) {
      var n = U.numTex;
      math = U.tex('(\\text{上方}\\times\\text{下方}+\\text{下方}^2+\\text{上方}^2)\\times\\text{高}\\div 3 = (' +
        n(d.a * d.b) + '+' + n(d.a * d.a) + '+' + n(d.b * d.b) + ')\\times' + n(d.h) + '\\div 3 = ' + n(fangtingVolume(d)));
    } else {
      math = U.tex('\\text{廣}\\times\\text{袤}\\times\\text{高} = ' + U.numTex(d.a) + '\\times' + U.numTex(d.b) + '\\times' + U.numTex(d.h) +
        ' = ' + U.numTex(d.a * d.b * d.h)) + '　點選任一塊看它的體積';
    }
    if (this.active) JZ.caption.set(quote, plain, math);
  };

  // ---------- 自由切割 ----------
  Explore.prototype._buildCutPlane = function () {
    var g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
      color: C.yellow, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false
    })));
    var outline = new THREE.BufferGeometry().setFromPoints([
      new V3(-0.5, -0.5, 0), new V3(0.5, -0.5, 0), new V3(0.5, 0.5, 0), new V3(-0.5, 0.5, 0)
    ]);
    g.add(new THREE.LineLoop(outline, new THREE.LineBasicMaterial({ color: C.yellow })));
    g.visible = false;
    g.renderOrder = 10;
    this.cutMesh = g;
    this.viewer.scene.add(g);
  };

  Explore.prototype._cutNormal = function () {
    var phi = THREE.MathUtils.degToRad(this.cut.tilt), th = THREE.MathUtils.degToRad(this.cut.azim);
    return new V3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)).normalize();
  };

  Explore.prototype._updateCutPlane = function () {
    if (!this.center) return;
    var n = this._cutNormal(), g = this.cutMesh;
    g.visible = this.cut.on && this.active;
    g.scale.setScalar(this.diag * 0.95);
    g.quaternion.setFromUnitVectors(new V3(0, 0, 1), n);
    g.position.copy(this.center).addScaledVector(n, this.cut.pos / 100 * this.diag / 2);
  };

  Explore.prototype.doCut = function () {
    if (this.asmT > 0) return JZ.caption.flash('請先還原成三個方柱再切割。');
    this.wasCut = true;
    var self = this, n = this._cutNormal(), d = n.dot(this.cutMesh.position);
    var targets = this.selected ? [this.selected] : this.pieces.slice();
    var gap = this.diag * 0.04, moved = [];
    targets.forEach(function (piece) {
      var disp = piece.mesh.position.clone().sub(piece.home);
      var parts = G.split(piece.poly, n, d - n.dot(disp));
      if (!parts[0] || !parts[1]) return;
      self._removePiece(piece);
      parts.forEach(function (poly, i) {
        var color = i === 0 ? piece.color : new THREE.Color(piece.color).lerp(new THREE.Color(C.white), 0.4).getHex();
        var np = self._addPiece({ poly: poly, name: '切塊', color: color }, piece.dir.clone(), piece.off.clone());
        moved.push({ piece: np, from: np.off.clone(), sign: i === 0 ? 1 : -1 });
      });
    });
    this.selected = null;
    this._refresh();
    if (!moved.length) {
      JZ.caption.flash('切割平面沒有碰到任何一塊，調整位置後再試。');
      return;
    }
    this.viewer.tween(0.7, function (t) {
      moved.forEach(function (m) {
        if (self.pieces.indexOf(m.piece) < 0) return;
        m.piece.off.copy(m.from).addScaledVector(n, m.sign * gap * t);
        self._place(m.piece);
      });
    });
  };

  // ---------- 介面 ----------
  Explore.prototype._bindUI = function () {
    var self = this;
    Array.prototype.forEach.call(document.querySelectorAll('#ex-panel [data-preset]'), function (btn) {
      btn.addEventListener('click', function () { self.setPreset(btn.getAttribute('data-preset'), true); });
    });
    $('ex-explode').addEventListener('input', function () {
      if (self._kTween) self._kTween.dead = true;
      self.k = this.value / 100 * 0.8;
      self._placeAll();
    });
    $('ex-home').addEventListener('click', function () {
      var from = self.pieces.map(function (p) { return p.off.clone(); });
      var pieces = self.pieces.slice();
      self.viewer.tween(0.8, function (t) {
        pieces.forEach(function (p, i) {
          p.off.copy(from[i]).multiplyScalar(1 - t);
          self._place(p);
        });
      });
    });
    $('ex-restart').addEventListener('click', function () { self.setPreset(self.presetId, true); });
    $('ex-assemble').addEventListener('click', function () { self.toggleAssemble(); });

    $('ex-cut-toggle').addEventListener('click', function () {
      self.cut.on = !self.cut.on;
      this.classList.toggle('on', self.cut.on);
      $('ex-cut-controls').hidden = !self.cut.on;
      self._updateCutPlane();
    });
    var sync = function () {
      $('ex-cut-tilt').value = self.cut.tilt;
      $('ex-cut-azim').value = self.cut.azim;
      $('ex-cut-pos').value = self.cut.pos;
      self._updateCutPlane();
    };
    Array.prototype.forEach.call(document.querySelectorAll('#ex-cut-controls [data-axis]'), function (btn) {
      btn.addEventListener('click', function () {
        var axis = btn.getAttribute('data-axis');
        self.cut.tilt = axis === 'y' ? 0 : 90;
        self.cut.azim = axis === 'z' ? 90 : 0;
        sync();
      });
    });
    ['tilt', 'azim', 'pos'].forEach(function (key) {
      $('ex-cut-' + key).addEventListener('input', function () {
        self.cut[key] = +this.value;
        self._updateCutPlane();
      });
    });
    $('ex-cut-go').addEventListener('click', function () { self.doCut(); });
  };

  Explore.prototype.setActive = function (on) {
    this.active = on;
    this.group.visible = on;
    (this.labels || []).forEach(function (l) { l.el.style.display = on ? '' : 'none'; });
    this._updateCutPlane();
    if (on) this._refresh();
  };

  JZ.Explore = Explore;
})(window.JZ);
