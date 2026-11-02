/*
 * Decomposition cube: one problem splits into 8, then 64 testable pieces,
 * each "solved" in turn, before recomposing. Scroll-driven, dependency-free
 * WebGL (no library) so it stays tiny on mobile.
 */
(function () {
  "use strict";

  var stage = document.querySelector(".decompose-stage");
  var canvas = stage && stage.querySelector("canvas");
  if (!canvas) return;

  var gl = canvas.getContext("webgl", { antialias: true, alpha: true, powerPreference: "low-power" });
  if (!gl) { stage.classList.add("no-3d"); return; }

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var steps = stage.querySelectorAll(".decompose-steps li");

  // ------------------------------------------------------------------
  // Shaders
  // ------------------------------------------------------------------
  var VS = [
    "attribute vec3 aPos;",
    "attribute vec3 aNormal;",
    "uniform mat4 uViewProj;",
    "uniform mat4 uModel;",
    "uniform mat3 uNormalMat;",
    "uniform vec3 uOffset;",
    "uniform vec3 uBase;",
    "uniform float uScale;",
    "varying vec3 vNormal;",
    "varying vec3 vLocal;",
    "varying vec3 vGrid;",
    "void main() {",
    "  vLocal = aPos;",
    "  vGrid = aPos * 0.25 + uBase;",          // position inside the solid 2x2x2 cube
    "  vNormal = uNormalMat * aNormal;",
    "  gl_Position = uViewProj * uModel * vec4(aPos * 0.25 * uScale + uOffset, 1.0);",
    "}"
  ].join("\n");

  var FS = [
    "precision mediump float;",
    "uniform vec3 uColor;",
    "uniform vec3 uEdge;",
    "uniform vec3 uLight;",
    "uniform float uL1;",
    "uniform float uL2;",
    "varying vec3 vNormal;",
    "varying vec3 vLocal;",
    "varying vec3 vGrid;",
    // second-largest component: close to 1 means we're near an edge of that box
    "float second(vec3 a) {",
    "  float mx = max(a.x, max(a.y, a.z));",
    "  float mn = min(a.x, min(a.y, a.z));",
    "  return a.x + a.y + a.z - mx - mn;",
    "}",
    "void main() {",
    "  vec3 n = normalize(vNormal);",
    "  float diff = max(dot(n, uLight), 0.0);",
    "  float rim = pow(1.0 - max(n.z, 0.0), 2.0);",
    "  vec3 c = uColor * (0.42 + 0.72 * diff) + uEdge * rim * 0.1;",
    "  vec3 g = abs(vGrid);",
    "  float eBig = smoothstep(0.955, 0.985, second(g));",
    "  float e1 = smoothstep(0.91, 0.97, second(abs(2.0 * g - 1.0))) * uL1;",
    "  float e2 = smoothstep(0.84, 0.95, second(abs(vLocal))) * uL2;",
    "  c = mix(c, uEdge, max(eBig, max(e1, e2)) * 0.55);",
    "  gl_FragColor = vec4(c, 1.0);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { stage.classList.add("no-3d"); return; }
  gl.useProgram(prog);

  var u = {};
  ["uViewProj", "uModel", "uNormalMat", "uOffset", "uBase", "uScale", "uColor", "uEdge", "uLight", "uL1", "uL2"].forEach(function (name) {
    u[name] = gl.getUniformLocation(prog, name);
  });

  // ------------------------------------------------------------------
  // Geometry: one unit cube (-1..1), position + normal, 36 vertices
  // ------------------------------------------------------------------
  var verts = [];
  [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]].forEach(function (f) {
    var axis = f[0], sign = f[1];
    var a = (axis + 1) % 3, b = (axis + 2) % 3;
    var quad = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    if (sign < 0) quad = [quad[0], quad[2], quad[1], quad[3], quad[5], quad[4]];
    quad.forEach(function (q) {
      var p = [0, 0, 0], nrm = [0, 0, 0];
      p[axis] = sign; p[a] = q[0]; p[b] = q[1];
      nrm[axis] = sign;
      verts.push(p[0], p[1], p[2], nrm[0], nrm[1], nrm[2]);
    });
  });
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, "aPos");
  var aNormal = gl.getAttribLocation(prog, "aNormal");
  gl.enableVertexAttribArray(aPos);
  gl.enableVertexAttribArray(aNormal);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
  gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 24, 12);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clearColor(0, 0, 0, 0);
  var light = [0.35, 0.75, 0.56];
  var ll = Math.hypot(light[0], light[1], light[2]);
  gl.uniform3f(u.uLight, light[0] / ll, light[1] / ll, light[2] / ll);

  // ------------------------------------------------------------------
  // The 64 pieces (4 x 4 x 4)
  // ------------------------------------------------------------------
  var seed = 11;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  var pieces = [];
  for (var x = 0; x < 4; x++) {
    for (var y = 0; y < 4; y++) {
      for (var z = 0; z < 4; z++) {
        var th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1);
        pieces.push({
          base: [(x - 1.5) * 0.5, (y - 1.5) * 0.5, (z - 1.5) * 0.5],
          oct: [x < 2 ? -1 : 1, y < 2 ? -1 : 1, z < 2 ? -1 : 1],
          sub: [x % 2 ? 1 : -1, y % 2 ? 1 : -1, z % 2 ? 1 : -1],
          solveAt: 0.52 + rand() * 0.24,
          dir: [Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph)],
          phase: rand() * Math.PI * 2
        });
      }
    }
  }

  // ------------------------------------------------------------------
  // Matrices (column-major)
  // ------------------------------------------------------------------
  function mul(a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) {
      for (var r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
    }
    return o;
  }
  function perspective(fov, aspect, near, far) {
    var f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function translateZ(z) { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, z, 1]); }
  function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); }
  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); }

  // ------------------------------------------------------------------
  // Theme colours come from CSS custom properties
  // ------------------------------------------------------------------
  var colors = {};
  function hex(v) {
    v = v.trim().replace("#", "");
    if (v.length === 3) v = v.replace(/./g, "$&$&");
    var n = parseInt(v, 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  function readColors() {
    var cs = getComputedStyle(root);
    colors.base = hex(cs.getPropertyValue("--cube-base") || "#1c2e57");
    colors.solved = hex(cs.getPropertyValue("--cube-solved") || "#8fb0dc");
    colors.edge = hex(cs.getPropertyValue("--cube-edge") || "#f4eee3");
    gl.uniform3fv(u.uEdge, colors.edge);
  }
  readColors();

  // ------------------------------------------------------------------
  // Sizing
  // ------------------------------------------------------------------
  var maxDpr = finePointer ? 2 : 1.5;
  var aspect = 1;
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    aspect = w / h;
    var dist = 8.6 / Math.min(aspect, 1);
    gl.uniformMatrix4fv(u.uViewProj, false, mul(perspective(Math.PI / 6, aspect, 0.1, 50), translateZ(-dist)));
  }

  // ------------------------------------------------------------------
  // Frame
  // ------------------------------------------------------------------
  function smooth(a, b, v) { var t = Math.min(Math.max((v - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  var progress = reduceMotion ? 0.6 : 0;
  var tiltX = 0, tiltY = 0, targetTiltX = 0, targetTiltY = 0;
  var activeStep = -1;

  function scrollTarget() {
    var r = stage.getBoundingClientRect();
    var vh = window.innerHeight;
    var center = r.top + r.height / 2;
    return Math.min(Math.max((vh * 0.95 - center) / (vh * 0.6), 0), 1);
  }

  function draw(time) {
    var p = progress;
    var t = reduceMotion ? 0 : time / 1000;

    var s1 = smooth(0.16, 0.36, p);          // 1 -> 8
    var s2 = smooth(0.38, 0.58, p);          // 8 -> 64
    var rc = smooth(0.82, 0.96, p);          // recompose
    var open = 1 - rc;
    var g1 = 0.34 * s1 * open, g2 = 0.17 * s2 * open;
    var bob = 0.05 * s2 * open;
    // Overlap a hair when closed so no cracks show between neighbouring pieces
    var closed = 1 - Math.max(s1, s2) * open;
    var scale = 1 - 0.1 * s2 * open + 0.02 * closed;

    var model = mul(rotX(0.52 + 0.08 * Math.sin(t * 0.3) + tiltX), rotY(-0.6 + t * 0.16 + p * Math.PI * 1.15 + tiltY));
    gl.uniformMatrix4fv(u.uModel, false, model);
    gl.uniformMatrix3fv(u.uNormalMat, false, new Float32Array([model[0], model[1], model[2], model[4], model[5], model[6], model[8], model[9], model[10]]));
    gl.uniform1f(u.uL1, s1 * open);
    gl.uniform1f(u.uL2, s2 * open);
    gl.uniform1f(u.uScale, scale);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for (var i = 0; i < pieces.length; i++) {
      var pc = pieces[i];
      var wob = bob * Math.sin(t * 1.4 + pc.phase);
      gl.uniform3f(u.uOffset,
        pc.base[0] + pc.oct[0] * g1 + pc.sub[0] * g2 + pc.dir[0] * wob,
        pc.base[1] + pc.oct[1] * g1 + pc.sub[1] * g2 + pc.dir[1] * wob,
        pc.base[2] + pc.oct[2] * g1 + pc.sub[2] * g2 + pc.dir[2] * wob);
      gl.uniform3fv(u.uBase, pc.base);
      gl.uniform3fv(u.uColor, mix(colors.base, colors.solved, Math.max(smooth(pc.solveAt, pc.solveAt + 0.05, p), rc)));
      gl.drawArrays(gl.TRIANGLES, 0, 36);
    }

    var step = p < 0.3 ? 0 : p < 0.56 ? 1 : p < 0.82 ? 2 : 3;
    if (step !== activeStep) {
      activeStep = step;
      steps.forEach(function (li, k) { li.classList.toggle("active", k === step); });
    }
  }

  // ------------------------------------------------------------------
  // Loop: only while visible and the tab is active
  // ------------------------------------------------------------------
  var visible = false, raf = 0, last = 0;

  function loop(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    progress += (scrollTarget() - progress) * Math.min(1, dt * 5);
    tiltX += (targetTiltX - tiltX) * Math.min(1, dt * 6);
    tiltY += (targetTiltY - tiltY) * Math.min(1, dt * 6);
    draw(now);
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf && !reduceMotion) { last = 0; raf = requestAnimationFrame(loop); } }
  function renderStill() { resize(); draw(0); }

  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (visible) start();
  }, { rootMargin: "100px 0px" }).observe(stage);

  document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });

  if ("ResizeObserver" in window) {
    new ResizeObserver(function () { resize(); if (reduceMotion || !raf) draw(performance.now()); }).observe(canvas);
  } else {
    window.addEventListener("resize", function () { resize(); });
  }

  // Re-read colours when the theme changes
  new MutationObserver(function () { readColors(); if (reduceMotion || !raf) draw(performance.now()); })
    .observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  if (finePointer && !reduceMotion) {
    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      targetTiltY = ((e.clientX - r.left) / r.width - 0.5) * 0.7;
      targetTiltX = ((e.clientY - r.top) / r.height - 0.5) * 0.5;
    });
    stage.addEventListener("pointerleave", function () { targetTiltX = targetTiltY = 0; });
  }

  canvas.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
    visible = false;
    stage.classList.add("no-3d");
  });

  renderStill();
  stage.classList.add("ready");
})();
