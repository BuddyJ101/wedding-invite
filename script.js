document.addEventListener("DOMContentLoaded", () => {
  initEnvelopeOverlay();
  initHeroScrub();
  initScratchCards();
  initCountdown();
  initRSVPForm();
  initScrollAnimations();
  initAddToCalendar();
  initSmoothAnchors();
});

/* =========================
   Envelope Overlay
========================= */
function initEnvelopeOverlay() {
  const envelopeOverlay = document.getElementById("envelope-overlay");
  const waxSeal = document.getElementById("wax-seal");
  const mainContent = document.getElementById("main-content");

  if (!envelopeOverlay || !waxSeal) return;

  const open = () => {
    if (envelopeOverlay.classList.contains("opened")) return;

    envelopeOverlay.classList.add("opened");

    const topFlap = document.querySelector(".envelope-flap-top");
    const done = () => {
      envelopeOverlay.classList.add("faded");

      // reveal main content
      if (mainContent) {
        mainContent.classList.remove("hidden");
        requestAnimationFrame(() => mainContent.classList.add("visible"));
      }

      // fix hero sizing after display:none -> visible
      requestAnimationFrame(() => {
        if (window._heroScrubResize) window._heroScrubResize();
      });
    };

    if (topFlap) {
      const onEnd = (e) => {
        if (e.propertyName !== "transform") return;
        topFlap.removeEventListener("transitionend", onEnd);
        done();
      };
      topFlap.addEventListener("transitionend", onEnd, { once: true });
    } else {
      // fallback
      setTimeout(done, 1600);
    }
  };

  waxSeal.addEventListener("click", open);

  // keyboard accessibility
  waxSeal.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });
}

/* =========================
   Scratch Cards (Pointer Events)
========================= */
function initScratchCards() {
  const cards = document.querySelectorAll(".scratch-card");
  if (!cards.length) return;

  let revealedCount = 0;

  cards.forEach((card) => {
    const canvas = card.querySelector(".scratch-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    // HiDPI canvas sizing
    const cssSize = 120;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    canvas.style.width = cssSize + "px";
    canvas.style.height = cssSize + "px";

    // Build scratch layer
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#a8d4f0");
    gradient.addColorStop(0.5, "#6bb3d9");
    gradient.addColorStop(1, "#4a9bc4");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // subtle sparkle blobs
    ctx.globalCompositeOperation = "source-atop";
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 20 + 10,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3})`;
      ctx.fill();
    }

    // center icon
    ctx.globalCompositeOperation = "source-over";
    ctx.font = `bold ${Math.round(24 * dpr)}px Montserrat, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✦", canvas.width / 2, canvas.height / 2);

    // scratching mode
    ctx.globalCompositeOperation = "destination-out";

    let isDown = false;
    let needsCheck = false;
    let movesSinceCheck = 0;
    const revealThreshold = 0.4; // 40%
    const totalPixels = canvas.width * canvas.height;

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }

    function scratchAt(pos) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 25 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    function checkScratched() {
      needsCheck = false;
      if (card.classList.contains("revealed")) return;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      let transparentPixels = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) transparentPixels++;
      }

      const scratchedPercent = transparentPixels / totalPixels;
      if (scratchedPercent > revealThreshold) {
        card.classList.add("revealed");
        revealedCount++;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (revealedCount === cards.length) {
          setTimeout(() => showCountdownSection(), 500);
        }
      }
    }

    function scheduleCheck() {
      if (needsCheck) return;
      needsCheck = true;
      requestAnimationFrame(checkScratched);
    }

    canvas.addEventListener("pointerdown", (e) => {
      isDown = true;
      canvas.setPointerCapture(e.pointerId);
      scratchAt(getPos(e));
      scheduleCheck();
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      scratchAt(getPos(e));

      // throttle expensive getImageData checks
      movesSinceCheck++;
      if (movesSinceCheck >= 6) {
        movesSinceCheck = 0;
        scheduleCheck();
      }
    });

    canvas.addEventListener("pointerup", () => {
      isDown = false;
      scheduleCheck();
    });

    canvas.addEventListener("pointercancel", () => {
      isDown = false;
      scheduleCheck();
    });
  });
}

function showCountdownSection() {
  const countdownSection = document.querySelector(".countdown-section");
  if (countdownSection) countdownSection.scrollIntoView({ behavior: "smooth" });
}

/* =========================
   Countdown
========================= */
function initCountdown() {
  // Wedding date: July 25, 2026 15:00
  const weddingDate = new Date("2026-07-25T15:00:00").getTime();

  const daysEl = document.getElementById("days");
  const hoursEl = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");
  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  const tick = () => {
    const now = Date.now();
    const distance = weddingDate - now;

    if (distance <= 0) {
      daysEl.textContent = "0";
      hoursEl.textContent = "00";
      minutesEl.textContent = "00";
      secondsEl.textContent = "00";
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    daysEl.textContent = String(days);
    hoursEl.textContent = String(hours).padStart(2, "0");
    minutesEl.textContent = String(minutes).padStart(2, "0");
    secondsEl.textContent = String(seconds).padStart(2, "0");
  };

  tick();
  setInterval(tick, 1000);
}

/* =========================
   RSVP Form
========================= */
function initRSVPForm() {
  const form = document.getElementById("rsvpForm");
  if (!form) return;

  const attendanceBtns = form.querySelectorAll(".attendance-btn");
  const attendanceInput = document.getElementById("attendance");
  if (!attendanceInput) return;

  attendanceBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      attendanceBtns.forEach((b) => {
        b.classList.remove("selected");
        const icon = b.querySelector(".btn-icon");
        if (icon) icon.textContent = "○";
      });

      btn.classList.add("selected");
      attendanceInput.value = btn.dataset.value || "";

      const icon = btn.querySelector(".btn-icon");
      if (icon) icon.textContent = "●";
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());

    if (!data.fullname || !data.attendance) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    const submitBtn = form.querySelector(".submit-btn");
    if (!submitBtn) return;

    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    setTimeout(() => {
      showNotification("Thank you! Your RSVP has been confirmed.", "success");
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;

      form.reset();
      attendanceBtns.forEach((b) => {
        b.classList.remove("selected");
        const icon = b.querySelector(".btn-icon");
        if (icon) icon.textContent = "○";
      });
    }, 1200);
  });
}

