export default function initAnimation() {
  const bg = document.getElementById("bg");
const canvas = document.getElementById("fluid");
  if (!canvas && !bg) {
    return () => {};
  }

  let isActive = true;
  let bgRafId = 0;

  /* ================================================================
     GLOBAL MOUSE STATE
  ================================================================ */
  let mouseX = 0;
  let mouseY = 0;

  const onMouseMove = (e) => {
    mouseX = e.clientX / innerWidth;
    mouseY = e.clientY / innerHeight;
  };

  if (bg) {
    document.addEventListener("mousemove", onMouseMove);
  }

/* ================================================================
   GPU SHADER BACKGROUND — purple fog + distortion
================================================================ */
const gl = bg ? bg.getContext("webgl") : null;

function resizeBG() {
  if (!bg || !gl) return;
  bg.width = innerWidth;
  bg.height = innerHeight;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}
if (bg && gl) {
  resizeBG();
  window.addEventListener("resize", resizeBG);
}

// Vertex shader
const vs = `
attribute vec2 pos;
void main() {
  gl_Position = vec4(pos, 0., 1.);
}
`;

const fs = `
precision highp float;

uniform float time;
uniform vec2 res;
uniform vec2 mouse;

// soft blob shape
float blob(vec2 p, vec2 c, float size) {
    float d = length(p - c);
    return smoothstep(size, size * 0.2, d);
}

void main() {
    vec2 uv = gl_FragCoord.xy / res.xy;
    uv -= 0.5;
    uv.x *= res.x / res.y;

    // centered mouse
    vec2 m = (mouse - 0.5) * vec2(1.0, -1.0);

    float distMouse = length(uv - m);

    // ----------------------------------------------------------
    // DEPTH PULSE (same as your version)
    // ----------------------------------------------------------
    float depthPulse = 0.06 * sin(time * 0.8);

    // ----------------------------------------------------------
    // SWIRL (same but a tiny bit stronger)
    // ----------------------------------------------------------
    float swirlStrength = 0.28 * exp(-distMouse * 6.0);
    float angle = swirlStrength * 2.6;

    mat2 swirl = mat2(
        cos(angle), -sin(angle),
        sin(angle),  cos(angle)
    );

    vec2 suv = swirl * (uv - m) + m;

    // ----------------------------------------------------------
    // FLOATY OFFSET MOTION (same)
    // ----------------------------------------------------------
    vec2 floaty = vec2(
        0.04 * sin(time * 0.9 + uv.y * 5.0),
        0.04 * cos(time * 0.7 + uv.x * 5.0)
    );

    suv += floaty + depthPulse;

    // mouse pushes blobs away softly
    float mousePush = exp(-distMouse * 3.8) * 0.18;
    suv += (suv - m) * mousePush;

    // ----------------------------------------------------------
    // ⭐ MORE BLOBS + BIGGER BLOBS ⭐
    //   They cover the full screen but keep original behavior
    // ----------------------------------------------------------

    vec2 c1 = vec2(
        0.55 * sin(time * 0.40),
        0.45 * cos(time * 0.35)
    ) + floaty * 0.6;

    vec2 c2 = vec2(
        -0.60 * cos(time * 0.28),
        0.50 * sin(time * 0.22)
    ) + floaty * 0.5;

    vec2 c3 = vec2(
        0.52 * sin(time * 0.33 + 2.0),
        -0.55 * cos(time * 0.27 + 1.0)
    ) + floaty * 0.5;

    vec2 c4 = vec2(
        -0.50 * cos(time * 0.31 + 1.5),
        -0.48 * sin(time * 0.29 + 0.5)
    ) + floaty * 0.55;

    // NEW BLOBS — big soft background shapes
    vec2 c5 = vec2(
        0.80 * sin(time * 0.22 + 1.5),
        0.75 * cos(time * 0.18 + 2.2)
    );

    vec2 c6 = vec2(
        -0.85 * cos(time * 0.20 + 3.0),
        0.70 * sin(time * 0.25 + 0.8)
    );

    // ----------------------------------------------------------
    // SIZE BOOST
    // ----------------------------------------------------------
    float b = 0.0;
    b += blob(suv, c1, 0.45 + depthPulse);
    b += blob(suv, c2, 0.43 + depthPulse);
    b += blob(suv, c3, 0.42 + depthPulse);
    b += blob(suv, c4, 0.40 + depthPulse);

    // new large soft blobs
    b += blob(suv, c5, 0.60 + depthPulse);
    b += blob(suv, c6, 0.58 + depthPulse);

    b = clamp(b, 0.0, 1.0);

    // ----------------------------------------------------------
    // COLORS (same)
    // ----------------------------------------------------------
    vec3 dark = vec3(0.01, 0.0, 0.02);
    vec3 tint = vec3(0.25, 0.05, 0.35);

    vec3 col = mix(dark, tint, b * 0.25);

    gl_FragColor = vec4(col, 1.0);
}
`;

// Compile shader
function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

const prog = gl ? gl.createProgram() : null;
if (gl && prog) {
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);
}

