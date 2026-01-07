import { pageEnter, pageExit } from "./transitions.js";

let isNavigating = false;

function normalizePath(path) {
  if (!path || path === "/") return "/index.html";
  return path;
}

async function fetchPage(path) {
  const res = await fetch(path, {
    headers: { "X-Requested-With": "spa" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load ${path}`);
  }

  const html = await res.text();
  return new DOMParser().parseFromString(html, "text/html");
}

function waitForTween(tween) {
  return new Promise((resolve) => {
    if (!tween) return resolve();
    tween.eventCallback("onComplete", resolve);
  });
}

function cleanupPage() {
  if (typeof window.__pageCleanup === "function") {
    try {
      window.__pageCleanup();
    } catch (err) {
      console.warn("page cleanup failed", err);
    }
    window.__pageCleanup = null;
  }

  if (window.ScrollTrigger) {
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill(true));
    ScrollTrigger.clearMatchMedia?.();
  }

  if (window.gsap) {
    gsap.killTweensOf("#page-content");
    gsap.killTweensOf("#page-content *");
  }

  if (window.__lenisTicker && window.gsap) {
    gsap.ticker.remove(window.__lenisTicker);
    window.__lenisTicker = null;
  }

  if (window.lenis) {
    window.lenis.stop?.();
    window.lenis.destroy?.();
    window.lenis = null;
  }
}

export async function navigate(path, options = {}) {
  if (isNavigating) return;

  const targetPath = normalizePath(path);
  const currentPath = normalizePath(location.pathname);
  if (targetPath === currentPath && !options.force) return;

  isNavigating = true;
  const menuOpen = typeof window.__menuIsOpen === "function" && window.__menuIsOpen();

  let nextDoc;
  try {
    nextDoc = await fetchPage(targetPath);
  } catch (err) {
    console.warn(err);
    location.href = targetPath;
    return;
  }

  if (!menuOpen) {
    await waitForTween(pageExit());
  }
  cleanupPage();

  const nextContent = nextDoc.querySelector("#page-content");
  const currentContent = document.querySelector("#page-content");
  if (!nextContent || !currentContent) {
    location.href = targetPath;
    return;
  }

  const nextBody = nextDoc.body;
  document.title = nextDoc.title || document.title;
  document.body.className = nextBody?.className || "";
  if (nextBody?.dataset?.page) {
    document.body.dataset.page = nextBody.dataset.page;
  }

  currentContent.replaceWith(nextContent);

  if (options.push !== false) {
    history.pushState({}, "", targetPath);
  }

  window.scrollTo(0, 0);
  requestAnimationFrame(() => window.scrollTo(0, 0));

  if (typeof window.__appInit === "function") {
    window.__appInit();
  }

  if (menuOpen) {
    const swappedContent = document.querySelector("#page-content");
    if (swappedContent) {
      swappedContent.style.opacity = "0";
    }
    window.__menuClose?.();
    setTimeout(() => {
      if (swappedContent) {
        if (window.gsap) {
          gsap.to(swappedContent, {
            opacity: 1,
            duration: 1.1,
            ease: "power3.out",
            clearProps: "opacity",
          });
        } else {
          swappedContent.style.opacity = "1";
        }
      }
      window.scrollTo(0, 0);
    }, 1150);
  } else {
    pageEnter();
  }
  isNavigating = false;
}
