/* =========================================================
   06 Sekcja shader – tło WebGL renderowane w czasie rzeczywistym
   - płynna, nieskończona pętla: czas jest odwzorowany na okrąg w przestrzeni
     szumu, więc klatka(T) === klatka(0) -> brak widocznego początku/końca
   - wolny, falujący ruch oparty na szumie; jeden cykl = 24 s
   - tekst i przycisk są statyczne w DOM nad canvasem
   - renderuje w obniżonej rozdzielczości (obraz i tak jest miękki),
     zatrzymuje się poza ekranem / w ukrytej karcie, przy ograniczonym ruchu pokazuje jedną klatkę
   - gdy WebGL jest niedostępny, zostaje gradient CSS na .glow
   ========================================================= */
(() => {
  'use strict';

  const canvas = document.querySelector('[data-shader]');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return; // zostaje gradient CSS

  const CYCLE = 24; // sekundy na cykl (wytyczne: ~20–30 s)
  const RES_SCALE = 0.5; // skala renderu – miękkie gradienty nie potrzebują pełnej rozdzielczości

  const vert = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  const frag = `
    precision highp float;
    uniform vec2  u_res;
    uniform float u_phase; // 0..2PI, jedna pełna pętla

    // --- szum simplex 3D (Ashima Arts / Stefan Gustavson, licencja MIT) ---
    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0);
      const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy));
      vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);
      vec3 l=1.0-g;
      vec3 i1=min(g.xyz,l.zxy);
      vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;
      vec3 x2=x0-i2+C.yyy;
      vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=0.142857142857;
      vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z);
      vec4 y_=floor(j-7.0*x_);
      vec4 x=x_*ns.x+ns.yyyy;
      vec4 y=y_*ns.x+ns.yyyy;
      vec4 h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy);
      vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.0+1.0;
      vec4 s1=floor(b1)*2.0+1.0;
      vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
      vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);
      vec3 p1=vec3(a0.zw,h.y);
      vec3 p2=vec3(a1.xy,h.z);
      vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
      m=m*m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    // zapętlony szum: oś czasu biegnie po okręgu -> idealnie okresowy
    float loopNoise(vec2 p, float radius, float offset){
      vec2 c = vec2(cos(u_phase), sin(u_phase)) * radius;
      return snoise(vec3(p + c, offset + c.x * 0.5));
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res;          // 0..1, y w górę
      float aspect = u_res.x / u_res.y;
      vec2 p = vec2(uv.x * aspect, uv.y);

      // współrzędne w poprzek / wzdłuż ukośnych „fałd jedwabiu” (biegną z lewej góry w prawy dół)
      vec2 across = normalize(vec2(1.15, 1.0));
      vec2 along  = vec2(across.y, -across.x);
      float s = dot(p, across) / (aspect * across.x + across.y); // 0..1 w poprzek kadru
      float t = dot(p, along);

      // powolne falowanie fałd (szum biegnie po okręgu -> pętla bez cięcia)
      float wob = loopNoise(vec2(t * 1.1, s * 0.8), 0.35, 2.0) * 0.045
                + sin(t * 2.2 + u_phase) * 0.012;
      float sw = s + wob;

      // masa światła: czarna góra, jasny dół; krawędź wznosi się w prawo i „oddycha”
      float horizon = mix(0.50, 0.68, uv.x) + 0.05 * loopNoise(vec2(uv.x * 1.3, 0.5), 0.3, 5.0);
      float mass = smoothstep(horizon, horizon - 0.6, uv.y);

      // fałdy: miękkie grzbiety gaussowskie, których pozycje dryfują w pętli
      float c1 = 0.205 + 0.020 * sin(u_phase)           + 0.015 * loopNoise(vec2(t, 1.0), 0.25, 11.0);
      float c2 = 0.680 + 0.025 * sin(u_phase + 2.1)     + 0.015 * loopNoise(vec2(t, 3.0), 0.25, 13.0);
      float c3 = 0.790 + 0.020 * cos(u_phase + 0.7);
      float c4 = 0.430 + 0.030 * sin(u_phase + 4.0);
      float c5 = 0.930 + 0.020 * sin(u_phase + 1.3);
      float bright1 = exp(-pow((sw - c1) / 0.034, 2.0));   // gorąca smuga w lewym dole
      float bright2 = exp(-pow((sw - c3) / 0.070, 2.0));   // ciepły pas na prawo od cienia
      float bright3 = exp(-pow((sw - c4) / 0.160, 2.0));   // szeroka poświata pośrodku
      float dark1   = exp(-pow((sw - c2) / 0.050, 2.0));   // cień fałdy po prawej
      float dark2   = exp(-pow((sw - c5) / 0.050, 2.0));   // drugi, łagodniejszy cień
      float dark0   = exp(-pow((sw - 0.11) / 0.06, 2.0));  // cień przy lewej krawędzi

      float L = mass * (0.62 + 0.55 * bright1 + 0.12 * bright2 + 0.10 * bright3
                        - 0.55 * dark1 - 0.30 * dark2 - 0.25 * dark0);
      L += 0.42 * bright1 * smoothstep(0.66, 0.08, uv.y);  // smuga sięga nieco wyżej
      L = max(L, 0.0);

      vec3 ink   = vec3(0.063, 0.063, 0.067);   // #101011
      vec3 umber = vec3(0.24, 0.20, 0.09);
      vec3 ochre = vec3(0.56, 0.44, 0.13);
      vec3 gold  = vec3(0.949, 0.749, 0.145);   // #F2BF25

      vec3 col = mix(ink, umber, smoothstep(0.02, 0.32, L));
      col = mix(col, ochre, smoothstep(0.28, 0.66, L));
      col = mix(col, gold,  smoothstep(0.66, 1.05, L));

      // delikatne, statyczne ziarno przeciw pasmowaniu
      float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      col += (g - 0.5) * 0.016;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[shader]', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, vert);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[shader]', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // jeden duży trójkąt na cały ekran
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uPhase = gl.getUniformLocation(prog, 'u_phase');

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr * RES_SCALE));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr * RES_SCALE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, w, h);
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0;
  let visible = false;
  let elapsed = 0;   // sekundy, liczone tylko gdy animacja działa
  let last = 0;

  const draw = () => {
    const phase = ((elapsed % CYCLE) / CYCLE) * Math.PI * 2;
    gl.uniform1f(uPhase, phase);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (last) elapsed += Math.min(0.1, (now - last) / 1000);
    last = now;
    draw();
  };

  const start = () => {
    if (raf || !visible || document.hidden) return;
    resize();
    if (reduced.matches) { draw(); return; } // jedna statyczna klatka
    last = 0;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible ? start() : stop();
  }, { rootMargin: '200px 0px' }).observe(canvas);

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  reduced.addEventListener('change', () => { stop(); start(); });
  new ResizeObserver(() => { resize(); if (!raf) draw(); }).observe(canvas);

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); canvas.classList.remove('is-ready'); });

  resize();
  draw();
  canvas.classList.add('is-ready');
})();
