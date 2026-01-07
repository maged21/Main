

export default function initGlobal() {
  initMenu();
  initFooter();
}

/* ================= MENU ================= */

function initMenu() {
  const textContainers = document.querySelectorAll(".menu-col");
  if (!textContainers.length) return;

  let splitTextByContainer = [];

  textContainers.forEach((container) => {
    const textElements = container.querySelectorAll("a, p");
    let containerSplits = [];

    textElements.forEach((element) => {
      const split = SplitText.create(element, {
        type: "lines",
        mask: "lines",
        linesClass: "line",
      });
      containerSplits.push(split);
      gsap.set(split.lines, { y: "-110%" });
    });

    splitTextByContainer.push(containerSplits);
  });

  const container = document.querySelector(".container");
  const menuToggleBtn = document.querySelector(".menu-toggle-btn");
  const menuOverlay = document.querySelector(".menu-overlay");
  const menuOverlayContainer = document.querySelector(".menu-overlay-content");
  const menuMediaWrapper = document.querySelector(".menu-media-wrapper");
  const copyContainers = document.querySelector(".menu-col");
  const menuToggleLabel = document.querySelector(".menu-toggle-label p");
  const hambergerIcon = document.querySelector(".menu-hamburger-icon");

  if (!menuToggleBtn) return;

  let isMenuOpen = false;
  let isAnimating = false;

  menuToggleBtn.addEventListener("click", () => {
    if (isAnimating) return;

    const tl = gsap.timeline({
      onComplete: () => (isAnimating = false),
    });

    isAnimating = true;

    if (!isMenuOpen) {
      tl.to(menuToggleLabel, { y: "-110%", duration: 1, ease: "hop" })
        .to(container, { y: 100, duration: 1, ease: "hop" }, "<")
        .to(
          menuOverlay,
          {
            clipPath: "polygon(0% 0%,100% 0%,100% 100%,0% 100%)",
            duration: 1,
            ease: "hop",
          },
          "<"
        )
        .to(
          menuOverlayContainer,
          { yPercent: 0, duration: 1, ease: "hop" },
          "<"
        )
        .to(menuMediaWrapper, { opacity: 1, duration: 0.75 }, "<");

      splitTextByContainer.forEach((containerSplits) => {
        const lines = containerSplits.flatMap((s) => s.lines);
        tl.to(lines, { y: "0%", stagger: -0.075, duration: 2 }, -0.15);
      });

      hambergerIcon.classList.add("active");
      isMenuOpen = true;
    } else {
      tl.to(container, { yPercent: 0, duration: 1, ease: "hop" })
        .to(
          menuOverlay,
          {
            clipPath: "polygon(0% 0%,100% 0%,100% 0%,0% 0%)",
            duration: 1,
          },
          "<"
        )
        .to(menuOverlayContainer, { yPercent: -50, duration: 1 }, "<")
        .to(menuToggleLabel, { y: "0%", duration: 1 }, "<");

      hambergerIcon.classList.remove("active");
      isMenuOpen = false;
    }
  });
}

/* ================= FOOTER ================= */

function initFooter() {
  if (!document.querySelector(".footer-section")) return;

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

  gsap.to(".footer-big-text", {
    scrollTrigger: {
      trigger: ".footer-bottom",
      start: "top 90%",
    },
    y: "0%",
    opacity: 1,
    duration: 1.4,
    ease: "power4.out",
  });
}
