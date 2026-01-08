import initAnimation from "../animation.js";
import initMenu from "./menu.js";
import { initLinks } from "./links.js";
import { navigate } from "./router.js";

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

if (sessionStorage.getItem("forceTopOnReload") === "1") {
  sessionStorage.removeItem("forceTopOnReload");
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
  });
}

const getSizeBucket = () => {
  const width = window.innerWidth;
  if (width < 768) return "xs";
  if (width < 1000) return "sm";
  if (width < 1200) return "md";
  return "lg";
};

let sizeBucket = getSizeBucket();
let resizeReloadTimer = null;
window.addEventListener("resize", () => {
  if (resizeReloadTimer) {
    clearTimeout(resizeReloadTimer);
  }
  resizeReloadTimer = setTimeout(() => {
    const nextBucket = getSizeBucket();
    if (nextBucket !== sizeBucket) {
      sizeBucket = nextBucket;
      sessionStorage.setItem("forceTopOnReload", "1");
      location.reload();
    }
  }, 250);
});

async function initPage() {
  window.__fluidGlobal = true;
  let animationCleanup = null;
  const prevCleanup = window.__pageCleanup;
  window.__pageCleanup = () => {
    if (typeof prevCleanup === "function") prevCleanup();
    if (typeof animationCleanup === "function") animationCleanup();
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      animationCleanup = initAnimation();
    });
  });

  if (!window.__menuInitialized) {
    window.__menuInitialized = true;
    initMenu();
  }

  const page = document.body.dataset.page;
  if (page === "home") {
    const mod = await import("./home.js");
    mod.default();
  }
  if (page === "about") {
    const mod = await import("../pages/about-script.js");
    mod.default();
  }
  if (page === "projects") {
    const mod = await import("../pages/project-script.js");
    mod.default();
  }
  if (page === "contact") {
    const mod = await import("../pages/contact.js");
    mod.default();
  }
}

window.__appInit = initPage;

// FIRST LOAD (normal page load, no fetch)
initPage();
initLinks();

// BACK / FORWARD SUPPORT (SPA navigation)
window.addEventListener("popstate", () => {
  navigate(location.pathname, { push: false, force: true });
});




// import initGlobal from "./global.js";

// import initHome from "./home.js";
// import initAbout from "../pages/about-script.js";
// import initProjects from "../pages/project-script.js";
// import initContact from "../pages/contact.js";

// initGlobal(); // 🔥 RUN COMMON CODE ON ALL PAGES

// const page = document.body.dataset.page;

// if (page === "home") initHome();
// if (page === "about") initAbout();
// if (page === "projects") initProjects();
// if (page === "contact") initContact();
