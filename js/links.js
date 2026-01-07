import { navigate } from "./router.js";

export function initLinks() {
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const link = e.target.closest("a");

    if (!link) return;
    if (!link.href) return;
    if (link.target === "_blank") return;
    if (link.hasAttribute("download")) return;
    if (link.origin !== location.origin) return;
    if (link.pathname === location.pathname && link.hash) return;

    e.preventDefault();
    navigate(`${link.pathname}${link.search}`);
  });
}
