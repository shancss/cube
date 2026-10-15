// 凸多面體：建構、平面切割、體積、轉成 three.js 幾何。
// 座標約定：x = 廣 (a)，y = 高 (h)，z = 袤 (b)。
window.JZ = window.JZ || {};
(function (JZ) {
  'use strict';
  var V3 = THREE.Vector3;

  // Newell 法向量，長度為面積的兩倍
  function newell(face) {
    var n = new V3();
    for (var i = 0; i < face.length; i++) {
      var p = face[i], q = face[(i + 1) % face.length];
      n.x += (p.y - q.y) * (p.z + q.z);
      n.y += (p.z - q.z) * (p.x + q.x);
      n.z += (p.x - q.x) * (p.y + q.y);
    }
    return n;
  }

  function average(points) {
    var c = new V3();
    points.forEach(function (p) { c.add(p); });
    return c.divideScalar(points.length);
  }

  // faces：每個面是一圈 Vector3（凸、共面）。會把各面調成朝外，並算出體積與形心。
  function makePoly(faces) {
    var all = [];
    faces.forEach(function (f) { f.forEach(function (p) { all.push(p); }); });
    var inside = average(all);
    var box = new THREE.Box3().setFromPoints(all);

    faces.forEach(function (f) {
      if (newell(f).dot(average(f).sub(inside)) < 0) f.reverse();
    });

    var vol = 0, cen = new V3(), t = new V3();
    faces.forEach(function (f) {
      for (var i = 1; i < f.length - 1; i++) {
        var v = f[0].dot(t.crossVectors(f[i], f[i + 1])) / 6;
        vol += v;
        cen.addScaledVector(f[0], v / 4).addScaledVector(f[i], v / 4).addScaledVector(f[i + 1], v / 4);
      }
    });

    return {
      faces: faces,
      size: box.getSize(new V3()).length(),
      volume: vol,
      centroid: cen.divideScalar(vol)
    };
  }

  function box(a, h, b) {
    var p = function (x, y, z) { return new V3(x * a, y * h, z * b); };
    return makePoly([
      [p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)],
      [p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)],
      [p(0, 0, 0), p(1, 0, 0), p(1, 1, 0), p(0, 1, 0)],
      [p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)],
      [p(0, 0, 0), p(0, 1, 0), p(0, 1, 1), p(0, 0, 1)],
      [p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)]
    ]);
  }

  // 以平面 n·p = d 切開，回傳 [n·p ≥ d 的一塊, n·p ≤ d 的一塊]；沒切到的那側為 null。
  function split(poly, normal, d) {
    var len = normal.length();
    var n = normal.clone().divideScalar(len);
    d = d / len;
    var eps = 1e-7 * poly.size;
    var hasPos = false, hasNeg = false;

    var dists = poly.faces.map(function (f) {
      return f.map(function (p) {
        var s = n.dot(p) - d;
        if (Math.abs(s) < eps) s = 0;
        if (s > 0) hasPos = true;
        if (s < 0) hasNeg = true;
        return s;
      });
    });
    if (!hasNeg) return [poly, null];
    if (!hasPos) return [null, poly];

    var minArea = 1e-10 * poly.size * poly.size;
    var front = [], back = [], cap = [];
    poly.faces.forEach(function (f, fi) {
      var ds = dists[fi], fp = [], bp = [];
      for (var i = 0; i < f.length; i++) {
        var j = (i + 1) % f.length;
        var p = f[i], q = f[j], dp = ds[i], dq = ds[j];
        if (dp >= 0) fp.push(p);
        if (dp <= 0) bp.push(p);
        if (dp === 0) cap.push(p);
        if (dp * dq < 0) {
          var x = p.clone().lerp(q, dp / (dp - dq));
          fp.push(x); bp.push(x); cap.push(x);
        }
      }
      if (fp.length >= 3 && newell(fp).length() > minArea) front.push(fp);
      if (bp.length >= 3 && newell(bp).length() > minArea) back.push(bp);
    });

    // 截面：去掉重複點後繞法向量排序
    var uniq = [];
    cap.forEach(function (p) {
      for (var i = 0; i < uniq.length; i++) if (uniq[i].distanceTo(p) < eps * 10) return;
      uniq.push(p);
    });
    if (uniq.length >= 3) {
      var c = average(uniq);
      var u = uniq[0].clone().sub(c).normalize();
      var v = new V3().crossVectors(n, u);
      var w = new V3();
      uniq.sort(function (p, q) {
        var ap = Math.atan2(w.subVectors(p, c).dot(v), w.dot(u));
        var aq = Math.atan2(w.subVectors(q, c).dot(v), w.dot(u));
        return ap - aq;
      });
      front.push(uniq.slice());
      back.push(uniq.slice());
    }
    return [front.length >= 4 ? makePoly(front) : null, back.length >= 4 ? makePoly(back) : null];
  }

  // 把一組多面體全部用同一個平面切開
  function splitAll(polys, normal, d) {
    var out = [];
    polys.forEach(function (poly) {
      split(poly, normal, d).forEach(function (piece) { if (piece) out.push(piece); });
    });
    return out;
  }

  function keep(poly, normal, d, frontSide) {
    return split(poly, normal, d)[frontSide ? 0 : 1];
  }

  // 九章拆解用到的三個斜面，都通過立方的對角線
  function planes(a, h, b) {
    return {
      p1: { n: new V3(1 / a, 1 / h, 0), d: 1 },   // x/a + y/h = 1：斜解立方
      p2: { n: new V3(0, 1 / h, 1 / b), d: 1 },   // z/b + y/h = 1：斜解塹堵
      p3: { n: new V3(1 / a, 0, -1 / b), d: 0 }   // x/a = z/b：中破陽馬
    };
  }

  function qiandu(a, h, b) {
    var P = planes(a, h, b);
    return keep(box(a, h, b), P.p1.n, P.p1.d, false);
  }
  function yangma(a, h, b) {
    var P = planes(a, h, b);
    return keep(qiandu(a, h, b), P.p2.n, P.p2.d, false);
  }
  function bienao(a, h, b) {
    var P = planes(a, h, b);
    return keep(qiandu(a, h, b), P.p2.n, P.p2.d, true);
  }

  // 三個中分平面：廣、袤、高各半
  function halve(poly, a, h, b) {
    var out = [poly];
    out = splitAll(out, new V3(0, 1, 0), h / 2);
    out = splitAll(out, new V3(1, 0, 0), a / 2);
    out = splitAll(out, new V3(0, 0, 1), b / 2);
    return out;
  }

  function translate(poly, off) {
    return makePoly(poly.faces.map(function (f) {
      return f.map(function (p) { return p.clone().add(off); });
    }));
  }

  // 底面左後角在 (x0, 0, z0) 的方柱：x 向寬 w、高 h、z 向長 l
  function boxAt(x0, z0, w, h, l) {
    return translate(box(w, h, l), new V3(x0, 0, z0));
  }

  // 方亭：下方 a、上方 b、高 h。底面是 [0,a]×[0,a]，上面置中。
  function fangting(a, h, b) {
    var d = (a - b) / 2, p = box(a, h, a);
    p = keep(p, new V3(1, -d / h, 0), 0, true);
    p = keep(p, new V3(1, d / h, 0), a, false);
    p = keep(p, new V3(0, -d / h, 1), 0, true);
    p = keep(p, new V3(0, d / h, 1), a, false);
    return p;
  }

  // 方亭切成九塊棊：中央立方一，四面塹堵四，四角陽馬四
  function fangtingParts(a, h, b) {
    var d = (a - b) / 2, parts = [fangting(a, h, b)];
    [[new V3(1, 0, 0), d], [new V3(1, 0, 0), d + b], [new V3(0, 0, 1), d], [new V3(0, 0, 1), d + b]].forEach(function (c) {
      parts = splitAll(parts, c[0], c[1]);
    });
    var inside = function (v) { return v > d && v < d + b ? 1 : 0; };
    return parts.map(function (poly) {
      return { poly: poly, kind: ['陽馬', '塹堵', '立方'][inside(poly.centroid.x) + inside(poly.centroid.z)] };
    });
  }

  // 劉徽驗方亭術的三個方柱：上下方相乘、下方自乘、上方自乘，各乘以高。
  // 切開後共得立方 3、塹堵 12、陽馬 12，正是三個方亭的棊數。
  function threePrisms(a, h, b) {
    var d = (a - b) / 2, gap = a * 0.45, parts = [], boxes = [];
    var push = function (poly, kind, center) { parts.push({ poly: poly, kind: kind, center: center }); };
    // 薄板斜切成兩個塹堵；thinX 表示薄的方向是 x，outerHigh 表示外側在座標較大的那一邊。
    // 斜面一律朝外往下，所以其中一塊原地就是方亭側面的塹堵。
    var slab = function (x0, z0, w, l, thinX, outerHigh, center) {
      var s = outerHigh ? 1 : -1, start = thinX ? x0 / w : z0 / l;
      var n = thinX ? new V3(1 / w, s / h, 0) : new V3(0, s / h, 1 / l);
      split(boxAt(x0, z0, w, h, l), n, outerHigh ? start + 1 : start).forEach(function (p) { push(p, '塹堵', center); });
    };
    // 角上的小方柱從靠內的上角分成三個陽馬
    var corner = function (x0, z0, inX, inZ, center) {
      var bx = boxAt(x0, z0, d, h, d);
      var sx = inX === x0 ? 1 : -1, sz = inZ === z0 ? 1 : -1;
      var uv = { n: new V3(sx / d, 1 / h, 0), d: sx * inX / d + 1 };          // u ≥ v
      var uw = { n: new V3(sx / d, 0, -sz / d), d: sx * inX / d - sz * inZ / d }; // u ≥ w
      var vw = { n: new V3(0, -1 / h, -sz / d), d: -1 - sz * inZ / d };        // v ≥ w
      push(keep(keep(bx, uv.n, uv.d, false), vw.n, vw.d, true), '陽馬', center);
      push(keep(keep(bx, uv.n, uv.d, true), uw.n, uw.d, true), '陽馬', center);
      push(keep(keep(bx, uw.n, uw.d, false), vw.n, vw.d, false), '陽馬', center);
    };

    // 上下方相乘：a × b 的方柱
    var cA = new V3(a / 2, h / 2, a / 2);
    push(boxAt(d, d, b, h, b), '立方', cA);
    slab(0, d, d, b, true, false, cA);
    slab(d + b, d, d, b, true, true, cA);
    boxes.push({ name: '上下方相乘', center: cA, w: a, l: b });

    // 下方自乘：a × a 的方柱
    var pitch = a + gap, xB = pitch, cB = new V3(xB + a / 2, h / 2, a / 2);
    push(boxAt(xB + d, d, b, h, b), '立方', cB);
    slab(xB, d, d, b, true, false, cB);
    slab(xB + d + b, d, d, b, true, true, cB);
    slab(xB + d, 0, b, d, false, false, cB);
    slab(xB + d, d + b, b, d, false, true, cB);
    [[xB, 0], [xB + d + b, 0], [xB, d + b], [xB + d + b, d + b]].forEach(function (c) {
      corner(c[0], c[1], c[0] === xB ? xB + d : c[0], c[1] === 0 ? d : c[1], cB);
    });
    boxes.push({ name: '下方自乘', center: cB, w: a, l: a });

    // 上方自乘：b × b 的方柱
    var xC = 2 * pitch + d, cC = new V3(xC + b / 2, h / 2, a / 2);
    push(boxAt(xC, d, b, h, b), '立方', cC);
    boxes.push({ name: '上方自乘', center: cC, w: b, l: b });

    return { parts: parts, boxes: boxes, pitch: pitch };
  }

  // ---------- 把一塊棊搬到另一個位置：找出需要的旋轉（與必要時的伸縮） ----------

  // 24 種把座標軸對到座標軸的旋轉
  var ROTATIONS = (function () {
    var out = [], perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    perms.forEach(function (p) {
      for (var bits = 0; bits < 8; bits++) {
        var m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        for (var i = 0; i < 3; i++) m[i][p[i]] = bits & (1 << i) ? -1 : 1;
        var det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
                  m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
                  m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
        if (det > 0) out.push(m);
      }
    });
    return out;
  })();

  function cornersOf(poly) {
    var out = [], eps = 1e-6 * poly.size;
    poly.faces.forEach(function (f) {
      f.forEach(function (p) {
        var v = p.clone().sub(poly.centroid);
        for (var i = 0; i < out.length; i++) if (out[i].distanceTo(v) < eps) return;
        out.push(v);
      });
    });
    return out;
  }

  // 回傳把 src 擺成 dst 所需的 { quat, scale }（都以各自的形心為準）；擺不成就回傳 null。
  // 形狀全等時 scale 是 (1,1,1)；只有體積相等、長寬高比例不同時，才會帶伸縮。
  function matchTransform(src, dst) {
    var sv = cornersOf(src), tv = cornersOf(dst);
    if (sv.length !== tv.length) return null;
    var eps = 1e-5 * dst.size, best = null;
    var extent = function (list) {
      var bx = new THREE.Box3().setFromPoints(list);
      return bx.getSize(new V3());
    };
    var te = extent(tv);
    ROTATIONS.forEach(function (m) {
      var rv = sv.map(function (v) {
        return new V3(m[0][0] * v.x + m[0][1] * v.y + m[0][2] * v.z,
                      m[1][0] * v.x + m[1][1] * v.y + m[1][2] * v.z,
                      m[2][0] * v.x + m[2][1] * v.y + m[2][2] * v.z);
      });
      var re = extent(rv), s = new V3(te.x / re.x, te.y / re.y, te.z / re.z);
      var ok = rv.every(function (v) {
        var w = v.clone().multiply(s);
        return tv.some(function (t) { return t.distanceTo(w) < eps; });
      });
      if (!ok) return;
      var angle = Math.acos(Math.max(-1, Math.min(1, (m[0][0] + m[1][1] + m[2][2] - 1) / 2)));
      var stretch = Math.abs(Math.log(s.x)) + Math.abs(Math.log(s.y)) + Math.abs(Math.log(s.z));
      var cost = stretch * 100 + angle;
      if (best && best.cost <= cost) return;
      var m4 = new THREE.Matrix4().set(
        m[0][0], m[0][1], m[0][2], 0, m[1][0], m[1][1], m[1][2], 0, m[2][0], m[2][1], m[2][2], 0, 0, 0, 0, 1);
      // 世界座標的伸縮換成棊自己座標軸上的伸縮
      var local = new V3(
        Math.abs(m[0][0] * s.x + m[1][0] * s.y + m[2][0] * s.z),
        Math.abs(m[0][1] * s.x + m[1][1] * s.y + m[2][1] * s.z),
        Math.abs(m[0][2] * s.x + m[1][2] * s.y + m[2][2] * s.z));
      best = {
        cost: cost, quat: new THREE.Quaternion().setFromRotationMatrix(m4), scale: local,
        turned: angle > 1e-6, stretched: stretch > 1e-6
      };
    });
    return best;
  }

  // 三個方柱的 27 塊棊要怎麼搬，才能拼成三個方亭。
  // 回傳的陣列和 parts 一一對應：{ pos, quat, scale, dir, moved, stretched }。
  function planAssembly(parts, a, h, b, pitch) {
    var targets = [];
    for (var k = 0; k < 3; k++) {
      var off = new V3(k * pitch, 0, 0), center = fangting(a, h, b).centroid.clone().add(off);
      fangtingParts(a, h, b).forEach(function (p) {
        targets.push({ poly: translate(p.poly, off), kind: p.kind, center: center, taken: false });
      });
    }
    var plan = parts.map(function () { return null; }), near = 1e-6 * a;
    var assign = function (i, t, m) {
      t.taken = true;
      plan[i] = {
        pos: t.poly.centroid.clone(), quat: m.quat, scale: m.scale, dir: t.poly.centroid.clone().sub(t.center),
        moved: m.turned || parts[i].poly.centroid.distanceTo(t.poly.centroid) > near, stretched: m.stretched
      };
    };
    // 先留住原地就已經對的
    targets.forEach(function (t) {
      parts.some(function (p, i) {
        if (plan[i] || p.kind !== t.kind || p.poly.centroid.distanceTo(t.poly.centroid) > near) return false;
        var m = matchTransform(p.poly, t.poly);
        if (!m || m.turned || m.stretched) return false;
        assign(i, t, m);
        return true;
      });
    });
    // 其餘的空位各找最近的同類棊
    targets.forEach(function (t) {
      if (t.taken) return;
      var order = [];
      parts.forEach(function (p, i) { if (!plan[i] && p.kind === t.kind) order.push(i); });
      order.sort(function (i, j) {
        return parts[i].poly.centroid.distanceTo(t.poly.centroid) - parts[j].poly.centroid.distanceTo(t.poly.centroid);
      });
      order.some(function (i) {
        var m = matchTransform(parts[i].poly, t.poly);
        if (!m) return false;
        assign(i, t, m);
        return true;
      });
    });
    return plan;
  }

  // 轉成以形心為原點的 three.js 幾何（面 + 稜線）
  function toGeometry(poly) {
    var c = poly.centroid, pos = [], nor = [], lines = [], seen = {};
    var key = function (p) { return p.x.toFixed(4) + ',' + p.y.toFixed(4) + ',' + p.z.toFixed(4); };
    poly.faces.forEach(function (f) {
      var n = newell(f).normalize();
      for (var i = 1; i < f.length - 1; i++) {
        [f[0], f[i], f[i + 1]].forEach(function (p) {
          pos.push(p.x - c.x, p.y - c.y, p.z - c.z);
          nor.push(n.x, n.y, n.z);
        });
      }
      for (var j = 0; j < f.length; j++) {
        var p = f[j], q = f[(j + 1) % f.length];
        var kp = key(p), kq = key(q);
        var k = kp < kq ? kp + '|' + kq : kq + '|' + kp;
        if (seen[k]) continue;
        seen[k] = true;
        lines.push(p.x - c.x, p.y - c.y, p.z - c.z, q.x - c.x, q.y - c.y, q.z - c.z);
      }
    });
    var faces = new THREE.BufferGeometry();
    faces.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    faces.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    var edges = new THREE.BufferGeometry();
    edges.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    return { faces: faces, edges: edges };
  }

  JZ.geo = {
    box: box, qiandu: qiandu, yangma: yangma, bienao: bienao,
    split: split, splitAll: splitAll, keep: keep, planes: planes, halve: halve,
    fangting: fangting, fangtingParts: fangtingParts, threePrisms: threePrisms,
    matchTransform: matchTransform, planAssembly: planAssembly,
    toGeometry: toGeometry
  };
})(window.JZ);
