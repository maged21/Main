export default function initHome() {
  const initLenis = () => {
    if (window.__lenisTicker && window.gsap) {
      gsap.ticker.remove(window.__lenisTicker);
      window.__lenisTicker = null;
    }

    if (window.lenis?.destroy) {
      window.lenis.destroy();
    }

    const lenis = new Lenis();
    window.lenis = lenis;

    const tick = (time) => lenis.raf(time * 1000);
    window.__lenisTicker = tick;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return lenis;
  };

  const run = () => {
    let pageActive = true;
    const cleanupFns = [];
    const addCleanup = (fn) => cleanupFns.push(fn);
    const config = {
      symbols: ["O", "X", "*", ">", "$", "W"],
      blockSize: 25,
      detectionRadius: 50,
      clusterSize: 7,
      blockLifetime: 300,
      emptyRatio: 0.3,
      scrambleRatio: 0.25,
      scrambleInterval: 150,
    };

    const getRandomSymbol = () =>
      config.symbols[Math.floor(Math.random() * config.symbols.length)];

    const initGridOverlay = (element) => {
      const gridOverlay = document.createElement("div");
      gridOverlay.className = "grid-overlay";

      const width = element.offsetWidth;
      const height = element.offsetHeight;
      const cols = Math.ceil(width / config.blockSize);
      const rows = Math.ceil(height / config.blockSize);

      const blocks = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const block = document.createElement("div");
          block.className = "grid-block";

          const isEmpty = Math.random() < config.emptyRatio;
          block.textContent = isEmpty ? "" : getRandomSymbol();

          block.style.width = `${config.blockSize}px`;
          block.style.height = `${config.blockSize}px`;
          block.style.left = `${col * config.blockSize}px`;
          block.style.top = `${row * config.blockSize}px`;

          gridOverlay.appendChild(block);

          blocks.push({
            element: block,
            x: col * config.blockSize + config.blockSize / 2,
            y: row * config.blockSize + config.blockSize / 2,
            gridX: col,
            gridY: row,
            highlightEndTime: 0,
            isEmpty: isEmpty,
            shouldScramble: !isEmpty && Math.random() < config.scrambleRatio,
            scrambleInterval: null,
          });
        }
      }

      element.appendChild(gridOverlay);

      element.addEventListener("mousemove", (e) => {
        const rect = element.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let closestBlock = null;
        let closestDistance = Infinity;

        for (const block of blocks) {
          const dx = mouseX - block.x;
          const dy = mouseY - block.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestBlock = block;
          }
        }

        if (!closestBlock || closestDistance > config.detectionRadius) return;

        const currentTime = Date.now();
        closestBlock.element.classList.add("active");
        closestBlock.highlightEndTime = currentTime + config.blockLifetime;

        if (closestBlock.shouldScramble && !closestBlock.scrambleInterval) {
          closestBlock.scrambleInterval = setInterval(() => {
            closestBlock.element.textContent = getRandomSymbol();
          }, config.scrambleInterval);
        }

        const clusterCount = Math.floor(Math.random() * config.clusterSize) + 1;
        let currentBlock = closestBlock;
        const activeBlocks = [closestBlock];

        for (let i = 0; i < clusterCount; i++) {
          const neighbors = blocks.filter((neighbor) => {
            if (activeBlocks.includes(neighbor)) return false;

            const dx = Math.abs(neighbor.gridX - currentBlock.gridX);
            const dy = Math.abs(neighbor.gridY - currentBlock.gridY);

            return dx <= 1 && dy <= 1;
          });

          if (neighbors.length === 0) break;

          const randomNeighbor =
            neighbors[Math.floor(Math.random() * neighbors.length)];

          randomNeighbor.element.classList.add("active");
          randomNeighbor.highlightEndTime =
            currentTime + config.blockLifetime + i * 10;

          if (randomNeighbor.shouldScramble && !randomNeighbor.scrambleInterval) {
            randomNeighbor.scrambleInterval = setInterval(() => {
              randomNeighbor.element.textContent = getRandomSymbol();
            }, config.scrambleInterval);
          }

          activeBlocks.push(randomNeighbor);
          currentBlock = randomNeighbor;
        }
      });

      const updateHighlights = () => {
        if (!pageActive) return;
        const currentTime = Date.now();

        blocks.forEach((block) => {
          if (block.highlightEndTime > 0 && currentTime > block.highlightEndTime) {
            block.element.classList.remove("active");
            block.highlightEndTime = 0;

            if (block.scrambleInterval) {
              clearInterval(block.scrambleInterval);
              block.scrambleInterval = null;
              if (!block.isEmpty) {
                block.element.textContent = getRandomSymbol();
              }
            }
          }
        });

        requestAnimationFrame(updateHighlights);
      };

      updateHighlights();
    };

    document.querySelectorAll(".about-img").forEach((element) => {
      initGridOverlay(element);
    });

    const splineEnabled =
      !window.matchMedia("(max-width: 768px)").matches;

    const ensureSplineElement = () => {
      const viewer = document.querySelector("spline-viewer.robot-3d");
      if (!viewer) return;
      if (viewer.getAttribute("url")) return;
      const url = viewer.dataset.splineUrl;
      if (url) viewer.setAttribute("url", url);
    };

    const scheduleSplineLoad = () => {
      if (customElements.get("spline-viewer")) {
        ensureSplineElement();
        return;
      }
      const existing = document.querySelector(
        'script[data-spline-viewer="true"]'
      );
      if (existing) {
        customElements
          .whenDefined("spline-viewer")
          .then(() => ensureSplineElement())
          .catch(() => { });
        return;
      }

      const script = document.createElement("script");
      script.type = "module";
      script.src =
        "https://unpkg.com/@splinetool/viewer@1.12.5/build/spline-viewer.js";
      script.dataset.splineViewer = "true";
      script.onload = () => {
        customElements
          .whenDefined("spline-viewer")
          .then(() => ensureSplineElement())
          .catch(() => { });
      };
      document.head.appendChild(script);
    };

    const deferSpline = () => {
      if ("requestIdleCallback" in window) {
        requestIdleCallback(scheduleSplineLoad, { timeout: 2000 });
      } else {
        setTimeout(scheduleSplineLoad, 1500);
      }
    };

    if (splineEnabled) {
      if (document.readyState === "complete") {
        deferSpline();
      } else {
        window.addEventListener("load", deferSpline, { once: true });
      }
    }

    /* Elements */
    const c1 = document.getElementById("code1");
    const c2 = document.getElementById("code2");
    const c3 = document.getElementById("code3");
    const c4 = document.getElementById("code4");

    const nameEl = document.getElementById("preloaderName");
    const counterNumber = document.getElementById("counterNumber");
    const counterFill = document.querySelector(".counter-fill");
    const navEl = document.querySelector("nav");
    const preloaderStreams = document.querySelector(".preloader-streams");
    const preloaderSkull = document.querySelector(".preloader-skull");
    const preloaderFinal = document.querySelector(".preloader-final");

    if (navEl) {
      navEl.style.opacity = "0";
      navEl.style.pointerEvents = "none";
    }

    const formatTime = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      return `${hh}:${mm}:${ss}`;
    };

    const getLocationLabel = () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
      return tz.replace(/_/g, " ");
    };

    const baseOnline = 693;
    let dotOn = true;
    let lastDotToggle = 0;
    const leftLines = [
      () => "Status:",
      () => `Online3059: ${baseOnline + Math.floor(Math.random() * 9) - 4}`,
      () => "Mode:",
      () => "INDOCTRINATION_ACTIVE",
      () => "Access Level:",
      () => "Recruit",
      () => "Location",
      () => getLocationLabel(),
    ];
    const rightLines = [
      () => "Authorized Users:",
      () => "Verified",
      () => "Current Objective:",
      () => "Cultivate Belief",
      () => `Time Accessed: ${formatTime()}`,
      () => `Recording in progress ${dotOn ? "●" : "○"}`,
    ];


    /* -------------------------
   4 CODE STREAM SYSTEM
-------------------------- */
    const maxLines = 6;
    const buffers = new Map();
    const pushLine = (el, line) => {
      if (!el) return;
      const buf = buffers.get(el) || [];
      buf.push(line);
      if (buf.length > maxLines) buf.shift();
      buffers.set(el, buf);
      el.textContent = buf.join("\n");
    };

    let leftIndex = 0;
    let rightIndex = 0;
    let preloaderIntervalId = setInterval(() => {
      const now = Date.now();
      if (now - lastDotToggle > 500) {
        dotOn = !dotOn;
        lastDotToggle = now;
      }

      if (Math.random() > 0.25) {
        const line = leftLines[leftIndex % leftLines.length]();
        pushLine(c1, line);
        leftIndex++;
      }

      if (Math.random() > 0.45) {
        const line = leftLines[leftIndex % leftLines.length]();
        pushLine(c2, line);
        leftIndex++;
      }

      if (Math.random() > 0.35) {
        const line = rightLines[rightIndex % rightLines.length]();
        pushLine(c3, line);
        rightIndex++;
      }

      if (Math.random() > 0.55) {
        const line = rightLines[rightIndex % rightLines.length]();
        pushLine(c4, line);
        rightIndex++;
      }
    }, 90);

    const drainStreams = () => {
      if (preloaderIntervalId) {
        clearInterval(preloaderIntervalId);
        preloaderIntervalId = null;
      }

      const drainEls = [c1, c2, c3, c4].filter(Boolean);
      if (!drainEls.length) return;

      const drainInterval = setInterval(() => {
        let anyLeft = false;
        drainEls.forEach((el) => {
          const buf = buffers.get(el) || [];
          if (buf.length > 0) {
            buf.shift();
            buffers.set(el, buf);
            el.textContent = buf.join("\n");
            anyLeft = true;
          }
        });

        if (!anyLeft) {
          clearInterval(drainInterval);
        }
      }, 80);
    };

    const prevCleanup = window.__pageCleanup;
    window.__pageCleanup = () => {
      if (typeof prevCleanup === "function") prevCleanup();
      pageActive = false;
      cleanupFns.forEach((fn) => {
        try {
          fn();
        } catch (err) {
          console.warn("cleanup failed", err);
        }
      });
      if (preloaderIntervalId) {
        clearInterval(preloaderIntervalId);
        preloaderIntervalId = null;
      }
      document
        .querySelector("spline-viewer.robot-3d")
        ?.removeAttribute("url");
    };

    const overlay = document.querySelector(".video-overlay");
    const overlayPlayer = overlay?.querySelector(".video-overlay-player");
    const closeBtn = overlay?.querySelector(".video-close");
    const backdrop = overlay?.querySelector(".video-overlay-backdrop");
    const videoPreviews = document.querySelectorAll(".video-preview");
    let lastActiveElement = null;

    const openOverlay = (triggerEl) => {
      if (!overlay || !overlayPlayer) return;
      lastActiveElement = triggerEl || document.activeElement;
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      overlay.removeAttribute("inert");
      const dataSrc = overlayPlayer.getAttribute("data-src");
      if (dataSrc) {
        overlayPlayer.setAttribute("src", dataSrc);
      }
      document.body.style.overflow = "hidden";
    };

    const closeOverlay = () => {
      if (!overlay) return;
      overlay.classList.remove("is-open");
      if (overlayPlayer) {
        overlayPlayer.setAttribute("src", "");
      }
      document.body.style.overflow = "";

      const active = document.activeElement;
      if (active && overlay.contains(active) && active.blur) {
        active.blur();
      }

      requestAnimationFrame(() => {
        if (lastActiveElement?.focus) {
          lastActiveElement.focus();
        } else if (document.body?.focus) {
          document.body.focus();
        }
        overlay.setAttribute("aria-hidden", "true");
        overlay.setAttribute("inert", "");
      });
    };

    videoPreviews.forEach((preview) => {
      const trigger = preview.querySelector(".video-trigger");
      const embed = preview.querySelector(".video-embed");
      let rafId = null;

      const updatePosition = (event) => {
        if (!trigger) return;
        const rect = preview.getBoundingClientRect();
        const scaleX = rect.width / (preview.offsetWidth || rect.width);
        const scaleY = rect.height / (preview.offsetHeight || rect.height);
        const x = (event.clientX - rect.left) / (scaleX || 1);
        const y = (event.clientY - rect.top) / (scaleY || 1);
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          trigger.style.left = `${x}px`;
          trigger.style.top = `${y}px`;
        });
      };

      preview.addEventListener("mouseenter", () => {
        preview.classList.add("is-hovered");
      });

      preview.addEventListener("mousemove", updatePosition);

      preview.addEventListener("mouseleave", () => {
        preview.classList.remove("is-hovered");
        if (trigger) {
          trigger.style.left = "50%";
          trigger.style.top = "50%";
        }
      });

      preview.addEventListener("click", () => openOverlay(preview));

      if (embed?.dataset.src) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              embed.setAttribute("src", embed.dataset.src);
              observer.disconnect();
            }
          },
          { rootMargin: "200px 0px" }
        );
        observer.observe(preview);
      }
    });

    const coverSpotlightEmbed = () => {
      const spotlightPreview = document.querySelector(".spotlight-cover-img.video-preview");
      const spotlightEmbed = spotlightPreview?.querySelector(".video-embed");
      if (!spotlightPreview || !spotlightEmbed) return;

      const rect = spotlightPreview.getBoundingClientRect();
      const containerRatio = rect.width / rect.height;
      const videoRatio = 16 / 9;

      if (containerRatio > videoRatio) {
        spotlightEmbed.style.width = `${rect.width}px`;
        spotlightEmbed.style.height = `${rect.width / videoRatio}px`;
      } else {
        spotlightEmbed.style.width = `${rect.height * videoRatio}px`;
        spotlightEmbed.style.height = `${rect.height}px`;
      }
    };

    coverSpotlightEmbed();
    window.addEventListener("resize", coverSpotlightEmbed);
    addCleanup(() => window.removeEventListener("resize", coverSpotlightEmbed));

    closeBtn?.addEventListener("click", () => closeOverlay());
    backdrop?.addEventListener("click", () => closeOverlay());
    const onOverlayKeydown = (e) => {
      if (e.key === "Escape") {
        closeOverlay();
      }
    };
    document.addEventListener("keydown", onOverlayKeydown);
    addCleanup(() => document.removeEventListener("keydown", onOverlayKeydown));

    /* -------------------------
   COUNTER FIX (VISIBLE NOW)
-------------------------- */
    const steps = [0, 30, 45, 78, 89, 95];
    let index = 0;
    let finalSequenceStarted = false;
    let revealStarted = false;
    let pageLoaded = document.readyState === "complete";

    if (!pageLoaded) {
      window.addEventListener(
        "load",
        () => {
          pageLoaded = true;
          if (finalSequenceStarted && !revealStarted) {
            startFinalSequence();
          }
        },
        { once: true }
      );
    }

    const startFinalSequence = () => {
      if (revealStarted) return;
      revealStarted = true;
      counterNumber.textContent = "100%";
      gsap.to(counterFill, {
        width: "100%",
        duration: 0.8,
        ease: "power2.out",
      });
      drainStreams();
      if (preloaderSkull) {
        gsap.to(preloaderSkull, {
          opacity: 0,
          duration: 1.2,
          ease: "power2.out",
        });
      }
      if (preloaderFinal) {
        const finalText = preloaderFinal.dataset.text || "You Are in MAGED WORLD";
        preloaderFinal.textContent = "";
        gsap.to(preloaderFinal, {
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
          delay: 0.4,
          onComplete: () => {
            let charIndex = 0;
            const typeInterval = setInterval(() => {
              preloaderFinal.textContent = `${finalText.slice(0, charIndex + 1)} |`;
              charIndex += 1;
              if (charIndex >= finalText.length) {
                clearInterval(typeInterval);
                preloaderFinal.textContent = finalText;
                gsap.to(preloaderFinal, {
                  opacity: 0,
                  duration: 0.7,
                  ease: "power2.inOut",
                  delay: 0.8,
                  onComplete: () => {
                    revealSite();
                  },
                });
              }
            }, 110);
          },
        });
      } else {
        revealSite();
      }
    };

    function nextStep() {
      if (index >= steps.length) {
        if (!finalSequenceStarted) {
          finalSequenceStarted = true;
          if (pageLoaded) {
            startFinalSequence();
          }
        }
        return;
      }

      const value = steps[index];

      // FIX: Update number properly
      counterNumber.textContent = value + "%";

      // fill bar
      gsap.to(counterFill, {
        width: value + "%",
        duration: 0.8,
        ease: "power2.out",
      });

      // reveal name
      if (value >= 30 && getComputedStyle(nameEl).opacity === "0") {
        gsap.to(nameEl, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
        });
      }

      if (value >= 95 && !finalSequenceStarted) {
        finalSequenceStarted = true;
        if (pageLoaded) {
          startFinalSequence();
        }
      }

      index++;
      setTimeout(nextStep, 650);
    }

    nextStep();

    /* -------------------------
   Reveal animation (same)
-------------------------- */
    function revealSite() {
      if (preloaderIntervalId) {
        clearInterval(preloaderIntervalId);
        preloaderIntervalId = null;
      }

      const tl = gsap.timeline();

      // PRELOADER EXIT (smooth + premium)
      tl.to("#preloader", {
        opacity: 0,
        duration: 1.1,
        ease: "power3.inOut",
        onComplete: () => {
          document.getElementById("preloader").style.display = "none";

          document.body.style.overflow = "auto";
          document.documentElement.style.overflow = "auto";

          if (navEl) {
            navEl.style.opacity = "1";
            navEl.style.pointerEvents = "none";
          }
        },
      });

      // NAV logo
      tl.from(
        ".nav-logo",
        {
          x: -40,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
        },
        "-=0.8"
      );

      // MENU button
      tl.from(
        ".menu-toggle-btn",
        {
          x: 40,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
        },
        "-=0.9"
      );

      // HERO Title
      tl.from(
        ".hero-content h1",
        {
          y: 60,
          opacity: 0,
          duration: 1.2,
          ease: "power3.out",
        },
        "-=0.6"
      );

      // HERO Description
      tl.from(
        ".hero-description",
        {
          y: 40,
          opacity: 0,
          duration: 1.2,
          ease: "power3.out",
        },
        "-=1"
      );

      // HERO Button
      tl.from(
        ".hero-buttons",
        {
          y: 30,
          opacity: 0,
          duration: 1.2,
          ease: "power3.out",
        },
        "-=1"
      );

      if (splineEnabled) {
        // SPLINE 3D Model
        tl.from(
          ".robot-3d",
          {
            opacity: 0,
            scale: 0.8,
            duration: 1.4,
            ease: "power3.out",
          },
          "-=1"
        );
      }
    }

    /* -------------------------------------------------------------
     LENIS SMOOTH SCROLL
  ------------------------------------------------------------- */
    const lenis = initLenis();

    /* -------------------------------------------------------------
     SPLIT TEXT INSTANCES (PRELOADER)
  ------------------------------------------------------------- */

    /* -------------------------------------------------------------
   ABOUT SECTION â€” IMAGE ONLY
  ------------------------------------------------------------- */

    let spotlightState = {
      trigger: null,
      introSplit: null,
      outroSplit: null,
    };
    let spotlightResizeRaf = 0;

    initSpotlightAnimations();
    const onSpotlightResize = () => {
      if (spotlightResizeRaf) {
        cancelAnimationFrame(spotlightResizeRaf);
      }
      spotlightResizeRaf = requestAnimationFrame(() => {
        initSpotlightAnimations();
      });
    };
    window.addEventListener("resize", onSpotlightResize);
    addCleanup(() => window.removeEventListener("resize", onSpotlightResize));

    function initSpotlightAnimations() {
      if (spotlightState.trigger) {
        spotlightState.trigger.kill(true);
        spotlightState.trigger = null;
      }
      if (spotlightState.introSplit) {
        spotlightState.introSplit.revert();
        spotlightState.introSplit = null;
      }
      if (spotlightState.outroSplit) {
        spotlightState.outroSplit.revert();
        spotlightState.outroSplit = null;
      }

      const isMobile = window.innerWidth < 1000;
      const maxImages = isMobile ? 6 : 12;
      const allImages = Array.from(
        document.querySelectorAll(".spotlight-images .img")
      );
      const images = allImages.slice(0, maxImages);
      const coverImg = document.querySelector(".spotlight-cover-img");
      const introHeader = document.querySelector(".spotlight-intro-header h1");
      const outroHeader = document.querySelector(".spotlight-outro-header h1");

      if (!images.length || !coverImg || !introHeader || !outroHeader) {
        return;
      }

      allImages.slice(maxImages).forEach((img) => {
        gsap.set(img, { opacity: 0, scale: 0, x: 0, y: 0, z: -1000 });
      });

      spotlightState.introSplit = SplitText.create(introHeader, {
        type: "words",
      });
      gsap.set(spotlightState.introSplit.words, { opacity: 1 });

      spotlightState.outroSplit = SplitText.create(outroHeader, {
        type: "words",
      });
      gsap.set(spotlightState.outroSplit.words, { opacity: 0 });
      gsap.set(outroHeader, { opacity: 1 });

      const scatterDirections = [
        { x: 1.3, y: 0.7 },
        { x: -1.5, y: 1.0 },
        { x: 1.1, y: -1.3 },
        { x: -1.7, y: -0.8 },
        { x: 0.8, y: 1.5 },
        { x: -1.0, y: -1.4 },
        { x: 1.6, y: 0.3 },
        { x: -0.7, y: 1.7 },
        { x: 1.2, y: -1.6 },
        { x: -1.4, y: 0.9 },
        { x: 1.8, y: -0.5 },
        { x: -1.1, y: -1.8 },
        { x: 0.9, y: 1.8 },
        { x: -1.9, y: 0.4 },
        { x: 1.0, y: -1.9 },
        { x: -0.8, y: 1.9 },
        { x: 1.7, y: -1.0 },
        { x: -1.3, y: -1.2 },
        { x: 0.7, y: 2.0 },
        { x: 1.25, y: -0.2 },
      ];

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const scatterMultiplier = isMobile ? 1.4 : 0.5;

      const startPositions = Array.from(images).map(() => ({
        x: 0,
        y: 0,
        z: -1000,
        scale: 0,
      }));

      const endPositions = Array.from(images).map((_, index) => {
        const dir = scatterDirections[index % scatterDirections.length];
        return {
          x: dir.x * screenWidth * scatterMultiplier,
          y: dir.y * screenHeight * scatterMultiplier,
          z: 2000,
          scale: 1,
        };
      });

      images.forEach((img, index) => {
        gsap.set(img, { ...startPositions[index], opacity: 1 });
      });

      gsap.set(coverImg, {
        z: -1000,
        scale: 0,
        x: 0,
        y: 0,
      });

      const lastStagger = (images.length - 1) * 0.03;
      const imagePhaseEnd = Math.min(0.8, lastStagger + 1 / 6);
      const introFadeStart = Math.max(0.3, imagePhaseEnd - 0.15);
      const introFadeEnd = Math.min(0.85, imagePhaseEnd);
      const outroRevealStart = Math.min(0.9, imagePhaseEnd + 0.05);
      const outroRevealEnd = Math.min(0.95, outroRevealStart + 0.2);
      const coverStart = Math.max(0.35, imagePhaseEnd - 0.05);
      const coverDuration = 0.25;
      const pinDuration = isMobile ? "200%" : "350%";

      spotlightState.trigger = ScrollTrigger.create({
        id: "spotlight-pin",
        trigger: ".spotlight-pin",
        pin: ".spotlight-pin",
        start: "top top",
        end: `+=${pinDuration}`,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const progress = self.progress;
          const scaleMultiplier = isMobile ? 4 : 2;

          images.forEach((img, index) => {
            const staggerDelay = index * 0.03;

            let imageProgress = Math.max(0, (progress - staggerDelay) * 6);

            const start = startPositions[index];
            const end = endPositions[index];

            const zValue = gsap.utils.interpolate(
              start.z,
              end.z,
              imageProgress
            );
            const scaleValue = gsap.utils.interpolate(
              start.scale,
              end.scale,
              imageProgress * scaleMultiplier
            );
            const xValue = gsap.utils.interpolate(
              start.x,
              end.x,
              imageProgress
            );
            const yValue = gsap.utils.interpolate(
              start.y,
              end.y,
              imageProgress
            );

            gsap.set(img, {
              z: zValue,
              scale: scaleValue,
              x: xValue,
              y: yValue,
            });
          });

          const coverProgress = gsap.utils.clamp(
            0,
            1,
            (progress - coverStart) / coverDuration
          );
          const coverZValue = -1000 + 1000 * coverProgress;
          const coverScaleValue = Math.min(1, coverProgress * 2);

          gsap.set(coverImg, {
            z: coverZValue,
            scale: coverScaleValue,
          });

          if (
            spotlightState.introSplit &&
            spotlightState.introSplit.words.length > 0
          ) {
            if (progress >= introFadeStart && progress <= introFadeEnd) {
              const introFadeProgress =
                (progress - introFadeStart) /
                Math.max(0.001, introFadeEnd - introFadeStart);
              const totalWords = spotlightState.introSplit.words.length;

              spotlightState.introSplit.words.forEach((word, index) => {
                const wordFadeProgress = index / totalWords;
                const fadeRange = 0.1;

                if (introFadeProgress >= wordFadeProgress + fadeRange) {
                  gsap.set(word, { opacity: 0 });
                } else if (introFadeProgress <= wordFadeProgress) {
                  gsap.set(word, { opacity: 1 });
                } else {
                  const wordOpacity =
                    1 - (introFadeProgress - wordFadeProgress) / fadeRange;
                  gsap.set(word, { opacity: wordOpacity });
                }
              });
            } else if (progress < introFadeStart) {
              gsap.set(spotlightState.introSplit.words, { opacity: 1 });
            } else if (progress > introFadeEnd) {
              gsap.set(spotlightState.introSplit.words, { opacity: 0 });
            }
          }

          if (
            spotlightState.outroSplit &&
            spotlightState.outroSplit.words.length > 0
          ) {
            if (progress >= outroRevealStart && progress <= outroRevealEnd) {
              const outroRevealProgress =
                (progress - outroRevealStart) /
                Math.max(0.001, outroRevealEnd - outroRevealStart);
              const totalWords = spotlightState.outroSplit.words.length;

              spotlightState.outroSplit.words.forEach((word, index) => {
                const wordRevealProgress = index / totalWords;
                const fadeRange = 0.1;

                if (outroRevealProgress >= wordRevealProgress + fadeRange) {
                  gsap.set(word, { opacity: 1 });
                } else if (outroRevealProgress <= wordRevealProgress) {
                  gsap.set(word, { opacity: 0 });
                } else {
                  const wordOpacity =
                    (outroRevealProgress - wordRevealProgress) / fadeRange;
                  gsap.set(word, { opacity: wordOpacity });
                }
              });
            } else if (progress < outroRevealStart) {
              gsap.set(spotlightState.outroSplit.words, { opacity: 0 });
            } else if (progress > outroRevealEnd) {
              gsap.set(spotlightState.outroSplit.words, { opacity: 1 });
            }
          }
        },
      });
      ScrollTrigger.refresh();
    }

    /* -------------------------------------------------------------
   UNIVERSAL REVEAL TITLE ANIMATION â€” WORKS ANYWHERE
------------------------------------------------------------- */

    function animateRevealTitle(selector) {
      const split = new SplitText(selector, {
        type: "words",
        wordsClass: "word",
      });
      const titleEl = document.querySelector(selector);
      if (titleEl) {
        titleEl.removeAttribute("aria-label");
        titleEl.removeAttribute("role");
      }

      gsap.set(split.words, { y: 30, opacity: 0 });

      ScrollTrigger.create({
        trigger: selector,
        start: "top 90%", // safer zone
        end: "bottom 60%",
        once: true,
        onEnter: () => {
          gsap.to(split.words, {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.05,
          });
        },
      });
    }

    /* Run AFTER everything is ready */
    setTimeout(() => {
      animateRevealTitle(".reveal-title");
      ScrollTrigger.refresh();
    }, 600);

    // logo section
    let currentScroll = 0;
    let isScrollingDown = true;
    let arrows = document.querySelectorAll(".arrow");

    let tween = gsap
      .to(".marquee__part", {
        xPercent: -100,
        repeat: -1,
        duration: 5,
        ease: "linear",
      })
      .totalProgress(0.5);

    gsap.set(".marquee__inner", { xPercent: -50 });

    const onMarqueeScroll = () => {
      if (window.pageYOffset > currentScroll) {
        isScrollingDown = true;
      } else {
        isScrollingDown = false;
      }

      gsap.to(tween, {
        timeScale: isScrollingDown ? 1 : -1,
      });

      arrows.forEach((arrow) => {
        if (isScrollingDown) {
          arrow.classList.remove("active");
        } else {
          arrow.classList.add("active");
        }
      });

      currentScroll = window.pageYOffset;
    };
    window.addEventListener("scroll", onMarqueeScroll, { passive: true });
    addCleanup(() => window.removeEventListener("scroll", onMarqueeScroll));

    // TEXT REVEAL
    gsap.from(".about-badge, .about-title, .about-desc", {
      opacity: 0,
      y: 40,
      stagger: 0.15,
      duration: 1.2,
      delay: 0.5,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".about-section",
        start: "top 80%",
      },
    });

    // IMAGES REVEAL
    gsap.from(".about-img", {
      opacity: 0,
      scale: 1.08,
      duration: 1.4,
      ease: "power3.out",
      stagger: 0.2,
      scrollTrigger: {
        trigger: ".about-images",
        start: "top 85%",
      },
    });

    // text hover revealing
    // const mask = document.querySelector(".mask");
    // const og = document.querySelector(".og");
    const small = 0;
    const revealSections = [];

    // Apply logic to EVERY .large-content section
    document.querySelectorAll(".large-content").forEach((section) => {
      const og = section.querySelector(".og");
      const mask = section.querySelector(".mask");
      if (!og || !mask) return;

      const item = {
        section,
        og,
        mask,
        current: small,
        big: section.classList.contains("footer-content") ? 40 : 380,
      };
      section.revealReady = false; // FLAG stored on section itself
      revealSections.push(item);

      og.addEventListener("mouseenter", () => {
        if (!section.revealReady) return; // stop early circle
        item.current = item.big;
      });

      og.addEventListener("mouseleave", () => {
        item.current = small;
      });

      section.addEventListener("mouseleave", () => {
        gsap.to(mask, {
          "--mask-size": "0px",
          duration: 0.25,
          ease: "power2.out",
        });
      });
    });

    const onRevealMouseMove = (e) => {
      revealSections.forEach((item) => {
        if (!item.section.revealReady) return; // stop before reveal done

        const rect = item.section.getBoundingClientRect();
        const inside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;

        if (!inside) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        gsap.to(item.mask, {
          "--mask-x": `${x - item.current / 2}px`,
          "--mask-y": `${y - item.current / 2}px`,
          "--mask-size": `${item.current}px`,
          duration: 0.35,
          ease: "back.out(1.6)",
        });
      });
    };
    document.addEventListener("mousemove", onRevealMouseMove);
    addCleanup(() => document.removeEventListener("mousemove", onRevealMouseMove));

    // sand revealing
    function applySandReveal(selector) {
      const elements = gsap.utils.toArray(selector);

      elements.forEach((el) => {
        const split = SplitText.create(el, { type: "words" });
        el.removeAttribute("aria-label");
        el.removeAttribute("role");

        gsap.set(split.words, {
          y: 20,
          opacity: 0,
          filter: "blur(12px)",
        });

        ScrollTrigger.create({
          trigger: el,
          start: "top 90%",
          once: true,
          onEnter: () => {
            gsap.to(split.words, {
              y: 0,
              opacity: 1,
              filter: "blur(0px)",
              duration: 0.9,
              ease: "power3.out",
              stagger: 0.03,
              onStart: () => {
                const parent = el.closest(".large-content");
                if (parent) parent.revealReady = true;
              },
            });
          },
        });
      });
    }

    // run immediately
    applySandReveal(".sand-reveal");
    ScrollTrigger.refresh();

    // services section
    gsap.defaults({
      duration: 0.6,
      ease: "expo.out",
    });

    // ===============================
    // 1ï¸âƒ£ FIRST CARD FADE-IN (NEW)
    // ===============================
    const pinCards = gsap.utils.toArray(".pin-card");
    const firstCard = pinCards[0];

    ScrollTrigger.matchMedia({
      "(min-width: 1025px)": () => {
        const serviceTriggers = [];

        if (firstCard) {
          gsap.set(firstCard, {
            opacity: 0,
            y: 60,
            filter: "blur(18px)",
          });

          const firstTween = gsap.to(firstCard, {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.2,
            delay: 0.3,
            ease: "power3.out",
            scrollTrigger: {
              trigger: firstCard,
              start: "top 80%",
              toggleActions: "play none none none",
            },
          });
          serviceTriggers.push(firstTween.scrollTrigger);
        }

        pinCards.forEach((eachCard, index) => {
          if (index < pinCards.length - 1) {
            const pinTrigger = ScrollTrigger.create({
              trigger: eachCard,
              start: "top top",
              endTrigger: pinCards[pinCards.length - 1],
              end: "top top",
              pin: true,
              pinSpacing: false,
              invalidateOnRefresh: true,
            });

            const animateTrigger = ScrollTrigger.create({
              trigger: pinCards[index + 1],
              start: "top bottom",
              end: "top top",
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const progress = self.progress;
                gsap.set(eachCard, {
                  scale: 1 - progress * 0.25,
                  rotation: index % 2 === 0 ? progress * 5 : -progress * 5,
                  rotationX: index % 2 === 0 ? progress * 40 : -progress * 40,
                });
                gsap.set(eachCard.querySelector(".overlay"), {
                  opacity: progress * 0.4,
                });
              },
            });

            serviceTriggers.push(pinTrigger, animateTrigger);
          }
        });

        return () => {
          serviceTriggers.forEach((trigger) => trigger?.kill());
        };
      },
      "(max-width: 1024px)": () => {
        pinCards.forEach((card) => {
          gsap.set(card, { clearProps: "transform,opacity,filter" });
          const overlay = card.querySelector(".overlay");
          if (overlay) {
            gsap.set(overlay, { clearProps: "opacity" });
          }
        });
      },
    });
    // const services = document.querySelectorAll(".service-box");
    // const hoverLayer = document.getElementById("service-hover-layer");

    // services.forEach((box) => {
    //   const wrapper = box.querySelector(".hover-img-wrapper");

    //   // Move wrapper out of the box â†’ into global layer
    //   hoverLayer.appendChild(wrapper);

    //   box.addEventListener("mouseenter", () => {
    //     gsap.to(wrapper, {
    //       opacity: 1,
    //       scale: 1,
    //       rotation: 0,
    //       duration: 0.4,
    //       ease: "expo.out",
    //     });
    //   });

    //   box.addEventListener("mouseleave", () => {
    //     gsap.to(wrapper, {
    //       opacity: 0,
    //       scale: 0.75,
    //       rotation: -10,
    //       duration: 0.4,
    //       ease: "expo.out",
    //     });
    //   });
    // });

    // // FOLLOW MOUSE ALWAYS (correct positioning relative to page)
    // document.addEventListener("mousemove", (e) => {
    //   hoverLayer.style.transform = `translateY(${window.scrollY}px)`;

    //   const wrappers = hoverLayer.querySelectorAll(".hover-img-wrapper");
    //   wrappers.forEach((wrap) => {
    //     gsap.to(wrap, {
    //       x: e.clientX,
    //       y: e.clientY,
    //       duration: 0.2,
    //       ease: "expo.out",
    //     });
    //   });
    // });

    // project section
    document.querySelectorAll(".item").forEach((item) => {
      const spans = item.querySelectorAll(".item-copy span");

      // initial state
      gsap.set(spans, { opacity: 0 });

      item.addEventListener("mouseenter", () => {
        gsap.killTweensOf(spans);

        gsap.to(spans, {
          opacity: 1,
          duration: 0.08,
          stagger: {
            each: 0.02,
            from: "random",
          },
          ease: "power2.out",
        });
      });

      item.addEventListener("mouseleave", () => {
        gsap.killTweensOf(spans);

        gsap.to(spans, {
          opacity: 0,
          duration: 0.08,
          stagger: {
            each: 0.02,
            from: "random",
          },
          ease: "power2.in",
        });
      });
    });

    gsap.set(".work-item", {
      y: 1000,
    });

    document.querySelectorAll(".row").forEach((row) => {
      const workItems = row.querySelectorAll(".work-item");

      workItems.forEach((item, itemIndex) => {
        const isLeftProjectItem = itemIndex === 0;
        gsap.set(item, {
          rotation: isLeftProjectItem ? -60 : 60,
          transformOrigin: "center center",
        });
      });

      ScrollTrigger.create({
        trigger: row,
        start: "top 50%",
        onEnter: () => {
          gsap.to(workItems, {
            y: 0,
            rotation: 0,
            duration: 1,
            ease: "power4.out",
            stagger: 0.25,
          });
        },
      });
    });

    // faq section
    const allItems = document.querySelectorAll(".faq-item");

    allItems.forEach((item) => {
      const top = item.querySelector(".faq-top");
      const content = item.querySelector(".faq-content");
      const icon = item.querySelector(".faq-icon");
      const bar1 = icon.children[0];
      const bar2 = icon.children[1];

      // Init
      gsap.set(content, { height: 0, opacity: 0 });

      top.addEventListener("click", () => {
        const isOpen = content.classList.contains("open");

        // CLOSE all others
        allItems.forEach((other) => {
          if (other !== item) {
            const c = other.querySelector(".faq-content");
            const ic = other.querySelector(".faq-icon").children[1];

            c.classList.remove("open");
            gsap.to(c, {
              height: 0,
              opacity: 0,
              duration: 0.4,
              ease: "power2.inOut",
            });
            gsap.to(ic, { rotate: 90, duration: 0.3 });
          }
        });

        if (isOpen) {
          // CLOSE current
          content.classList.remove("open");
          gsap.to(content, {
            height: 0,
            opacity: 0,
            duration: 0.4,
            ease: "power2.inOut",
          });
          gsap.to(bar1, { rotate: 90, duration: 0.3 });
        } else {
          // OPEN current
          content.classList.add("open");
          const h = content.scrollHeight;

          gsap.to(content, {
            height: h,
            opacity: 1,
            duration: 0.45,
            ease: "power2.out",
          });
          gsap.to(bar2, { rotate: 0, duration: 0.3 });
        }
      });
    });

    // footer section
    gsap.registerPlugin(ScrollTrigger);

    // fade + slide for the whole footer
    gsap.from(".footer-top", {
      scrollTrigger: {
        trigger: ".footer-section",
        start: "top 80%",
      },
      opacity: 0,
      y: 50,
      duration: 1.2,
      ease: "power3.out",
    });

    // middle row animation
    gsap.from(".footer-mid", {
      scrollTrigger: {
        trigger: ".footer-section",
        start: "top 70%",
      },
      opacity: 0,
      y: 40,
      duration: 1.2,
      ease: "power3.out",
      delay: 0.2,
    });

    // BIG TEXT slide up
    gsap.to(".footer-big-text", {
      scrollTrigger: {
        trigger: ".footer-bottom",
        start: "top 90%", // slightly earlier
        toggleActions: "play none none reverse",
      },
      y: "0%",
      opacity: 1,
      duration: 1.4,
      ease: "power4.out",
    });

    const initScrollProgress = () => {
      const progressEl = document.querySelector(".scroll-progress");
      const valueEl = document.querySelector(".scroll-progress-value");
      if (!progressEl || !valueEl) return;

      const messageEl = document.createElement("div");
      messageEl.className = "scroll-progress-message";
      progressEl.appendChild(messageEl);

      const fireworksEl = document.createElement("div");
      fireworksEl.className = "scroll-progress-fireworks";
      progressEl.appendChild(fireworksEl);

      const milestones = [
        { value: 50, text: "You reached half the road" },
        { value: 75, text: "Keep going, almost there" },
        { value: 100, text: "Congratulations! Contact me for an offer" },
      ];
      const seen = new Set();
      let hideTimer = null;

      const showMessage = (text) => {
        messageEl.textContent = text;
        messageEl.classList.add("is-visible");
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
          messageEl.classList.remove("is-visible");
        }, 2200);
      };

      let ticking = false;
      const update = () => {
        ticking = false;
        const doc = document.documentElement;
        const scrollTop = window.pageYOffset || doc.scrollTop || 0;
        const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
        const percent = Math.min(100, Math.max(0, Math.round((scrollTop / max) * 100)));
        valueEl.textContent = `${percent}%`;
        progressEl.style.setProperty("--scroll-progress", `${percent}%`);
        progressEl.classList.toggle("is-active", percent > 0);
        progressEl.classList.toggle("is-complete", percent === 100);

        milestones.forEach((milestone) => {
          if (percent >= milestone.value && !seen.has(milestone.value)) {
            seen.add(milestone.value);
            showMessage(milestone.text);
          }
        });
      };

      update();
      const onProgressScroll = () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      };
      const onProgressResize = () => update();
      window.addEventListener("scroll", onProgressScroll, { passive: true });
      window.addEventListener("resize", onProgressResize);
      addCleanup(() => {
        window.removeEventListener("scroll", onProgressScroll);
        window.removeEventListener("resize", onProgressResize);
      });
    };

    initScrollProgress();

    let refreshRaf = 0;
    const onGlobalResize = () => {
      if (!window.ScrollTrigger) return;
      if (refreshRaf) {
        cancelAnimationFrame(refreshRaf);
      }
      refreshRaf = requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    };
    window.addEventListener("resize", onGlobalResize);
    addCleanup(() => window.removeEventListener("resize", onGlobalResize));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}
