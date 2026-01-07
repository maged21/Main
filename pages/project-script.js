import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { projects } from "./data.js";
import { vertexShader, fragmentShader } from "./shaders.js";

export default function initProjects() {
  const config = {
    cellSize: 0.75,
    zoomLevel: 1.25,
    lerpFactor: 0.075,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(0, 0, 0, 1)",
    textColor: "rgba(128, 128, 128, 1)",
    hoverColor: "rgba(255, 255, 255, 0)",
  };

  let scene, camera, renderer, plane;

  let isDragging = false;
  let isClick = true;
  let clickStartTime = 0;
  let isActive = true;
  let animationFrameId = 0;

  let previousMouse = { x: 0, y: 0 };
  let offset = { x: 0, y: 0 };
  let targetOffset = { x: 0, y: 0 };
  let mousePosition = { x: -1, y: -1 };
  let zoomLevel = 1.0;
  let targetZoom = 1.0;

  let textTextures = [];
  let imageAtlas = null;
  let imageAtlasCanvas = null;
  let imageAtlasCtx = null;
  let videoTiles = [];
  let hasVideoTiles = false;

  const isMenuOpen = () =>
    typeof window.__menuIsOpen === "function" && window.__menuIsOpen();

  // Block ONLY when clicking menu toggle or inside overlay (not menu-bar)
  const isUIEvent = (e) => {
    const t = e?.target;
    if (!t || typeof t.closest !== "function") return false;
    if (isMenuOpen()) return true;
    return !!t.closest(".menu-toggle-btn, .menu-overlay, .menu-overlay *");
  };

  const rgbaToArray = (rgba) => {
    const match = rgba.match(/rgba?\(([^)]+)\)/);
    if (!match) return [1, 1, 1, 1];
    return match[1]
      .split(",")
      .map((v, i) =>
        i < 3 ? parseFloat(v.trim()) / 255 : parseFloat(v.trim() || 1)
      );
  };

  const createTextTexture = (title, year) => {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, 2048, 256);
    ctx.font = "80px IBM Plex Mono";
    ctx.fillStyle = config.textColor;
    ctx.textBaseline = "middle";
    ctx.imageSmoothingEnabled = false;

    ctx.textAlign = "left";
    ctx.fillText(title.toUpperCase(), 30, 128);
    ctx.textAlign = "right";
    ctx.fillText(year.toString().toUpperCase(), 2048 - 30, 128);

    const texture = new THREE.CanvasTexture(canvas);
    Object.assign(texture, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      flipY: false,
      generateMipmaps: false,
      format: THREE.RGBAFormat,
    });

    return texture;
  };

  const createTextureAtlas = (textures, isText = false) => {
    const atlasSize = Math.ceil(Math.sqrt(textures.length));
    const textureSize = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = atlasSize * textureSize;
    const ctx = canvas.getContext("2d");

    if (isText) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    textures.forEach((texture, index) => {
      const x = (index % atlasSize) * textureSize;
      const y = Math.floor(index / atlasSize) * textureSize;

      if (isText && texture.source?.data) {
        ctx.drawImage(texture.source.data, x, y, textureSize, textureSize);
      } else if (!isText && texture.image?.complete) {
        ctx.drawImage(texture.image, x, y, textureSize, textureSize);
      }
    });

    const atlasTexture = new THREE.CanvasTexture(canvas);
    Object.assign(atlasTexture, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      flipY: false,
    });

    return atlasTexture;
  };

  const loadTextures = () => {
    const textureLoader = new THREE.TextureLoader();
    const imageTextures = [];
    let loadedCount = 0;

    return new Promise((resolve) => {
      projects.forEach((project) => {
        const texture = textureLoader.load(project.image, () => {
          if (++loadedCount === projects.length) resolve(imageTextures);
        });

        Object.assign(texture, {
          wrapS: THREE.ClampToEdgeWrapping,
          wrapT: THREE.ClampToEdgeWrapping,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
        });

        imageTextures.push(texture);
        textTextures.push(createTextTexture(project.title, project.year));
      });
    });
  };

  const loadMediaAtlas = () => {
    const textureSize = 512;
    const atlasSize = Math.ceil(Math.sqrt(projects.length));
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = atlasSize * textureSize;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    imageAtlasCanvas = canvas;
    imageAtlasCtx = ctx;
    videoTiles = [];
    hasVideoTiles = false;

    const mediaItems = projects.map((project, index) => {
      const tileX = (index % atlasSize) * textureSize;
      const tileY = Math.floor(index / atlasSize) * textureSize;
      const base = {
        index,
        tileX,
        tileY,
        size: textureSize,
        project,
        type: "image",
        element: null,
      };

      if (project.video) {
        const video = document.createElement("video");
        video.src = project.video;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "auto";
        base.type = "video";
        base.element = video;
      } else {
        const img = new Image();
        img.src = project.image;
        base.element = img;
      }

      return base;
    });

    return new Promise((resolve) => {
      let loadedCount = 0;
      const finish = () => {
        loadedCount += 1;
        if (loadedCount === mediaItems.length) {
          mediaItems.forEach((item) => {
            if (!item.element) return;
            if (item.type === "image") {
              ctx.drawImage(item.element, item.tileX, item.tileY, item.size, item.size);
            } else if (item.type === "video") {
              if (item.element.readyState >= 2) {
                ctx.drawImage(item.element, item.tileX, item.tileY, item.size, item.size);
                videoTiles.push(item);
                hasVideoTiles = true;
              }
            }
          });

          imageAtlas = new THREE.CanvasTexture(canvas);
          Object.assign(imageAtlas, {
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            flipY: false,
          });

          resolve(imageAtlas);
        }
      };

      mediaItems.forEach((item) => {
        if (item.type === "image") {
          item.element.onload = finish;
          item.element.onerror = finish;
        } else if (item.type === "video") {
          const video = item.element;
          const onReady = () => {
            video.play().catch(() => {});
            finish();
          };
          const onError = () => {
            if (item.project.image) {
              const fallback = new Image();
              fallback.src = item.project.image;
              item.type = "image";
              item.element = fallback;
              fallback.onload = finish;
              fallback.onerror = finish;
              return;
            }
            finish();
          };
          video.addEventListener("canplay", onReady, { once: true });
          video.addEventListener("error", onError, { once: true });
        }
      });
    });
  };

  const updateMousePosition = (event) => {
    if (!renderer) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mousePosition.x = event.clientX - rect.left;
    mousePosition.y = event.clientY - rect.top;
    plane?.material.uniforms.uMousePos.value.set(mousePosition.x, mousePosition.y);
  };

  const onRendererLeave = () => {
    mousePosition.x = mousePosition.y = -1;
    plane?.material.uniforms.uMousePos.value.set(-1, -1);
  };

  const onContextMenu = (e) => e.preventDefault();

  const startDrag = (x, y) => {
    if (isMenuOpen()) return;

    isDragging = true;
    isClick = true;
    clickStartTime = Date.now();
    document.body.classList.add("dragging");
    previousMouse.x = x;
    previousMouse.y = y;
    setTimeout(() => isDragging && (targetZoom = config.zoomLevel), 150);
  };

  const onPointerDown = (e) => {
    if (isUIEvent(e)) return;
    startDrag(e.clientX, e.clientY);
  };

  const onTouchStart = (e) => {
    if (isUIEvent(e)) return;
    e.preventDefault();
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleMove = (currentX, currentY) => {
    if (!isDragging || currentX === undefined || currentY === undefined) return;

    const deltaX = currentX - previousMouse.x;
    const deltaY = currentY - previousMouse.y;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      isClick = false;
      if (targetZoom === 1.0) targetZoom = config.zoomLevel;
    }

    targetOffset.x -= deltaX * 0.003;
    targetOffset.y += deltaY * 0.003;
    previousMouse.x = currentX;
    previousMouse.y = currentY;
  };

  const onPointerMove = (e) => {
    if (isUIEvent(e)) return;
    handleMove(e.clientX, e.clientY);
  };

  const onTouchMove = (e) => {
    if (isUIEvent(e)) return;
    e.preventDefault();
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const onPointerUp = (event) => {
    if (isUIEvent(event)) return;

    isDragging = false;
    document.body.classList.remove("dragging");
    targetZoom = 1.0;

    if (isMenuOpen()) return;

    if (isClick && Date.now() - clickStartTime < 200) {
      const endX = event.clientX || event.changedTouches?.[0]?.clientX;
      const endY = event.clientY || event.changedTouches?.[0]?.clientY;

      if (endX !== undefined && endY !== undefined && renderer) {
        const rect = renderer.domElement.getBoundingClientRect();
        const screenX = ((endX - rect.left) / rect.width) * 2 - 1;
        const screenY = -(((endY - rect.top) / rect.height) * 2 - 1);

        const radius = Math.sqrt(screenX * screenX + screenY * screenY);
        const distortion = 1.0 - 0.08 * radius * radius;

        let worldX =
          screenX * distortion * (rect.width / rect.height) * zoomLevel + offset.x;
        let worldY = screenY * distortion * zoomLevel + offset.y;

        const cellX = Math.floor(worldX / config.cellSize);
        const cellY = Math.floor(worldY / config.cellSize);
        const texIndex = Math.floor((cellX + cellY * 3.0) % projects.length);
        const actualIndex = texIndex < 0 ? projects.length + texIndex : texIndex;

        if (projects[actualIndex]?.href) {
          window.open(projects[actualIndex].href, "_blank", "noopener");
        }
      }
    }
  };

  const onWindowResize = () => {
    const container = document.getElementById("gallery");
    if (!container || !renderer || !camera) return;

    const { offsetWidth: width, offsetHeight: height } = container;
    if (!width || !height) return;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    plane?.material.uniforms.uResolution.value.set(width, height);
  };

  const setupEventListeners = () => {
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("mousemove", onPointerMove);
    document.addEventListener("mouseup", onPointerUp);
    document.addEventListener("mouseleave", onPointerUp);

    const passiveOpts = { passive: false };
    document.addEventListener("touchstart", onTouchStart, passiveOpts);
    document.addEventListener("touchmove", onTouchMove, passiveOpts);
    document.addEventListener("touchend", onPointerUp, passiveOpts);

    window.addEventListener("resize", onWindowResize);
    document.addEventListener("contextmenu", onContextMenu);

    renderer?.domElement.addEventListener("mousemove", updateMousePosition);
    renderer?.domElement.addEventListener("mouseleave", onRendererLeave);
  };

  const removeEventListeners = () => {
    document.removeEventListener("mousedown", onPointerDown);
    document.removeEventListener("mousemove", onPointerMove);
    document.removeEventListener("mouseup", onPointerUp);
    document.removeEventListener("mouseleave", onPointerUp);

    const passiveOpts = { passive: false };
    document.removeEventListener("touchstart", onTouchStart, passiveOpts);
    document.removeEventListener("touchmove", onTouchMove, passiveOpts);
    document.removeEventListener("touchend", onPointerUp, passiveOpts);

    window.removeEventListener("resize", onWindowResize);
    document.removeEventListener("contextmenu", onContextMenu);

    renderer?.domElement.removeEventListener("mousemove", updateMousePosition);
    renderer?.domElement.removeEventListener("mouseleave", onRendererLeave);
  };

  const animate = () => {
    if (!isActive) return;
    animationFrameId = requestAnimationFrame(animate);

    offset.x += (targetOffset.x - offset.x) * config.lerpFactor;
    offset.y += (targetOffset.y - offset.y) * config.lerpFactor;
    zoomLevel += (targetZoom - zoomLevel) * config.lerpFactor;

    if (plane?.material.uniforms) {
      plane.material.uniforms.uOffset.value.set(offset.x, offset.y);
      plane.material.uniforms.uZoom.value = zoomLevel;
    }

    if (hasVideoTiles && imageAtlasCtx && imageAtlas) {
      let updated = false;
      videoTiles.forEach((tile) => {
        if (tile.element?.readyState >= 2) {
          imageAtlasCtx.drawImage(
            tile.element,
            tile.tileX,
            tile.tileY,
            tile.size,
            tile.size
          );
          updated = true;
        }
      });
      if (updated) {
        imageAtlas.needsUpdate = true;
      }
    }

    renderer?.render(scene, camera);
  };

  const init = async () => {
    const container = document.getElementById("gallery");
    if (!container) return;

    const { offsetWidth: initWidth, offsetHeight: initHeight } = container;
    if (!initWidth || !initHeight) {
      requestAnimationFrame(init);
      return;
    }

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(initWidth, initHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const bgColor = rgbaToArray(config.backgroundColor);
    renderer.setClearColor(
      new THREE.Color(bgColor[0], bgColor[1], bgColor[2]),
      bgColor[3]
    );
    container.appendChild(renderer.domElement);

    await loadTextures();
    const imageAtlasTexture = await loadMediaAtlas();
    const textAtlas = createTextureAtlas(textTextures, true);

    const uniforms = {
      uOffset: { value: new THREE.Vector2(0, 0) },
      uResolution: { value: new THREE.Vector2(initWidth, initHeight) },
      uBorderColor: { value: new THREE.Vector4(...rgbaToArray(config.borderColor)) },
      uHoverColor: { value: new THREE.Vector4(...rgbaToArray(config.hoverColor)) },
      uBackgroundColor: { value: new THREE.Vector4(...rgbaToArray(config.backgroundColor)) },
      uMousePos: { value: new THREE.Vector2(-1, -1) },
      uZoom: { value: 1.0 },
      uCellSize: { value: config.cellSize },
      uTextureCount: { value: projects.length },
      uImageAtlas: { value: imageAtlasTexture },
      uTextAtlas: { value: textAtlas },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    });

    plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    setupEventListeners();
    animate();

    if (window.gsap) {
      gsap.fromTo(
        container,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: "power3.out", clearProps: "opacity" }
      );
    }

    window.__pageCleanup = () => {
      isActive = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      removeEventListeners();
      renderer?.domElement?.remove();
      renderer?.dispose?.();
      renderer = null;
      scene = null;
      camera = null;
      plane = null;
    };
  };

  init();

  const prevCleanup = window.__pageCleanup;
  window.__pageCleanup = () => {
    if (typeof prevCleanup === "function") prevCleanup();
  };
}
