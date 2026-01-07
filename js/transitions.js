function ensureOverlay() {
  let overlay = document.getElementById("page-transition");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "page-transition";
    document.body.appendChild(overlay);
  }
  return overlay;
}

export function pageExit() {
  const overlay = ensureOverlay();
  const tl = gsap.timeline();

  tl.set(overlay, {
    opacity: 0,
  })
    .add(() => {
      window.__menuClose?.();
    }, 0)
    .to(overlay, {
      opacity: 1,
      duration: 0.5,
      ease: "power2.out",
    })
    .to(
      "#page-content",
      {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
      },
      0
    );

  return tl;
}

export function pageEnter() {
  const overlay = ensureOverlay();
  const tl = gsap.timeline();

  tl.set("#page-content", { opacity: 1 })
    .to(overlay, {
      opacity: 0,
      duration: 0.6,
      ease: "power2.inOut",
      onComplete: () => {
        overlay.style.opacity = "0";
      },
    });

  return tl;
}
