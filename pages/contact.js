export default function initContact() {
  gsap.registerPlugin(ScrollTrigger);

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

  const lenis = initLenis();

  const runIntro = () => {
    const tl = gsap.timeline({
      defaults: {
        ease: "power3.out",
        duration: 0.8,
      },
    });

    // LEFT INTRO
    tl.fromTo(
      ".contact-info-intro > *",
      { y: 30, opacity: 0, filter: "blur(10px)" },
      {
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        stagger: 0.12,
      }
    );

    // FEATURE LIST
    tl.fromTo(
      ".feature-list li",
      { x: -20, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        stagger: 0.08,
      },
      "-=0.4"
    );

    // CONTACT INFO BOTTOM
    tl.fromTo(
      ".contact-info-content > *",
      { y: 20, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.1,
      },
      "-=0.3"
    );
    // FORM CONTAINER
    tl.to(".contact-form", {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 0.8,
    });

    // FORM CONTENT
    tl.fromTo(
      ".contact-form > *",
      { y: 20, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.12,
      },
      "-=0.4"
    );
  };

  const initContactForm = () => {
    const form = document.querySelector(".contact-form");
    const success = document.querySelector(".form-success");
    const submitBtn = form?.querySelector(".submit-btn");
    let submitLabel = submitBtn?.querySelector(".submit-label");
    let submitIcon = submitBtn?.querySelector(".submit-icon");
    if (!form || !success) return;

    const nameInput = form.querySelector('input[name="name"]');
    const emailInput = form.querySelector('input[name="email"]');
    const phoneInput = form.querySelector('input[name="phone"]');
    const messageInput = form.querySelector('textarea[name="message"]');
    const charCount = form.querySelector(".char-count");

    if (submitBtn && (!submitLabel || !submitIcon)) {
      submitBtn.innerHTML =
        '<span class="submit-label">Submit</span><span class="submit-icon">&#9993;</span>';
      submitLabel = submitBtn.querySelector(".submit-label");
      submitIcon = submitBtn.querySelector(".submit-icon");
    }

    if (submitLabel && !submitLabel.dataset.label) {
      submitLabel.dataset.label = submitLabel.textContent?.trim() || "Submit";
    }

    const restoreSubmitButton = () => {
      if (!submitBtn) return;
      if (submitLabel) {
        submitLabel.textContent = submitLabel.dataset.label || "Submit";
      }
      if (submitIcon) submitIcon.style.display = "";
      submitBtn.disabled = false;
      submitBtn.style.opacity = "1";
      submitBtn.style.display = "flex";
      submitBtn.style.visibility = "visible";
    };

    const updateCharCount = () => {
      if (!charCount || !messageInput) return;
      const maxLength = Number(messageInput.getAttribute("maxlength")) || 300;
      const remaining = Math.max(0, maxLength - messageInput.value.length);
      charCount.textContent = `${remaining}/${maxLength}`;
    };

    const setFieldState = (field, state, message = "") => {
      const group = field?.closest(".form-group");
      if (!group) return;
      group.classList.toggle("is-valid", state === "valid");
      group.classList.toggle("is-invalid", state === "invalid");
      const error = group.querySelector(".form-error");
      if (error) {
        error.textContent = state === "invalid" ? message : "";
      }
    };

    const validateName = (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return { state: "invalid", message: "Full name is required." };
      }
      const namePattern = /^[A-Za-z]+(?:[ '\\-][A-Za-z]+)*$/;
      if (!namePattern.test(trimmed)) {
        return {
          state: "invalid",
          message: "Only letters and spaces are allowed.",
        };
      }
      return { state: "valid" };
    };

    const validateEmail = (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return { state: "invalid", message: "Email is required." };
      }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(trimmed)) {
        return {
          state: "invalid",
          message: "Enter a valid email (name@example.com).",
        };
      }
      return { state: "valid" };
    };

    const validatePhone = (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return { state: "none" };
      }
      const phonePattern = /^[0-9+\-\s()]+$/;
      if (!phonePattern.test(trimmed)) {
        return { state: "invalid", message: "Use numbers only." };
      }
      return { state: "valid" };
    };

    const validateMessage = (value) => {
      if (!value.trim()) {
        return { state: "invalid", message: "Message is required." };
      }
      return { state: "valid" };
    };

    const validateField = (field) => {
      if (!field) return { state: "valid" };
      switch (field.name) {
        case "name":
          return validateName(field.value);
        case "email":
          return validateEmail(field.value);
        case "phone":
          return validatePhone(field.value);
        case "message":
          return validateMessage(field.value);
        default:
          return { state: "valid" };
      }
    };

    const validateAndUpdate = (field) => {
      const result = validateField(field);
      setFieldState(field, result.state, result.message);
      return result.state !== "invalid";
    };

    let hideTimer = null;
    const showSuccess = () => {
      success.classList.add("is-visible");
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        success.classList.remove("is-visible");
        restoreSubmitButton();
      }, 3000);
    };

    const setLoading = (loading) => {
      if (!submitBtn) return;
      submitBtn.disabled = loading;
      if (submitLabel) {
        submitLabel.textContent = loading
          ? "Sending..."
          : submitLabel.dataset.label || "Submit";
      }
      if (submitIcon) {
        submitIcon.style.display = loading ? "none" : "";
      }
      submitBtn.style.opacity = loading ? "0.8" : "1";
      submitBtn.style.visibility = "visible";
      submitBtn.style.display = "flex";
    };

    if (nameInput) {
      nameInput.addEventListener("input", () => {
        const cleaned = nameInput.value.replace(/[^A-Za-z\s'-]/g, "");
        if (cleaned !== nameInput.value) {
          nameInput.value = cleaned;
        }
        validateAndUpdate(nameInput);
      });
      nameInput.addEventListener("blur", () => validateAndUpdate(nameInput));
    }

    if (emailInput) {
      emailInput.addEventListener("input", () => validateAndUpdate(emailInput));
      emailInput.addEventListener("blur", () => validateAndUpdate(emailInput));
    }

    if (phoneInput) {
      phoneInput.addEventListener("input", () => {
        const cleaned = phoneInput.value.replace(/[^0-9+\-\s()]/g, "");
        if (cleaned !== phoneInput.value) {
          phoneInput.value = cleaned;
        }
        validateAndUpdate(phoneInput);
      });
      phoneInput.addEventListener("blur", () => validateAndUpdate(phoneInput));
    }

    if (messageInput) {
      messageInput.addEventListener("input", () => {
        updateCharCount();
        validateAndUpdate(messageInput);
      });
      messageInput.addEventListener("blur", () => validateAndUpdate(messageInput));
      updateCharCount();
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (submitBtn?.disabled) return;

      const fieldsToValidate = [
        nameInput,
        emailInput,
        phoneInput,
        messageInput,
      ];
      const isValid = fieldsToValidate.every((field) =>
        validateAndUpdate(field)
      );
      if (!isValid) {
        const firstInvalid = fieldsToValidate.find((field) =>
          field?.closest(".form-group")?.classList.contains("is-invalid")
        );
        firstInvalid?.focus();
        return;
      }

      const endpoint = form.dataset.endpoint || "";
      if (!endpoint || endpoint === "YOUR_GOOGLE_SCRIPT_URL") {
        console.warn("Contact form endpoint not set.");
        return;
      }

      try {
        setLoading(true);
        const formData = new FormData(form);
        formData.append("timestamp", new Date().toISOString());

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Form submission failed.");
        }

        form.reset();
        fieldsToValidate.forEach((field) => setFieldState(field, "none"));
        updateCharCount();
        showSuccess();
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
        restoreSubmitButton();
      }
    });

    form.addEventListener("reset", () => {
      restoreSubmitButton();
      [nameInput, emailInput, phoneInput, messageInput].forEach((field) =>
        setFieldState(field, "none")
      );
      updateCharCount();
    });
  };

  if (document.readyState === "complete") {
    runIntro();
    initContactForm();
  } else {
    requestAnimationFrame(() => {
      runIntro();
      initContactForm();
    });
  }
}