// Quad
const buf = gl ? gl.createBuffer() : null;
if (gl && buf) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );
}

const posLoc = gl && prog ? gl.getAttribLocation(prog, "pos") : null;
if (gl && posLoc !== null) {
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
}

// Uniforms
const uTime = gl && prog ? gl.getUniformLocation(prog, "time") : null;
const uRes = gl && prog ? gl.getUniformLocation(prog, "res") : null;
const uMouse = gl && prog ? gl.getUniformLocation(prog, "mouse") : null;

function render(t) {
  if (!isActive) return;
  if (!gl) return;
  gl.uniform1f(uTime, t * 0.001);
  gl.uniform2f(uRes, bg.width, bg.height);
  gl.uniform2f(uMouse, mouseX, 1.0 - mouseY);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  bgRafId = requestAnimationFrame(render);
}
if (gl && bg) {
  render(0);
}

/* ================================================================
   DOT GRID (with mouse wave)
================================================================ */
// const dots = document.getElementById("bg-dots");
// const ctx = dots.getContext("2d");

// function resizeDots() {
//   dots.width = innerWidth;
//   dots.height = innerHeight;
// }
// resizeDots();
// addEventListener("resize", resizeDots);

// function drawDots() {
//   ctx.clearRect(0, 0, dots.width, dots.height);

//   const gap = 60;

//   // stronger, slightly bluish-white glow (looks good over purple)
//   ctx.fillStyle = "rgba(255,255,255,0.18)";

//   for (let x = 0; x < dots.width; x += gap) {
//     for (let y = 0; y < dots.height; y += gap) {
//       const dx = (mouseX - 0.5) * (x - dots.width / 2) * 0.0008;
//       const dy = (mouseY - 0.5) * (y - dots.height / 2) * 0.0008;

//       ctx.beginPath();
//       ctx.arc(x + dx, y + dy, 1.8, 0, Math.PI * 2); // bigger dot
//       ctx.fill();
//     }
//   }

//   requestAnimationFrame(drawDots);
// }

// drawDots();

// mouse fluid animation

  let sim = null;
  let fluidStartRafId = 0;
  const startFluid = () => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const rawWidth = rect.width || window.innerWidth;
    const rawHeight = rect.height || window.innerHeight;
    const width = Math.floor(rawWidth * dpr);
    const height = Math.floor(rawHeight * dpr);
    if (!width || !height) {
      fluidStartRafId = requestAnimationFrame(startFluid);
      return;
    }
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    sim = initFluid(canvas, {
      simResolution: 128,
      dyeResolution: 1024,
      curl: 5,
    splatForce: 7000,
    backColor: { r: 0.05, g: 0.0, b: 0.08 },
    transparent: true,
  });
};

  if (canvas) {
    startFluid();
  }



