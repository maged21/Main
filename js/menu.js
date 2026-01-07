export default function initMenu(options = {}) {
  const {
    onStateChange,
  } = options;

  const navEl = document.querySelector("nav");
  const menuBar = document.querySelector(".menu-bar");
  const menuToggleBtn = document.querySelector(".menu-toggle-btn");
  const menuOverlay = document.querySelector(".menu-overlay");
  const menuOverlayContainer = document.querySelector(".menu-overlay-content");
  const menuMediaWrapper = document.querySelector(".menu-media-wrapper");
  const menuToggleLabel = document.querySelector(".menu-toggle-label p");
  const hambergerIcon = document.querySelector(".menu-hamburger-icon");

  if (!menuToggleBtn || !menuOverlay || !menuOverlayContainer) {
    return () => {};
  }
  if (!window.gsap) {
    return () => {};
  }

  const lenis = window.lenis;
  let isMenuOpen = false;

  const setMenuState = (open) => {
    isMenuOpen = open;
    if (typeof onStateChange === "function") onStateChange(open);
    document.body.classList.toggle("menu-open", open);

    if (navEl) navEl.style.pointerEvents = open ? "auto" : "none";
    if (menuBar) menuBar.style.pointerEvents = "auto";
    if (menuOverlay) menuOverlay.style.pointerEvents = open ? "auto" : "none";
    if (menuOverlayContainer) menuOverlayContainer.style.pointerEvents = open ? "auto" : "none";

    document.body.style.cursor = open ? "default" : "";
  };

  let splitTextByContainer = [];

  const buildMenuSplits = () => {
    splitTextByContainer.flat().forEach((s) => s?.revert?.());
    splitTextByContainer = [];

    const textContainers = document.querySelectorAll(".menu-col");
    textContainers.forEach((container) => {
      const textElements = container.querySelectorAll("a, p");
      const containerSplits = [];

      textElements.forEach((element) => {
        const split = SplitText.create(element, {
          type: "lines",
          mask: "lines",
          linesClass: "line",
        });
        containerSplits.push(split);
      });

      splitTextByContainer.push(containerSplits);
    });
  };

  const getMenuLines = () =>
    splitTextByContainer.flatMap((containerSplits) =>
      containerSplits.flatMap((split) => split.lines)
    );

  const resetMenuLines = () => {
    gsap.set(getMenuLines(), { y: "-110%" });
  };

  buildMenuSplits();
  resetMenuLines();

  gsap.set(menuOverlay, {
    clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
  });
  gsap.set(menuOverlayContainer, { yPercent: -50 });
  gsap.set(menuMediaWrapper, { opacity: 0 });

  const menuTL = gsap.timeline({ paused: true });

  menuTL
    .add(() => {
      setMenuState(true);
      resetMenuLines();
      lenis?.stop?.();
      hambergerIcon?.classList.add("active");
    }, 0)
    .to(menuToggleLabel, { y: "-110%", duration: 1, ease: "hop" }, 0)
    .to(
      menuOverlay,
      {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        duration: 1,
        ease: "hop",
      },
      0
    )
    .to(menuOverlayContainer, { yPercent: 0, duration: 1, ease: "hop" }, 0)
    .to(menuMediaWrapper, { opacity: 1, duration: 0.75, ease: "power2.out" }, 0.5)
    .to(getMenuLines(), { y: "0%", duration: 1.5, ease: "hop", stagger: -0.075 }, 0.7);

  menuTL.eventCallback("onReverseComplete", () => {
    hambergerIcon?.classList.remove("active");
    lenis?.start?.();
    gsap.set(menuMediaWrapper, { opacity: 0 });
    resetMenuLines();
    setMenuState(false);
  });

  const stopDragEventsWhenMenuOpen = (e) => {
    if (!isMenuOpen) return;
    e.stopPropagation();
  };

  const blockEvents = [
    "mousedown",
    "mousemove",
    "mouseup",
    "touchstart",
    "touchmove",
    "touchend",
    "pointerdown",
    "pointermove",
    "pointerup",
  ];

  blockEvents.forEach((t) => {
    menuBar?.addEventListener(t, stopDragEventsWhenMenuOpen, { passive: false });
    menuOverlay?.addEventListener(t, stopDragEventsWhenMenuOpen, { passive: false });
  });

  const stopAlways = (e) => e.stopPropagation();
  ["pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend"].forEach((t) => {
    menuToggleBtn.addEventListener(t, stopAlways, { passive: false });
  });

  const onToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (menuTL.progress() === 0 || menuTL.reversed()) {
      menuTL.timeScale(1);
      menuTL.play(0);
    } else {
      menuTL.timeScale(1.35);
      menuTL.reverse();
    }
  };

  setMenuState(false);
  menuToggleBtn.addEventListener("click", onToggle);

  window.__menuClose = () => {
    if (menuTL.progress() === 0 || menuTL.reversed()) return;
    menuTL.timeScale(1.35);
    menuTL.reverse();
  };
  window.__menuIsOpen = () => isMenuOpen;

  return () => {
    menuTL.kill();
    splitTextByContainer.flat().forEach((s) => s?.revert?.());
    blockEvents.forEach((t) => {
      menuBar?.removeEventListener(t, stopDragEventsWhenMenuOpen);
      menuOverlay?.removeEventListener(t, stopDragEventsWhenMenuOpen);
    });
    ["pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend"].forEach((t) => {
      menuToggleBtn.removeEventListener(t, stopAlways);
    });
    menuToggleBtn.removeEventListener("click", onToggle);
    if (window.__menuClose) window.__menuClose = null;
    if (window.__menuIsOpen) window.__menuIsOpen = null;
  };
}
