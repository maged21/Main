document.addEventListener("DOMContentLoaded", () => {

       // === Initialize Lenis for smooth scrolling ===
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: false,
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);

  // === Register GSAP Plugins ===
  gsap.registerPlugin(ScrollTrigger);

  // === Helper: Split text into spans (free alternative to SplitText) ===
  function splitText(selector) {
    const element = document.querySelector(selector);
    if (!element) return;
    const text = element.textContent.trim();
    const split = text.split("").map((char) => {
      const span = document.createElement("span");
      span.textContent = char === " " ? "\u00A0" : char;
      return span;
    });
    element.textContent = "";
    split.forEach((span) => element.appendChild(span));
    return element.querySelectorAll("span");
  }

  // === Animate Hero Text ===
  const heroSpans = splitText(".hero .header h1");

  gsap.from(heroSpans, {
    yPercent: 100,
    opacity: 0,
    stagger: 0.03,
    duration: 1.2,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".hero .header",
      start: "top 80%",
    },
  });

  // === Animate About Section ===
  const aboutSpans = splitText(".about .header h1");

  gsap.from(aboutSpans, {
    yPercent: 100,
    opacity: 0,
    stagger: 0.02,
    duration: 1,
    ease: "power2.out",
    scrollTrigger: {
      trigger: ".about",
      start: "top 75%",
    },
  });

  // === Image Parallax ===
  gsap.to(".about-img img", {
    yPercent: -20,
    ease: "none",
    scrollTrigger: {
      trigger: ".about-img",
      scrub: true,
    },
  });

  // === Story Section Fade/Slide ===
  gsap.from(".story .col h1", {
    x: -100,
    opacity: 0,
    duration: 1,
    scrollTrigger: {
      trigger: ".story",
      start: "top 80%",
    },
  });

  gsap.from(".story .col p", {
    y: 50,
    opacity: 0,
    stagger: 0.2,
    duration: 1,
    scrollTrigger: {
      trigger: ".story",
      start: "top 75%",
    },
  });

  // === Philosophy Section ===
  const philosophySpans = splitText(".philosophy .header h1");

  gsap.from(philosophySpans, {
    yPercent: 100,
    opacity: 0,
    stagger: 0.025,
    duration: 1.2,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".philosophy",
      start: "top 80%",
    },
  });

  // === Footer Fade In ===
  gsap.from("footer", {
    opacity: 0,
    y: 100,
    duration: 1,
    scrollTrigger: {
      trigger: "footer",
      start: "top 90%",
    },
  });
});