function initFluid(canvas, configOverrides = {}) {
  if (!canvas) {
    throw new Error("initFluid: canvas is required");
  }

  // ----------------------------------------------------
  // 1) CONFIG
  // ----------------------------------------------------
  const config = Object.assign(
    {
      simResolution: 128,
      dyeResolution: 1440,
      captureResolution: 512,
      densityDissipation: 3.5,
      velocityDissipation: 2.0,
      pressure: 0.1,
      pressureIterations: 20,
      curl: 30,
      splatRadius: 0.5, // % of screen, roughly
      splatForce: 15000,
      shading: true,
      colorUpdateSpeed: 10,
      backColor: { r: 0.5, g: 0, b: 0 },
      transparent: true,
    },
    configOverrides || {}
  );

  // ----------------------------------------------------
  // 2) POINTER STATE
  // ----------------------------------------------------
  function createPointer() {
    return {
      id: -1,
      texcoordX: 0,
      texcoordY: 0,
      prevTexcoordX: 0,
      prevTexcoordY: 0,
      deltaX: 0,
      deltaY: 0,
      down: false,
      moved: false,
      color: { r: 0, g: 0, b: 0 },
    };
  }

  const pointers = [createPointer()];

  // ----------------------------------------------------
  // 3) WEBGL CONTEXT + FORMAT SUPPORT
  // ----------------------------------------------------
  const glInfo = getWebGLContext(canvas);
  const gl = glInfo.gl;
  const ext = glInfo.ext;
  const isWebGL2 = glInfo.isWebGL2;

  if (!ext.supportLinearFiltering) {
    config.dyeResolution = 256;
    config.shading = false;
  }

  // ----------------------------------------------------
  // 4) SHADERS
  // ----------------------------------------------------
  const baseVertexShaderSource = `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;

    void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const copyFragmentShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    void main () {
      gl_FragColor = texture2D(uTexture, vUv);
    }
  `;

  const clearFragmentShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;
    void main () {
      gl_FragColor = value * texture2D(uTexture, vUv);
    }
  `;

  const displayFragmentShaderSource =
    (config.shading ? "#define SHADING\n" : "") +
    `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform vec2 texelSize;

    void main () {
      vec3 c = texture2D(uTexture, vUv).rgb;
      #ifdef SHADING
        vec3 lc = texture2D(uTexture, vL).rgb;
        vec3 rc = texture2D(uTexture, vR).rgb;
        vec3 tc = texture2D(uTexture, vT).rgb;
        vec3 bc = texture2D(uTexture, vB).rgb;

        float dx = length(rc) - length(lc);
        float dy = length(tc) - length(bc);

        vec3 n = normalize(vec3(dx, dy, length(texelSize)));
        vec3 l = vec3(0.0, 0.0, 1.0);

        float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
        c *= diffuse;
      #endif

      float a = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(c, a);
    }
  `;

  const splatFragmentShaderSource = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;

    void main () {
      vec2 p = vUv - point.xy;
      p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      vec3 base = texture2D(uTarget, vUv).xyz;
      gl_FragColor = vec4(base + splat, 1.0);
    }
  `;

  const advectionFragmentShaderSource =
    (!ext.supportLinearFiltering ? "#define MANUAL_FILTERING\n" : "") +
    `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
      vec2 st = uv / tsize - 0.5;
      vec2 iuv = floor(st);
      vec2 fuv = fract(st);

      vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
      vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
      vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
      vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

      return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {
      #ifdef MANUAL_FILTERING
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        vec4 result = bilerp(uSource, coord, dyeTexelSize);
      #else
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
      #endif
      float decay = 1.0 + dissipation * dt;
      gl_FragColor = result / decay;
    }
  `;

  const divergenceFragmentShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;

      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) { L = -C.x; }
      if (vR.x > 1.0) { R = -C.x; }
      if (vT.y > 1.0) { T = -C.y; }
      if (vB.y < 0.0) { B = -C.y; }

      float div = 0.5 * (R - L + T - B);
      gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
  `;

  const curlFragmentShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      float vorticity = R - L - T + B;
      gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
  `;

  const vorticityFragmentShaderSource = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;

    void main () {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;

      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;

      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity += force * dt;
      velocity = clamp(velocity, -1000.0, 1000.0);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `;

  const pressureFragmentShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;

    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float C = texture2D(uPressure, vUv).x;
      float divergence = texture2D(uDivergence, vUv).x;
      float pressure = (L + R + B + T - divergence) * 0.25;
      gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
  `;

  const gradientSubtractFragmentShaderSource = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;

    void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity.xy -= vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `;

  // ----------------------------------------------------
  // 5) PROGRAM CREATION
  // ----------------------------------------------------
  const baseProgramInfo = createProgramInfo(
    gl,
    baseVertexShaderSource,
    copyFragmentShaderSource
  ); // just to get the vertex shader compiled once
  const baseVertexShader = baseProgramInfo.vertexShader;

  const copyProgram = createProgramInfo(
    gl,
    baseVertexShaderSource,
    copyFragmentShaderSource
  );
  const clearProgram = createProgramInfo(
    gl,
    baseVertexShaderSource,
    clearFragmentShaderSource
  );
  const displayProgram = createProgramInfo(
    gl,
    baseVertexShaderSource,
    displayFragmentShaderSource
  );
  const splatProgram = createProgramInfo(
    gl,
    baseVertexShaderSource,
    splatFragmentShaderSource
  );
  const advectionProgram = createProgramInfo(
    gl,
    baseVertexShaderSource,
    advectionFragmentShaderSource
  );
  const divergenceProgram = createProgramInfo(
    gl,
    baseVertexShaderSource,
    divergenceFragmentShaderSource
  );
  const curlProgram = createProgramInfo(
    gl,
    baseVertexShaderSource,
    curlFragmentShaderSource
  );
  const vorticityProgram = createProgramInfo(
    gl,
    baseVertexShaderSource,
    vorticityFragmentShaderSource
  );
  const pressureProgram = createProgramInfo(
    gl,
    baseVertexShaderSource,
    pressureFragmentShaderSource
  );
  const gradientSubtractProgram = createProgramInfo(
    gl,
    baseVertexShaderSource,
    gradientSubtractFragmentShaderSource
  );

  // ----------------------------------------------------
  // 6) FULLSCREEN QUAD (BLIT)
  // ----------------------------------------------------
  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  function blit(target) {
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.viewport(0, 0, target.width, target.height);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ----------------------------------------------------
  // 7) FBO HELPERS
  // ----------------------------------------------------
  function createFBO(w, h, internalFormat, format, type, param) {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      w,
      h,
      0,
      format,
      type,
      null
    );

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const texelSizeX = 1 / w;
    const texelSizeY = 1 / h;

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX,
      texelSizeY,
      attach(id) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  function createDoubleFBO(w, h, internalFormat, format, type, param) {
    const fbo1 = createFBO(w, h, internalFormat, format, type, param);
    const fbo2 = createFBO(w, h, internalFormat, format, type, param);
    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      read: fbo1,
      write: fbo2,
      swap() {
        const temp = this.read;
        this.read = this.write;
        this.write = temp;
      },
    };
  }

  // ----------------------------------------------------
  // 8) FRAMEBUFFERS (VELOCITY, DYE, PRESSURE, ETC.)
  // ----------------------------------------------------
  let dyeFBO = null;
  let velocityFBO = null;
  let divergenceFBO = null;
  let curlFBO = null;
  let pressureFBO = null;

  function initFramebuffers() {
    const simRes = getResolution(config.simResolution);
    const dyeRes = getResolution(config.dyeResolution);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    gl.disable(gl.BLEND);

    dyeFBO = createDoubleFBO(
      dyeRes.width,
      dyeRes.height,
      rgba.internalFormat,
      rgba.format,
      texType,
      filtering
    );
    velocityFBO = createDoubleFBO(
      simRes.width,
      simRes.height,
      rg.internalFormat,
      rg.format,
      texType,
      filtering
    );
    divergenceFBO = createFBO(
      simRes.width,
      simRes.height,
      r.internalFormat,
      r.format,
      texType,
      gl.NEAREST
    );
    curlFBO = createFBO(
      simRes.width,
      simRes.height,
      r.internalFormat,
      r.format,
      texType,
      gl.NEAREST
    );
    pressureFBO = createDoubleFBO(
      simRes.width,
      simRes.height,
      r.internalFormat,
      r.format,
      texType,
      gl.NEAREST
    );
  }

  // ----------------------------------------------------
  // 9) RESOLUTION / CANVAS HELPERS
  // ----------------------------------------------------
  function getResolution(baseResolution) {
    const w = gl.drawingBufferWidth || canvas.clientWidth || canvas.width;
    const h = gl.drawingBufferHeight || canvas.clientHeight || canvas.height;
    const aspectRatio = w / h;
    const aspect = aspectRatio < 1 ? 1 / aspectRatio : aspectRatio;
    const min = Math.round(baseResolution);
    const max = Math.round(baseResolution * aspect);
    if (w > h) {
      return { width: max, height: min };
    }
    return { width: min, height: max };
  }

  function scaleByPixelRatio(input) {
    const pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
  }

  function resizeCanvas() {
    const width = scaleByPixelRatio(canvas.clientWidth || canvas.width);
    const height = scaleByPixelRatio(canvas.clientHeight || canvas.height);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      return true;
    }
    return false;
  }

  // ----------------------------------------------------
  // 10) COLOR HELPERS
  // ----------------------------------------------------
  function HSVtoRGB(h, s, v) {
    let r = 0,
      g = 0,
      b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0:
        (r = v), (g = t), (b = p);
        break;
      case 1:
        (r = q), (g = v), (b = p);
        break;
      case 2:
        (r = p), (g = v), (b = t);
        break;
      case 3:
        (r = p), (g = q), (b = v);
        break;
      case 4:
        (r = t), (g = p), (b = v);
        break;
      case 5:
        (r = v), (g = p), (b = q);
        break;
    }
    return { r, g, b };
  }

  function generateColor() {
    const c = HSVtoRGB(Math.random(), 1.0, 1.0);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
  }

  // ----------------------------------------------------
  // 11) POINTER MATH
  // ----------------------------------------------------
  function correctRadius(radius) {
    const aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) radius *= aspectRatio;
    return radius;
  }

  function correctDeltaX(delta) {
    const aspectRatio = canvas.width / canvas.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
  }

  function correctDeltaY(delta) {
    const aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
  }

  function updatePointerDown(pointer, id, posX, posY) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1 - posY / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = generateColor();
  }

  function updatePointerMove(pointer, posX, posY, color) {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1 - posY / canvas.height;
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved =
      Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    pointer.color = color;
  }

  function updatePointerUp(pointer) {
    pointer.down = false;
  }

  // ----------------------------------------------------
  // 12) SPLATS (INPUT INTO SIMULATION)
  // ----------------------------------------------------
  function splat(x, y, dx, dy, color) {
    // to velocity
    gl.useProgram(splatProgram.program);
    if (splatProgram.uniforms.texelSize) {
      gl.uniform2f(
        splatProgram.uniforms.texelSize,
        velocityFBO.texelSizeX,
        velocityFBO.texelSizeY
      );
    }
    if (splatProgram.uniforms.uTarget) {
      gl.uniform1i(splatProgram.uniforms.uTarget, velocityFBO.read.attach(0));
    }
    if (splatProgram.uniforms.aspectRatio) {
      gl.uniform1f(
        splatProgram.uniforms.aspectRatio,
        canvas.width / canvas.height
      );
    }
    if (splatProgram.uniforms.point) {
      gl.uniform2f(splatProgram.uniforms.point, x, y);
    }
    if (splatProgram.uniforms.color) {
      gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
    }
    if (splatProgram.uniforms.radius) {
      gl.uniform1f(
        splatProgram.uniforms.radius,
        correctRadius(config.splatRadius / 100)
      );
    }
    blit(velocityFBO.write);
    velocityFBO.swap();

    // to dye
    if (splatProgram.uniforms.uTarget) {
      gl.uniform1i(splatProgram.uniforms.uTarget, dyeFBO.read.attach(0));
    }
    if (splatProgram.uniforms.color) {
      gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    }
    blit(dyeFBO.write);
    dyeFBO.swap();
  }

  function splatPointer(pointer) {
    const dx = pointer.deltaX * config.splatForce;
    const dy = pointer.deltaY * config.splatForce;
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
  }

  function clickSplat(pointer) {
    const color = generateColor();
    color.r *= 10;
    color.g *= 10;
    color.b *= 10;
    const dx = 10 * (Math.random() - 0.5);
    const dy = 30 * (Math.random() - 0.5);
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, color);
  }

  // ----------------------------------------------------
  // 13) SIMULATION STEP
  // ----------------------------------------------------
  let lastTime = Date.now();
  let colorUpdateTimer = 0.0;
  let running = true;
  let frameId = 0;

  function calcDeltaTime() {
    const now = Date.now();
    let dt = (now - lastTime) / 1000;
    dt = Math.min(dt, 0.016666);
    lastTime = now;
    return dt;
  }

  function updateColors(dt) {
    colorUpdateTimer += dt * config.colorUpdateSpeed;
    if (colorUpdateTimer >= 1) {
      colorUpdateTimer = colorUpdateTimer % 1;
      pointers.forEach((p) => {
        p.color = generateColor();
      });
    }
  }

  function applyInputs() {
    for (const p of pointers) {
      if (p.moved) {
        p.moved = false;
        splatPointer(p);
      }
    }
  }

  function step(dt) {
    gl.disable(gl.BLEND);

    // Curl
    gl.useProgram(curlProgram.program);
    if (curlProgram.uniforms.texelSize) {
      gl.uniform2f(
        curlProgram.uniforms.texelSize,
        velocityFBO.texelSizeX,
        velocityFBO.texelSizeY
      );
    }
    if (curlProgram.uniforms.uVelocity) {
      gl.uniform1i(curlProgram.uniforms.uVelocity, velocityFBO.read.attach(0));
    }
    blit(curlFBO);

    // Vorticity
    gl.useProgram(vorticityProgram.program);
    if (vorticityProgram.uniforms.texelSize) {
      gl.uniform2f(
        vorticityProgram.uniforms.texelSize,
        velocityFBO.texelSizeX,
        velocityFBO.texelSizeY
      );
    }
    if (vorticityProgram.uniforms.uVelocity) {
      gl.uniform1i(
        vorticityProgram.uniforms.uVelocity,
        velocityFBO.read.attach(0)
      );
    }
    if (vorticityProgram.uniforms.uCurl) {
      gl.uniform1i(vorticityProgram.uniforms.uCurl, curlFBO.attach(1));
    }
    if (vorticityProgram.uniforms.curl) {
      gl.uniform1f(vorticityProgram.uniforms.curl, config.curl);
    }
    if (vorticityProgram.uniforms.dt) {
      gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    }
    blit(velocityFBO.write);
    velocityFBO.swap();

    // Divergence
    gl.useProgram(divergenceProgram.program);
    if (divergenceProgram.uniforms.texelSize) {
      gl.uniform2f(
        divergenceProgram.uniforms.texelSize,
        velocityFBO.texelSizeX,
        velocityFBO.texelSizeY
      );
    }
    if (divergenceProgram.uniforms.uVelocity) {
      gl.uniform1i(
        divergenceProgram.uniforms.uVelocity,
        velocityFBO.read.attach(0)
      );
    }
    blit(divergenceFBO);

    // Clear pressure
    gl.useProgram(clearProgram.program);
    if (clearProgram.uniforms.uTexture) {
      gl.uniform1i(clearProgram.uniforms.uTexture, pressureFBO.read.attach(0));
    }
    if (clearProgram.uniforms.value) {
      gl.uniform1f(clearProgram.uniforms.value, config.pressure);
    }
    blit(pressureFBO.write);
    pressureFBO.swap();

    // Pressure iterations
    gl.useProgram(pressureProgram.program);
    if (pressureProgram.uniforms.texelSize) {
      gl.uniform2f(
        pressureProgram.uniforms.texelSize,
        velocityFBO.texelSizeX,
        velocityFBO.texelSizeY
      );
    }
    if (pressureProgram.uniforms.uDivergence) {
      gl.uniform1i(
        pressureProgram.uniforms.uDivergence,
        divergenceFBO.attach(0)
      );
    }

    for (let i = 0; i < config.pressureIterations; i++) {
      if (pressureProgram.uniforms.uPressure) {
        gl.uniform1i(
          pressureProgram.uniforms.uPressure,
          pressureFBO.read.attach(1)
        );
      }
      blit(pressureFBO.write);
      pressureFBO.swap();
    }

    // Gradient subtract
    gl.useProgram(gradientSubtractProgram.program);
    if (gradientSubtractProgram.uniforms.texelSize) {
      gl.uniform2f(
        gradientSubtractProgram.uniforms.texelSize,
        velocityFBO.texelSizeX,
        velocityFBO.texelSizeY
      );
    }
    if (gradientSubtractProgram.uniforms.uPressure) {
      gl.uniform1i(
        gradientSubtractProgram.uniforms.uPressure,
        pressureFBO.read.attach(0)
      );
    }
    if (gradientSubtractProgram.uniforms.uVelocity) {
      gl.uniform1i(
        gradientSubtractProgram.uniforms.uVelocity,
        velocityFBO.read.attach(1)
      );
    }
    blit(velocityFBO.write);
    velocityFBO.swap();

    // Advection - velocity
    gl.useProgram(advectionProgram.program);
    if (advectionProgram.uniforms.texelSize) {
      gl.uniform2f(
        advectionProgram.uniforms.texelSize,
        velocityFBO.texelSizeX,
        velocityFBO.texelSizeY
      );
    }
    if (!ext.supportLinearFiltering && advectionProgram.uniforms.dyeTexelSize) {
      gl.uniform2f(
        advectionProgram.uniforms.dyeTexelSize,
        velocityFBO.texelSizeX,
        velocityFBO.texelSizeY
      );
    }
    const velocityId = velocityFBO.read.attach(0);
    if (advectionProgram.uniforms.uVelocity) {
      gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
    }
    if (advectionProgram.uniforms.uSource) {
      gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
    }
    if (advectionProgram.uniforms.dt) {
      gl.uniform1f(advectionProgram.uniforms.dt, dt);
    }
    if (advectionProgram.uniforms.dissipation) {
      gl.uniform1f(
        advectionProgram.uniforms.dissipation,
        config.velocityDissipation
      );
    }
    blit(velocityFBO.write);
    velocityFBO.swap();

    // Advection - dye
    if (!ext.supportLinearFiltering && advectionProgram.uniforms.dyeTexelSize) {
      gl.uniform2f(
        advectionProgram.uniforms.dyeTexelSize,
        dyeFBO.texelSizeX,
        dyeFBO.texelSizeY
      );
    }
    if (advectionProgram.uniforms.uVelocity) {
      gl.uniform1i(
        advectionProgram.uniforms.uVelocity,
        velocityFBO.read.attach(0)
      );
    }
    if (advectionProgram.uniforms.uSource) {
      gl.uniform1i(advectionProgram.uniforms.uSource, dyeFBO.read.attach(1));
    }
    if (advectionProgram.uniforms.dissipation) {
      gl.uniform1f(
        advectionProgram.uniforms.dissipation,
        config.densityDissipation
      );
    }
    blit(dyeFBO.write);
    dyeFBO.swap();
  }

  // ----------------------------------------------------
  // 14) RENDER
  // ----------------------------------------------------
  function render() {
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;

    gl.useProgram(displayProgram.program);
    if (displayProgram.uniforms.texelSize) {
      gl.uniform2f(displayProgram.uniforms.texelSize, 1 / width, 1 / height);
    }
    if (displayProgram.uniforms.uTexture) {
      gl.uniform1i(displayProgram.uniforms.uTexture, dyeFBO.read.attach(0));
    }
    blit(null);
  }

  // ----------------------------------------------------
  // 15) MAIN LOOP
  // ----------------------------------------------------
  function frame() {
    if (!running) return;

    const dt = calcDeltaTime();
    if (resizeCanvas()) {
      initFramebuffers();
    }

    updateColors(dt);
    applyInputs();
    step(dt);
    render();

    frameId = requestAnimationFrame(frame);
  }

  // ----------------------------------------------------
  // 16) INPUT EVENTS
  // ----------------------------------------------------
  function handleMouseDown(e) {
    const pointer = pointers[0];
    const posX = scaleByPixelRatio(e.clientX);
    const posY = scaleByPixelRatio(e.clientY);
    updatePointerDown(pointer, -1, posX, posY);
    clickSplat(pointer);
  }

  function handleMouseMove(e) {
    const pointer = pointers[0];
    const posX = scaleByPixelRatio(e.clientX);
    const posY = scaleByPixelRatio(e.clientY);
    const color = pointer.color;
    updatePointerMove(pointer, posX, posY, color);
  }

  function handleTouchStart(e) {
    const touches = e.targetTouches;
    const pointer = pointers[0];
    for (let i = 0; i < touches.length; i++) {
      const posX = scaleByPixelRatio(touches[i].clientX);
      const posY = scaleByPixelRatio(touches[i].clientY);
      updatePointerDown(pointer, touches[i].identifier, posX, posY);
    }
  }

  function handleTouchMove(e) {
    const touches = e.targetTouches;
    const pointer = pointers[0];
    for (let i = 0; i < touches.length; i++) {
      const posX = scaleByPixelRatio(touches[i].clientX);
      const posY = scaleByPixelRatio(touches[i].clientY);
      updatePointerMove(pointer, posX, posY, pointer.color);
    }
  }

  function handleTouchEnd(e) {
    const pointer = pointers[0];
    updatePointerUp(pointer);
  }

  window.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("touchstart", handleTouchStart, { passive: true });
  window.addEventListener("touchmove", handleTouchMove, { passive: true });
  window.addEventListener("touchend", handleTouchEnd, { passive: true });

  // ----------------------------------------------------
  // 17) INIT + START
  // ----------------------------------------------------
  resizeCanvas();
  initFramebuffers();
  lastTime = Date.now();
  frameId = requestAnimationFrame(frame);

  // ----------------------------------------------------
  // 18) PUBLIC API
  // ----------------------------------------------------
  function pause() {
    running = false;
  }

  function resume() {
    if (!running) {
      running = true;
      lastTime = Date.now();
      requestAnimationFrame(frame);
    }
  }

  function destroy() {
    running = false;
    if (frameId) {
      cancelAnimationFrame(frameId);
    }
    window.removeEventListener("mousedown", handleMouseDown);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("touchstart", handleTouchStart);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleTouchEnd);
  }

  return { pause, resume, destroy };
}

// ======================================================================
// Helper: WebGL context + format support
// ======================================================================
function getWebGLContext(canvas) {
  const params = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
  };

  let gl =
    canvas.getContext("webgl2", params) ||
    canvas.getContext("webgl", params) ||
    canvas.getContext("experimental-webgl", params);

  if (!gl) {
    throw new Error("Unable to initialize WebGL.");
  }

  const isWebGL2 =
    typeof WebGL2RenderingContext !== "undefined" &&
    gl instanceof WebGL2RenderingContext;

  let halfFloat = null;
  let supportLinearFiltering = false;

  if (isWebGL2) {
    gl.getExtension("EXT_color_buffer_float");
    supportLinearFiltering = !!gl.getExtension("OES_texture_float_linear");
  } else {
    halfFloat = gl.getExtension("OES_texture_half_float");
    supportLinearFiltering = !!gl.getExtension("OES_texture_half_float_linear");
  }

  const halfFloatTexType = isWebGL2
    ? gl.HALF_FLOAT
    : halfFloat
    ? halfFloat.HALF_FLOAT_OES
    : 0;

  function supportFormat(internalFormat, format, type) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      4,
      4,
      0,
      format,
      type,
      null
    );

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status === gl.FRAMEBUFFER_COMPLETE;
  }

  function getSupportedFormat(internalFormat, format, type) {
    if (supportFormat(internalFormat, format, type)) {
      return { internalFormat, format };
    }
    if (!isWebGL2) {
      return { internalFormat: gl.RGBA, format: gl.RGBA };
    }
    // WebGL2 fallback chain
    switch (internalFormat) {
      case gl.R16F:
        return getSupportedFormat(gl.RG16F, gl.RG, type);
      case gl.RG16F:
        return getSupportedFormat(gl.RGBA16F, gl.RGBA, type);
      default:
        return { internalFormat: gl.RGBA16F, format: gl.RGBA };
    }
  }

  const ext = {
    formatRGBA: getSupportedFormat(
      isWebGL2 ? gl.RGBA16F : gl.RGBA,
      gl.RGBA,
      halfFloatTexType
    ),
    formatRG: getSupportedFormat(
      isWebGL2 ? gl.RG16F : gl.RGBA,
      isWebGL2 ? gl.RG : gl.RGBA,
      halfFloatTexType
    ),
    formatR: getSupportedFormat(
      isWebGL2 ? gl.R16F : gl.RGBA,
      isWebGL2 ? gl.RED : gl.RGBA,
      halfFloatTexType
    ),
    halfFloatTexType,
    supportLinearFiltering,
  };

  return { gl, ext, isWebGL2 };
}

// ======================================================================
// Helper: Program creation
// ======================================================================
function createProgramInfo(gl, vsSource, fsSource) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  // Always use location 0 for aPosition
  gl.bindAttribLocation(program, 0, "aPosition");
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error("Could not link WebGL program: " + info);
  }

  const uniforms = {};
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < uniformCount; i++) {
    const uniformInfo = gl.getActiveUniform(program, i);
    if (!uniformInfo) continue;
    uniforms[uniformInfo.name] = gl.getUniformLocation(
      program,
      uniformInfo.name
    );
  }

  return { program, uniforms, vertexShader, fragmentShader };
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Could not compile shader:\n" + info);
  }
  return shader;
}

  const cleanup = () => {
    isActive = false;
    if (bgRafId) {
      cancelAnimationFrame(bgRafId);
    }
    if (fluidStartRafId) {
      cancelAnimationFrame(fluidStartRafId);
    }
    if (bg && gl) {
      window.removeEventListener("resize", resizeBG);
      document.removeEventListener("mousemove", onMouseMove);
    }
    sim?.destroy?.();
  };

  return cleanup;
}
