export default function initAbout() {
  gsap.registerPlugin(ScrollTrigger, CustomEase, SplitText);

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
    gsap.registerPlugin(ScrollTrigger);

    initLenis();

    let pageActive = true;
    let fluidCleanup = null;
    const prevCleanup = window.__pageCleanup;
    window.__pageCleanup = () => {
      if (typeof prevCleanup === "function") prevCleanup();
      pageActive = false;
      if (typeof fluidCleanup === "function") {
        fluidCleanup();
      }
    };


    const heroTimeline = gsap.timeline({
      defaults: { duration: 0.8, ease: "power3.out" },
    });

    heroTimeline
      .from(".about-hero h1", { y: 40, opacity: 0 })
      .from(".about-hero .hero-copy", { y: 20, opacity: 0 }, "-=0.4")
      .from(
        ".video-section .video-wrapper",
        { y: 30, opacity: 0, filter: "blur(8px)" },
        "-=0.3"
      )
      .from(
        ".video-container-mobile .video-title p",
        { y: 20, opacity: 0 },
        "-=0.4"
      );

    document.querySelectorAll(".animate-text").forEach((textElement) => {
      textElement.removeAttribute("data-text");
      const split = SplitText.create(textElement, { type: "words" });
      textElement.removeAttribute("aria-label");
      textElement.removeAttribute("role");

      gsap.set(split.words, { opacity: 0.2 });

      gsap.to(split.words, {
        opacity: 1,
        ease: "none",
        stagger: { each: 0.08 },
        scrollTrigger: {
          trigger: textElement,
          start: "top 80%",
          end: "bottom 30%",
          scrub: true,
        },
      });
    });

    const servicesHeaders = document.querySelectorAll(".services-header");
    if (servicesHeaders.length) {
      ScrollTrigger.create({
        trigger: ".services",
        start: "top bottom",
        end: "top top",
        scrub: 1,
        onUpdate: (self) => {
          gsap.set(servicesHeaders[0], { x: `${100 - self.progress * 100}%` });
          gsap.set(servicesHeaders[1], { x: `${-100 + self.progress * 100}%` });
          gsap.set(servicesHeaders[2], { x: `${100 - self.progress * 100}%` });
        },
      });
    }

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
    });

    closeBtn?.addEventListener("click", () => closeOverlay());
    backdrop?.addEventListener("click", () => closeOverlay());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeOverlay();
      }
    });

    const beyondSection = document.querySelector(".beyond-experience");
    const beyondBg = beyondSection?.querySelector(".exp-bg");
    const beyondVideo = beyondSection?.querySelector(".exp-bg-video");
    if (beyondSection && beyondBg) {
      gsap.set(beyondBg, {
        autoAlpha: 0,
        scale: 0.85,
        y: 80,
        transformOrigin: "50% 50%",
      });

      const beyondFade = gsap.to(beyondBg, {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: 1.4,
        ease: "power2.out",
        paused: true,
      });

      ScrollTrigger.create({
        trigger: beyondSection,
        start: "top 80%",
        onEnter: () => beyondFade.play(),
        onLeaveBack: () => beyondFade.reverse(),
        invalidateOnRefresh: true,
      });

      if (beyondVideo) {
        gsap.fromTo(
          beyondVideo,
          { yPercent: -20 },
          {
            yPercent: 20,
            ease: "none",
            scrollTrigger: {
              trigger: beyondSection,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              invalidateOnRefresh: true,
            },
          }
        );
      }
    }

    if (servicesHeaders.length) {
      ScrollTrigger.create({
        trigger: ".services",
        start: "top top",
        end: `+=${window.innerHeight * 2}`,
        pin: true,
        scrub: 1,
        pinSpacing: false,
        onUpdate: (self) => {
          if (self.progress <= 0.5) {
            const yProgress = self.progress / 0.5;
            gsap.set(servicesHeaders[0], { y: `${yProgress * 100}%` });
            gsap.set(servicesHeaders[2], { y: `${yProgress * -100}%` });
          } else {
            gsap.set(servicesHeaders[0], { y: "100%" });
            gsap.set(servicesHeaders[2], { y: "-100%" });

            const scaleProgress = (self.progress - 0.5) / 0.5;
            const minScale = window.innerWidth <= 1000 ? 0.3 : 0.1;
            const scale = 1 - scaleProgress * (1 - minScale);

            servicesHeaders.forEach((header) => gsap.set(header, { scale }));
          }
        },
      });
    }

    if (window.innerWidth >= 900) {
      const videoContainer = document.querySelector(".video-container-desktop");
      const videoTitleElements = document.querySelectorAll(".video-title p");

      gsap.ticker.lagSmoothing(0);

      const breakpoints = [
        { maxWidth: 1000, translateY: -135, movMultiplier: 450 },
        { maxWidth: 1100, translateY: -130, movMultiplier: 500 },
        { maxWidth: 1200, translateY: -125, movMultiplier: 550 },
        { maxWidth: 1300, translateY: -120, movMultiplier: 600 },
      ];

      const getInitialValues = () => {
        const width = window.innerWidth;

        for (const bp of breakpoints) {
          if (width <= bp.maxWidth) {
            return {
              translateY: bp.translateY,
              movementMultiplier: bp.movMultiplier,
            };
          }
        }

        return {
          translateY: -105,
          movementMultiplier: 650,
        };
      };

      const initialValues = getInitialValues();

      const animationState = {
        scrollProgress: 0,
        initialTranslateY: initialValues.translateY,
        currentTranslateY: initialValues.translateY,
        movementMultiplier: initialValues.movementMultiplier,
        scale: 0.25,
        fontSize: 80,
        gap: 2,
        targetMouseX: 0,
        currentMouseX: 0,
      };

      window.addEventListener("resize", () => {
        const newValues = getInitialValues();
        animationState.initialTranslateY = newValues.translateY;
        animationState.movementMultiplier = newValues.movementMultiplier;

        if (animationState.scrollProgress === 0) {
          animationState.currentTranslateY = newValues.translateY;
        }
      });

      gsap.timeline({
        scrollTrigger: {
          trigger: ".video-section",
          start: "top bottom",
          end: "top 10%",
          scrub: true,
          onUpdate: (self) => {
            animationState.scrollProgress = self.progress;

            animationState.currentTranslateY = gsap.utils.interpolate(
              animationState.initialTranslateY,
              0,
              animationState.scrollProgress
            );

            animationState.scale = gsap.utils.interpolate(
              0.25,
              1,
              animationState.scrollProgress
            );

            animationState.gap = gsap.utils.interpolate(
              2,
              1,
              animationState.scrollProgress
            );

            if (animationState.scrollProgress <= 0.4) {
              const firstPartProgress = animationState.scrollProgress / 0.4;
              animationState.fontSize = gsap.utils.interpolate(
                80,
                40,
                firstPartProgress
              );
            } else {
              const secondPartProgress =
                (animationState.scrollProgress - 0.4) / 0.6;
              animationState.fontSize = gsap.utils.interpolate(
                40,
                20,
                secondPartProgress
              );
            }
          },
        },
      });

      document.addEventListener("mousemove", (e) => {
        animationState.targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      });

      const animate = () => {
        if (!pageActive) return;
        if (window.innerWidth < 900) return;

        const {
          scale,
          targetMouseX,
          currentMouseX,
          currentTranslateY,
          fontSize,
          gap,
          movementMultiplier,
        } = animationState;

        const scaleMovementMultiplier = (1 - scale) * movementMultiplier;

        const maxHorizontalMovement =
          scale < 0.95 ? targetMouseX * scaleMovementMultiplier : 0;

        animationState.currentMouseX = gsap.utils.interpolate(
          currentMouseX,
          maxHorizontalMovement,
          0.5
        );

        videoContainer.style.transform = `translateY(${currentTranslateY}%) translateX(${animationState.currentMouseX}px) scale(${scale})`;

        videoContainer.style.gap = `${gap}em`;

        videoTitleElements.forEach((element) => {
          element.style.fontSize = `${fontSize}px`;
        });

        requestAnimationFrame(animate);
      };

      animate();
    }

    const timeLineImgFinalPos = [
      [-140, -140],
      [40, -130],
      [-160, 40],
      [20, 30],
    ];

    const timeLineImages = document.querySelectorAll(".timeline-cards-img");

    ScrollTrigger.create({
      trigger: ".timeline-cards",
      start: "top top",
      end: `+${window.innerHeight * 6}px`,
      pin: true,
      pinSpacing: true,
      scrub: 1,
      onUpdate: (self) => {
        const progress = self.progress;

        const initialRotations = [5, -3, 3.5, -1];
        const phaseOneStartOffsets = [0, 0.1, 0.2, 0.3];

        timeLineImages.forEach((img, index) => {
          const initialRotation = initialRotations[index];
          const phase1Start = phaseOneStartOffsets[index];
          const phase1End = Math.min(
            phase1Start + (0.45 - phase1Start) * 0.9,
            0.45
          );

          let x = -50;
          let y, rotation;

          if (progress < phase1Start) {
            y = 200;
            rotation = initialRotation;
          } else if (progress <= 0.45) {
            let phase1Progress;

            if (progress >= phase1End) {
              phase1Progress = 1;
            } else {
              const linearProgress =
                (progress - phase1Start) / (phase1End - phase1Start);
              phase1Progress = 1 - Math.pow(1 - linearProgress, 3);
            }

            y = 200 - phase1Progress * 250;
            rotation = initialRotation;
          } else {
            y = -50;
            rotation = initialRotation;
          }

          const phaseTwoStartOffsets = [0.5, 0.55, 0.6, 0.65];
          const phase2Start = phaseTwoStartOffsets[index];
          const phase2End = Math.min(
            phase2Start + (0.95 - phase2Start) * 0.9,
            0.95
          );
          const finalX = timeLineImgFinalPos[index][0];
          const finalY = timeLineImgFinalPos[index][1];

          if (progress >= phase2Start && progress <= 0.95) {
            let phase2Progress;

            if (progress >= phase2End) {
              phase2Progress = 1;
            } else {
              const linearProgress =
                (progress - phase2Start) / (phase2End - phase2Start);
              phase2Progress = 1 - Math.pow(1 - linearProgress, 3);
            }

            x = -50 + (finalX + 50) * phase2Progress;
            y = -50 + (finalY + 50) * phase2Progress;
            rotation = initialRotation * (1 - phase2Progress);
          } else if (progress > 0.95) {
            x = finalX;
            y = finalY;
            rotation = 0;
          }

          gsap.set(img, {
            transform: `translate(${x}%, ${y}%) rotate(${rotation}deg)`,
          });
        });
      },
    });

    // tools section

    const toolsSection = document.querySelector(".tools-section");
    const highlight = document.querySelector(".highlight");
    const gridItems = document.querySelectorAll(".grid-item");
    const firstItem = document.querySelector(".grid-item");

    const highlightColors = [
      "#5c0c8aff",
      "#5a43c1ff",
      "#4d0d97ff",
      "#4b04a7ff",
      "#310c42ff",
      "#c58df3ff",
      "#818D92",
      "#6f18d3ff",
    ];

    gridItems.forEach((item, index) => {
      item.dataset.color = highlightColors[index % highlightColors.length];
    });

    const moveToElement = (element) => {
      if (element) {
        const rect = element.getBoundingClientRect();
        const containerRect = toolsSection.getBoundingClientRect();

        highlight.style.transform = `translate(${
          rect.left - containerRect.left
        }px, ${rect.top - containerRect.top}px)`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${rect.height}px`;
        highlight.style.backgroundColor = element.dataset.color;
      }
    };

    const moveHighlight = (e) => {
      const hoveredElement = document.elementFromPoint(e.clientX, e.clientY);

      if (hoveredElement && hoveredElement.classList.contains("grid-item")) {
        moveToElement(hoveredElement);
      } else if (
        hoveredElement &&
        hoveredElement.parentElement &&
        hoveredElement.parentElement.classList.contains("grid-item")
      ) {
        moveToElement(hoveredElement.parentElement);
      }
    };

    if (toolsSection && highlight && gridItems.length) {
      moveToElement(firstItem);
      toolsSection.addEventListener("mousemove", moveHighlight);
    }
    // process section
    const items = gsap.utils.toArray(".process-item");
    const bgTexts = gsap.utils.toArray(".bg-text");
    const section = document.querySelector(".process-section");

    if (items.length && bgTexts.length && section) {
      // Floating motion (always running)
      bgTexts.forEach((text, i) => {
        gsap.to(text, {
          x: i % 2 === 0 ? 120 : -120,
          duration: 10 + i,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });

      items.forEach((item) => {
        const index = Number(item.dataset.bg);
        const bg = bgTexts[index];
        if (!bg) return;

        item.addEventListener("pointerenter", () => {
          gsap.to(bgTexts, { opacity: 0, duration: 0.25 });

          const itemRect = item.getBoundingClientRect();
          const sectionRect = section.getBoundingClientRect();

          const relativeY =
            itemRect.top - sectionRect.top + itemRect.height / 2;

          gsap.set(bg, { y: relativeY });

          gsap.to(bg, {
            opacity: 1,
            duration: 0.45,
            ease: "power2.out",
          });
        });

        item.addEventListener("pointerleave", () => {
          gsap.to(bg, {
            opacity: 0,
            duration: 0.35,
            ease: "power2.in",
          });
        });
      });
    }

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
      window.addEventListener("scroll", () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      }, { passive: true });
      window.addEventListener("resize", update);
    };

    initScrollProgress();

    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });
    window.addEventListener(
      "load",
      () => {
        ScrollTrigger.refresh();
      },
      { once: true }
    );
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}