/* =========================
   Notifications (no inline style injection)
========================= */
function showNotification(message, type = "info") {
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span class="notification-message">${message}</span>
    <button class="notification-close" aria-label="Close notification">×</button>
  `;

  document.body.appendChild(notification);

  notification.querySelector(".notification-close")?.addEventListener("click", () => {
    notification.remove();
  });

  setTimeout(() => {
    notification.style.animation = "slideDown 0.3s ease reverse";
    setTimeout(() => notification.remove(), 280);
  }, 5000);
}

/* =========================
   Scroll Animations
========================= */
function initScrollAnimations() {
  const sections = document.querySelectorAll("section:not(#hero)");
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  sections.forEach((section) => {
    section.classList.add("section-animate");
    observer.observe(section);
  });
}

/* =========================
   Add to Calendar
========================= */
function initAddToCalendar() {
  const btn = document.getElementById("addToCalendar");
  if (!btn) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();

    const eventTitle = "Amber & Junaid Wedding";
    const eventLocation = "Palm Villa, Plot NR.27 Draaifontein Rd, Greenbushes, Port Elizabeth";

    // July 25, 2026 15:00 -> 23:00
    const startDate = "20260725T150000";
    const endDate = "20260725T230000";

    const url =
      `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(eventTitle)}` +
      `&dates=${startDate}/${endDate}` +
      `&location=${encodeURIComponent(eventLocation)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  });
}

/* =========================
   Hero Scrub
========================= */
function initHeroScrub() {
  const FRAMES_DIR = "./frames/";
  const FRAME_PREFIX = "frame";
  const FRAME_DIGITS = 4;
  const FRAME_EXT = ".jpg";
  const TOTAL_FRAMES = 121;

  const driver = document.getElementById("scroll-driver");
  const hero = document.getElementById("hero");
  const canvas = document.getElementById("frame-canvas");
  const loaderEl = document.getElementById("loader");
  const loaderBar = document.getElementById("loader-bar");
  const progressBar = document.getElementById("progress-bar");
  const scrollHint = document.querySelector(".hero-scroll-hint");

  if (!driver || !hero || !canvas) return;

  const ctx = canvas.getContext("2d");
  let bitmaps = [];
  let frameCount = 0;
  let currentFrame = -1;

  function setHeights() {
    const h = window.innerHeight;
    driver.style.height = h * 5 + "px"; // 4x scrub + 1x exit
    hero.style.height = h + "px";
  }

  function framePath(i) {
    return `${FRAMES_DIR}${FRAME_PREFIX}${String(i).padStart(FRAME_DIGITS, "0")}${FRAME_EXT}`;
  }

  function drawFrame(index) {
    const bmp = bitmaps[index];
    if (!bmp) return;

    const cw = canvas.offsetWidth;
    const ch = canvas.offsetHeight;

    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const scale = Math.max(cw / bmp.width, ch / bmp.height);
    const sw = bmp.width * scale;
    const sh = bmp.height * scale;

    ctx.drawImage(bmp, (cw - sw) / 2, (ch - sh) / 2, sw, sh);
  }

  function onScroll() {
    if (!frameCount) return;

    const scrolled = window.scrollY - driver.offsetTop;
    const range = driver.offsetHeight - window.innerHeight;
    const progress = Math.min(Math.max(scrolled / range, 0), 1);

    const frame = Math.min(Math.round(progress * (frameCount - 1)), frameCount - 1);
    if (frame !== currentFrame) {
      currentFrame = frame;
      drawFrame(frame);
      if (progressBar) progressBar.style.width = progress * 100 + "%";
    }

    if (scrollHint) scrollHint.style.opacity = window.scrollY > 40 ? "0" : "1";
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener(
    "resize",
    () => {
      setHeights();
      canvas.width = 0;
      if (currentFrame >= 0) drawFrame(currentFrame);
      onScroll();
    },
    { passive: true }
  );

  async function loadFrames(total) {
    frameCount = total;
    bitmaps = new Array(total);

    const BATCH = 12;
    let loaded = 0;

    for (let s = 1; s <= total; s += BATCH) {
      const e = Math.min(s + BATCH - 1, total);
      const batch = [];

      for (let i = s; i <= e; i++) {
        const idx = i - 1;

        batch.push(
          fetch(framePath(i))
            .then((r) => r.blob())
            .then((blob) => createImageBitmap(blob))
            .then((bmp) => {
              bitmaps[idx] = bmp;
              loaded++;
              if (loaderBar) loaderBar.style.width = (loaded / total) * 100 + "%";
            })
        );
      }

      await Promise.all(batch);
    }
  }

  (async () => {
    try {
      setHeights();
      await loadFrames(TOTAL_FRAMES);
      drawFrame(0);
      onScroll();

      if (loaderEl) {
        loaderEl.classList.add("hidden");
        setTimeout(() => loaderEl.remove(), 600);
      }
    } catch (e) {
      console.error("Hero scrub failed:", e);
    }
  })();

  window._heroScrubResize = () => {
    setHeights();
    onScroll();
  };
}

/* =========================
   Smooth anchor scroll
========================= */
function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    });
  });
}