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


// ===== RSVP BACKEND CONFIG =====
const RSVP_API_BASE = "https://script.google.com/macros/s/AKfycbyPe85jGsLQ2yS-BxHCtofzTgHJAwgUOibTXHo2zf7nEqDuKLOXOSrAh31TgiVs43Jd/exec";
const KEEPSAKE_BASE_URL = "https://buddyj101.github.io/keepsake/";

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
async function initRSVPForm() {
    const form = document.getElementById("rsvpForm");
    if (!form) return;

    // ===== DOM =====
    const params = new URLSearchParams(window.location.search);

    const inviteParam = (params.get("invite") || "").trim();
    const inviteKey = inviteParam
        .trim()
        .toLowerCase();

    const urlName = params.get("name")
        ? decodeURIComponent(params.get("name"))
        : "";

    if (urlName) {
        setSealNames(urlName);

        const displayNameEl = document.getElementById("displayName");
        const rsvpDisplayNameEl = document.getElementById("rsvpDisplayName");

        if (displayNameEl) displayNameEl.value = urlName;
        if (rsvpDisplayNameEl) rsvpDisplayNameEl.textContent = urlName;
    }

    const rsvpBody = document.getElementById("rsvpBody");

    const displayNameEl = document.getElementById("displayName");
    const rsvpDisplayNameEl = document.getElementById("rsvpDisplayName");
    const rsvpDeadlineEl = document.getElementById("rsvpDeadline");
    const statusEl = document.getElementById("rsvpStatus");

    const attendanceBtns = form.querySelectorAll(".attendance-btn");
    const attendanceInput = document.getElementById("attendance");

    const guestControls = document.getElementById("guestControls");
    const guestMinus = document.getElementById("guestMinus");
    const guestPlus = document.getElementById("guestPlus");
    const guestCountInput = document.getElementById("guestCount");
    const guestCountDisplay = document.getElementById("guestCountDisplay");
    const guestMaxDisplay = document.getElementById("guestMaxDisplay");

    const namedGuestsList = document.getElementById("namedGuestsList");
    const guestPickHint = document.getElementById("guestPickHint");

    const extraNamesGroup = document.getElementById("extraNamesGroup");
    const extraSlotsList = document.getElementById("extraSlotsList");

    const messageEl = document.getElementById("message");
    const submitBtn = document.getElementById("rsvpSubmitBtn");
    const keepsakeSection = document.getElementById("keepsake-section");
    const qrTrigger = document.getElementById("qr-trigger");
    const qrContainer = document.getElementById("qr-container");
    const keepsakeLink = document.getElementById("keepsake-link");
    const keepsakeModal = document.getElementById("keepsake-modal");
    const keepsakeModalDialog = keepsakeModal?.querySelector(".keepsake-modal-dialog") || null;
    const keepsakeModalClose = document.getElementById("keepsake-modal-close");
    const keepsakeModalLink = document.getElementById("keepsake-modal-link");
    const qrModalContainer = document.getElementById("qr-modal-container");
    let keepsakeUrl = "";
    let lastModalTrigger = null;
    const modalFocusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    // ===== UI helpers =====
    function hideRsvpBody() {
        if (rsvpBody) rsvpBody.classList.add("hidden");
    }

    function showRsvpBody() {
        if (rsvpBody) rsvpBody.classList.remove("hidden");
    }

    function hideKeepsakeSection() {
        if (keepsakeSection) {
            keepsakeSection.classList.add("hidden");
            keepsakeSection.classList.remove("is-visible");
        }
      closeKeepsakeModal();
        if (qrContainer) qrContainer.innerHTML = "";
      if (qrModalContainer) qrModalContainer.innerHTML = "";
        if (keepsakeLink) keepsakeLink.removeAttribute("href");
      if (keepsakeModalLink) keepsakeModalLink.removeAttribute("href");
      keepsakeUrl = "";
    }

    function getQrCodeStylingCtor() {
        if (typeof window === "undefined") return null;
        if (typeof window.QRCodeStyling === "function") return window.QRCodeStyling;
        if (typeof window.QRCodeStyling?.default === "function") return window.QRCodeStyling.default;
        return null;
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(src);
            img.onerror = reject;
            img.src = src;
        });
    }

      async function renderKeepsakeQr(target, size, url, logoUrl) {
        if (!target) return;

        const QRCodeStylingCtor = getQrCodeStylingCtor();
        target.innerHTML = "";

        if (!QRCodeStylingCtor) {
          target.innerHTML = `
            <p class="keepsake-fallback">
              QR loading is unavailable right now. Use the keepsake link instead.
            </p>
          `;
          return;
        }

        const baseQrOptions = {
          width: size,
          height: size,
          data: url,
          qrOptions: {
            errorCorrectionLevel: "H"
          },
          dotsOptions: {
            color: "#87CEFA",
            type: "rounded"
          },
          backgroundOptions: {
            color: "#ffffff"
          },
          cornersSquareOptions: {
            color: "#4a9bc4",
            type: "extra-rounded"
          },
          cornersDotOptions: {
            color: "#6bb3d9",
            type: "dot"
          }
        };

        try {
          let qrOptions = baseQrOptions;

          try {
            await loadImage(logoUrl);
            qrOptions = {
              ...baseQrOptions,
              image: logoUrl,
              imageOptions: {
                crossOrigin: "anonymous",
                margin: 6,
                imageSize: size >= 280 ? 0.26 : 0.32
              }
            };
          } catch (error) {
            qrOptions = baseQrOptions;
          }

          const qrCode = new QRCodeStylingCtor(qrOptions);
          qrCode.append(target);
        } catch (error) {
          target.innerHTML = `
            <p class="keepsake-fallback">
              Open the keepsake page using the button below.
            </p>
          `;
        }
      }

      function openKeepsakeModal() {
        if (!keepsakeModal || !keepsakeUrl) return;

        lastModalTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        keepsakeModal.classList.remove("hidden");
        keepsakeModal.classList.add("is-open");
        keepsakeModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
        requestAnimationFrame(() => keepsakeModalDialog?.focus());
      }

      function closeKeepsakeModal() {
        if (!keepsakeModal) return;

        keepsakeModal.classList.remove("is-open");
        keepsakeModal.classList.add("hidden");
        keepsakeModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");

        if (lastModalTrigger && document.contains(lastModalTrigger)) {
          lastModalTrigger.focus();
        }
      }

      qrTrigger?.addEventListener("click", () => {
        openKeepsakeModal();
      });

      keepsakeModal?.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.dataset.keepsakeClose === "true") {
          closeKeepsakeModal();
        }
      });

      keepsakeModalClose?.addEventListener("click", () => {
        closeKeepsakeModal();
      });

      function trapKeepsakeModalFocus(event) {
        if (event.key !== "Tab") return;
        if (!keepsakeModal?.classList.contains("is-open") || !keepsakeModalDialog) return;

        const focusable = Array.from(
          keepsakeModalDialog.querySelectorAll(modalFocusableSelector)
        ).filter((el) => el instanceof HTMLElement && el.getClientRects().length > 0);

        if (!focusable.length) {
          event.preventDefault();
          keepsakeModalDialog.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const activeElement = document.activeElement;

        if (!(activeElement instanceof HTMLElement) || !keepsakeModalDialog.contains(activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
          return;
        }

        if (activeElement === keepsakeModalDialog) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
          return;
        }

        if (event.shiftKey && activeElement === first) {
          event.preventDefault();
          last.focus();
          return;
        }

        if (!event.shiftKey && activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && keepsakeModal?.classList.contains("is-open")) {
          event.preventDefault();
          closeKeepsakeModal();
          return;
        }

        trapKeepsakeModalFocus(event);
      });

    async function showKeepsakeSection() {
        const inviteValue = inviteParam || inviteKey;
        if (!keepsakeSection || !keepsakeLink || !inviteValue) return;

        keepsakeUrl = `${KEEPSAKE_BASE_URL}?invite=${encodeURIComponent(inviteValue)}`;
        const keepsakeLogoUrl = new URL("images/keepsake-icon.png", window.location.href).href;
        keepsakeLink.href = keepsakeUrl;
        if (keepsakeModalLink) keepsakeModalLink.href = keepsakeUrl;

        await Promise.all([
          renderKeepsakeQr(qrContainer, 220, keepsakeUrl, keepsakeLogoUrl),
          renderKeepsakeQr(qrModalContainer, 320, keepsakeUrl, keepsakeLogoUrl)
        ]);

        keepsakeSection.classList.remove("hidden");
        keepsakeSection.classList.add("is-visible");
        keepsakeSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function setSealNames(text) {
        const el = document.querySelector(".seal-names");
        if (!el) return;
        el.textContent = text || "";
    }

    function setStatus(text, type = "info") {
        if (!statusEl) return;
        statusEl.textContent = text || "";
        statusEl.className = `rsvp-status rsvp-status-${type}`;
        // If empty, hide status box completely
        if (!text) statusEl.classList.add("hidden");
        else statusEl.classList.remove("hidden");
    }

    function disableForm(disabled) {
        form.querySelectorAll("input, textarea, button").forEach((el) => {
            el.disabled = !!disabled;
        });
    }

    function normalizeName(s) {
        return (s || "").trim().replace(/\s+/g, " ");
    }

    function formatDeadline(yyyyMmDd) {
        if (!yyyyMmDd) return "—";
        const [y, m, d] = yyyyMmDd.split("-").map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    }

    function showToast(message, type = "info") {
        if (typeof showNotification === "function") showNotification(message, type);
        else alert(message);
    }

    // ===== State =====
    let locked = false;
    let closed = false;
    let lastExtraSlotsRendered = -1;

    let maxGuests = 1;
    let namedGuests = [];
    let allowUnnamed = false;
    let notAllowedExtras = [];

    // ===== Rendering =====
    function renderNamedGuests() {
        namedGuestsList.innerHTML = "";

        if (!namedGuests.length) {
            namedGuestsList.innerHTML = `<p class="rsvp-hint">No named guests found for this invite.</p>`;
            return;
        }

        namedGuests.forEach((name) => {
            const id = "guest_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
            const row = document.createElement("label");
            row.className = "guest-check";
            row.innerHTML = `
        <input type="checkbox" value="${name}" id="${id}">
        <span>${name}</span>
      `;
            row.querySelector("input").addEventListener("change", updateGuestHint);
            namedGuestsList.appendChild(row);
        });
    }

    // Render ONLY the number of extra slots needed for CURRENT guestCount,
    // and ONLY if guestCount > namedGuests.length.
    function renderExtraSlotsForCurrentCount() {
        if (!allowUnnamed) {
            extraNamesGroup.classList.add("hidden");
            extraSlotsList.innerHTML = "";
            lastExtraSlotsRendered = -1;
            return;
        }

        const target = Number(guestCountInput.value || "1");
        const needExtras = Math.max(0, target - namedGuests.length);

        if (needExtras <= 0) {
            extraNamesGroup.classList.add("hidden");
            extraSlotsList.innerHTML = "";
            lastExtraSlotsRendered = 0;
            return;
        }

        // Only rebuild when slot count changes
        if (needExtras === lastExtraSlotsRendered) return;
        lastExtraSlotsRendered = needExtras;

        extraNamesGroup.classList.remove("hidden");
        extraSlotsList.innerHTML = "";

        for (let i = 1; i <= needExtras; i++) {
            const row = document.createElement("div");
            row.className = "guest-check extra-guest-row";
            row.innerHTML = `
        <label class="extra-guest-left">
          <input type="checkbox" class="extra-slot-check" data-slot="${i}">
        </label>
        <input type="text" class="extra-slot-name" placeholder="Type name" disabled />
      `;

            const cb = row.querySelector(".extra-slot-check");
            const input = row.querySelector(".extra-slot-name");

            cb.addEventListener("change", () => {
                input.disabled = !cb.checked;
                if (!cb.checked) input.value = "";
                updateGuestHint();
            });

            // Update hint while typing (nice UX)
            input.addEventListener("input", updateGuestHint);

            extraSlotsList.appendChild(row);
        }
    }

    function getSelectedExtraNames() {
        if (!allowUnnamed) return [];
        const rows = Array.from(extraSlotsList.querySelectorAll(".extra-guest-row"));
        const names = [];

        for (const row of rows) {
            const cb = row.querySelector(".extra-slot-check");
            const input = row.querySelector(".extra-slot-name");
            if (!cb.checked) continue;

            const nm = normalizeName(input.value);
            if (!nm) continue; // only counts if typed
            names.push(nm);
        }
        return names;
    }

    function updateGuestHint() {
        const target = Number(guestCountInput.value || "1");
        const checkedNamed = Array.from(
            namedGuestsList.querySelectorAll('input[type="checkbox"]:checked')
        ).length;

        const extras = getSelectedExtraNames();
        const total = checkedNamed + extras.length;

        guestPickHint.textContent =
            `Selected: ${total} / ${target} (named: ${checkedNamed}${allowUnnamed ? `, extra: ${extras.length}` : ""})`;
    }

    function clearExtrasUI() {
        extraSlotsList.innerHTML = "";
        extraNamesGroup.classList.add("hidden");
        lastExtraSlotsRendered = -1;
    }

    function setGuestCount(n) {
        const prev = Number(guestCountInput.value || "1");
        const clamped = Math.max(1, Math.min(maxGuests, n));

        guestCountInput.value = String(clamped);
        guestCountDisplay.textContent = String(clamped);

        // Rule: if count decreases, clear all selections (named + extras)
        if (clamped < prev) {
            namedGuestsList.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = false));
            clearExtrasUI();
        }

        // If set to maxGuests, auto-select all named guests (user can unselect)
        if (clamped === maxGuests) {
            namedGuestsList.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = true));
        }

        renderExtraSlotsForCurrentCount();
        updateGuestHint();

        guestMinus.disabled = clamped <= 1;
        guestPlus.disabled = clamped >= maxGuests;
    }

    function setAttendance(value) {
        attendanceBtns.forEach((b) => {
            b.classList.remove("selected");
            const icon = b.querySelector(".btn-icon");
            if (icon) icon.textContent = "○";
        });

        const btn = Array.from(attendanceBtns).find((b) => b.dataset.value === value);
        if (btn) {
            btn.classList.add("selected");
            const icon = btn.querySelector(".btn-icon");
            if (icon) icon.textContent = "●";
        }

        attendanceInput.value = value;

        if (value === "yes") {
            guestControls.classList.remove("hidden");
            setGuestCount(Number(guestCountInput.value || "1"));
        } else {
            guestControls.classList.add("hidden");
            clearExtrasUI();
        }
    }

    // ===== Wire events =====
    attendanceBtns.forEach((btn) =>
        btn.addEventListener("click", () => setAttendance(btn.dataset.value))
    );
    guestMinus.addEventListener("click", () =>
        setGuestCount(Number(guestCountInput.value || "1") - 1)
    );
    guestPlus.addEventListener("click", () =>
        setGuestCount(Number(guestCountInput.value || "1") + 1)
    );

    // ===== No invite key =====
    hideKeepsakeSection();

    if (!inviteKey) {
        setSealNames("");
        if (rsvpDisplayNameEl) rsvpDisplayNameEl.textContent = "—";
        if (displayNameEl) displayNameEl.value = "";
        if (rsvpDeadlineEl) rsvpDeadlineEl.textContent = "—";
        setStatus("Please use the RSVP link you were sent. If you need help, contact Amber or Junaid.", "error");
        hideRsvpBody();
        disableForm(true);
        return;
    }

    // ===== Load backend =====
    setStatus("Loading your invite…", "info");
    hideRsvpBody();       // hide until we know it's valid/open
    disableForm(true);

    let payload;
    try {
        const res = await fetch(`${RSVP_API_BASE}?invite=${encodeURIComponent(inviteKey)}`, { method: "GET" });
        payload = await res.json();
    } catch (err) {
        setStatus("RSVP system is temporarily unavailable. Please try again later.", "error");
        hideRsvpBody();
        disableForm(true);
        return;
    }

    const deadlineStr = payload?.deadline?.date || null;
    if (rsvpDeadlineEl) rsvpDeadlineEl.textContent = formatDeadline(deadlineStr);

    // ===== Invite not found / invalid =====
    if (!payload.ok) {
        setSealNames("");
        if (rsvpDisplayNameEl) rsvpDisplayNameEl.textContent = "—";
        if (displayNameEl) displayNameEl.value = "";
        setStatus(payload.message || "Invite not found. Please use the RSVP link you were sent.", "error");
        hideRsvpBody();
        disableForm(true);
        return;
    }

    locked = !!payload.locked;
    closed = !!payload.closed;

    // ===== Locked state =====
    if (locked) {
        const rsvp = payload.rsvp || {};
        const shownName = payload?.rsvp?.displayName || payload?.config?.displayName || inviteKey;

        setSealNames(shownName);
        if (rsvpDisplayNameEl) rsvpDisplayNameEl.textContent = shownName;
        if (displayNameEl) displayNameEl.value = shownName;

        const attending = String(rsvp.attending || "").toUpperCase() === "YES" ? "yes" : "no";

        const gc = Number(rsvp.guestCount || 0);
        const selected = (rsvp.selectedNamedGuests || []).join(", ");
        const extras = (rsvp.extraGuestNames || []).join(", ");

        const allGuests = [
            ...(rsvp.selectedNamedGuests || []),
            ...(rsvp.extraGuestNames || [])
        ];

        setStatus(
            attending === "yes"
                ? `RSVP already submitted ✅ You’re attending (${gc}). ${allGuests.length ? `Guests: ${allGuests.join(", ")}.` : ""
                }`
                : "RSVP already submitted ✅ You’re not attending.",
            "success"
        );

        hideRsvpBody();
        disableForm(true);
        await showKeepsakeSection();
        return;
    }

    // ===== Config state =====
    const config = payload.config;

    const displayName = config.displayName || urlName || inviteKey;
    setSealNames(displayName);
    if (rsvpDisplayNameEl) rsvpDisplayNameEl.textContent = displayName;
    if (displayNameEl) displayNameEl.value = displayName;

    maxGuests = Number(config.maxGuests || 1);
    namedGuests = (config.namedGuests || []).map(normalizeName);
    allowUnnamed = !!config.allowUnnamed;
    notAllowedExtras = (config.notAllowedExtras || []).map((n) => normalizeName(n).toLowerCase());

    if (guestMaxDisplay) guestMaxDisplay.textContent = String(maxGuests);

    renderNamedGuests();

    // ===== Closed =====
    if (closed) {
        setStatus(`RSVPs are now closed (deadline was ${formatDeadline(deadlineStr)}). Please contact us.`, "error");
        hideRsvpBody();
        disableForm(true);
        return;
    }

    // ===== Ready (valid + open) =====
    setStatus("", "info");
    showRsvpBody();
    disableForm(false);

    // Default: guest UI hidden until "Yes"
    guestControls.classList.add("hidden");
    clearExtrasUI();

    // ===== Submit =====
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const attendance = attendanceInput.value;
        if (!attendance) {
            showToast("Please select whether you will attend.", "error");
            return;
        }

        const attending = attendance === "yes" ? "YES" : "NO";

        let guestCount = 0;
        let selectedNamedGuests = [];
        let extraGuestNames = [];

        if (attending === "YES") {
            guestCount = Number(guestCountInput.value || "1");

            selectedNamedGuests = Array.from(namedGuestsList.querySelectorAll('input[type="checkbox"]:checked'))
                .map((cb) => normalizeName(cb.value));

            extraGuestNames = getSelectedExtraNames();

            for (const nm of extraGuestNames) {
                if (notAllowedExtras.includes(nm.toLowerCase())) {
                    showToast(`${nm} is not allowed on this invitation.`, "error");
                    return;
                }
            }

            const total = selectedNamedGuests.length + extraGuestNames.length;
            if (total !== guestCount) {
                showToast(`Please make the names match your guest count (${guestCount}).`, "error");
                return;
            }
        }

        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Sending…";
        submitBtn.disabled = true;

        try {
            const params = new URLSearchParams();
            params.set("inviteKey", inviteKey);
            params.set("attending", attending);
            params.set("guestCount", String(guestCount));
            params.set("selectedNamedGuests", JSON.stringify(selectedNamedGuests));
            params.set("extraGuestNames", JSON.stringify(extraGuestNames));
            params.set("message", (messageEl?.value || "").trim());

            const res = await fetch(RSVP_API_BASE, {
                method: "POST",
                body: params, // no JSON headers = no preflight
            });

            const out = await res.json();

            if (!out.ok) {
                showToast(out.message || "Something went wrong. Please try again.", "error");
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                return;
            }

            showToast("Thank you! Your RSVP has been confirmed.", "success");
            setStatus("RSVP submitted ✅ Thank you!", "success");
            hideRsvpBody();     // ✅ hide everything except the status message
            disableForm(true);
            await showKeepsakeSection();
        } catch (err) {
            showToast("Failed to submit. Please try again.", "error");
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
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
