// Wedding Invitation Website - Interactive Features
document.addEventListener('DOMContentLoaded', () => {
    const envelopeOverlay = document.getElementById('envelope-overlay');
    const waxSeal = document.getElementById('wax-seal');
    const mainContent = document.getElementById('main-content'); // optional

    if (!envelopeOverlay || !waxSeal) return;

    waxSeal.addEventListener('click', () => {
        envelopeOverlay.classList.add('opened'); // starts flap animation

        const topFlap = document.querySelector('.envelope-flap-top');

        const onDone = (e) => {
            if (e.propertyName !== 'transform') return;

            envelopeOverlay.classList.add('faded'); // fade right when done

            // Recalc hero heights now that content is visible & address bar may have shifted
            requestAnimationFrame(() => { if (window._heroScrubResize) window._heroScrubResize(); });

            if (mainContent) {
                mainContent.classList.remove('hidden');
                requestAnimationFrame(() => mainContent.classList.add('visible'));
            }

            topFlap.removeEventListener('transitionend', onDone);
        };

        // If for some reason it can't find the flap, fallback timing
        if (topFlap) topFlap.addEventListener('transitionend', onDone);
        else {
            setTimeout(() => {
                envelopeOverlay.classList.add('faded');
                if (mainContent) {
                    mainContent.classList.remove('hidden');
                    requestAnimationFrame(() => mainContent.classList.add('visible'));
                }
            }, 1600);
        }
    });


});

document.addEventListener('DOMContentLoaded', function () {
    // Initialize all features
    initHeroScrub();
    initScratchCards();
    initCountdown();
    initRSVPForm();
    initScrollAnimations();
    initAddToCalendar();
});

// Scratch Cards Feature
function initScratchCards() {
    const cards = document.querySelectorAll('.scratch-card');
    let revealedCount = 0;

    cards.forEach((card, index) => {
        const canvas = card.querySelector('.scratch-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let scratchedPixels = 0;
        const totalPixels = canvas.width * canvas.height;
        const revealThreshold = 0.4; // 40% scratched to reveal

        // Set canvas size
        const size = 120;
        canvas.width = size * 2; // High DPI
        canvas.height = size * 2;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';

        // Fill with gradient scratch layer
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#a8d4f0');
        gradient.addColorStop(0.5, '#6bb3d9');
        gradient.addColorStop(1, '#4a9bc4');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add pattern overlay
        ctx.globalCompositeOperation = 'source-atop';
        for (let i = 0; i < 50; i++) {
            ctx.beginPath();
            ctx.arc(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                Math.random() * 20 + 10,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
            ctx.fill();
        }

        // Add text
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = 'bold 24px Montserrat, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✦', canvas.width / 2, canvas.height / 2);

        // Set up scratching
        ctx.globalCompositeOperation = 'destination-out';

        function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        }

        function scratch(e) {
            if (!isDrawing) return;
            e.preventDefault();

            const pos = getPos(e);
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
            ctx.fill();

            checkScratched();
        }

        function checkScratched() {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            let transparentPixels = 0;

            for (let i = 3; i < pixels.length; i += 4) {
                if (pixels[i] === 0) {
                    transparentPixels++;
                }
            }

            const scratchedPercent = transparentPixels / totalPixels;

            if (scratchedPercent > revealThreshold && !card.classList.contains('revealed')) {
                card.classList.add('revealed');
                revealedCount++;

                // Clear the canvas completely
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Check if all cards are revealed
                if (revealedCount === cards.length) {
                    setTimeout(() => {
                        showCountdownSection();
                    }, 500);
                }
            }
        }

        // Mouse events
        canvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            scratch(e);
        });
        canvas.addEventListener('mousemove', scratch);
        canvas.addEventListener('mouseup', () => isDrawing = false);
        canvas.addEventListener('mouseleave', () => isDrawing = false);

        // Touch events
        canvas.addEventListener('touchstart', (e) => {
            isDrawing = true;
            scratch(e);
        }, { passive: false });
        canvas.addEventListener('touchmove', scratch, { passive: false });
        canvas.addEventListener('touchend', () => isDrawing = false);
    });
}

function showCountdownSection() {
    const countdownSection = document.querySelector('.countdown-section');
    if (countdownSection) {
        countdownSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Countdown Timer
function initCountdown() {
    // Wedding date: July 25, 2026
    const weddingDate = new Date('2026-07-25T15:00:00').getTime();

    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = weddingDate - now;

        if (distance < 0) {
            daysEl.textContent = '0';
            hoursEl.textContent = '0';
            minutesEl.textContent = '0';
            secondsEl.textContent = '0';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        daysEl.textContent = days;
        hoursEl.textContent = hours.toString().padStart(2, '0');
        minutesEl.textContent = minutes.toString().padStart(2, '0');
        secondsEl.textContent = seconds.toString().padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// RSVP Form
function initRSVPForm() {
    const form = document.getElementById('rsvpForm');
    if (!form) return;

    const attendanceBtns = form.querySelectorAll('.attendance-btn');
    const attendanceInput = document.getElementById('attendance');

    // Handle attendance button selection
    attendanceBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            attendanceBtns.forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            attendanceInput.value = this.dataset.value;

            // Update icon
            attendanceBtns.forEach(b => {
                b.querySelector('.btn-icon').textContent = '○';
            });
            this.querySelector('.btn-icon').textContent = '●';
        });
    });

    // Form submission
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Validate
        if (!data.fullname || !data.attendance) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Simulate form submission
        const submitBtn = form.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        setTimeout(() => {
            showNotification('Thank you! Your RSVP has been confirmed.', 'success');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            form.reset();
            attendanceBtns.forEach(b => {
                b.classList.remove('selected');
                b.querySelector('.btn-icon').textContent = '○';
            });
        }, 1500);
    });
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="notification-close">×</button>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4a9bc4' : type === 'error' ? '#e74c3c' : '#6bb3d9'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        gap: 15px;
        z-index: 10000;
        animation: slideDown 0.3s ease;
    `;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .notification-close {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });

    // Auto remove
    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Scroll Animations
function initScrollAnimations() {
    const sections = document.querySelectorAll('section:not(#hero)');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        section.classList.add('section-animate');
        observer.observe(section);
    });
}

function initAddToCalendar() {
    const btn = document.getElementById('addToCalendar');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
        e.preventDefault();

        // Update these to YOUR wedding:
        const eventTitle = 'Amber & Junaid Wedding';
        const eventLocation = 'Villa Medicea di Artimino, Via di Papa Leone X, 28, Artimino, Florence';

        // Google Calendar format: YYYYMMDDTHHMMSS (local time works fine for most cases)
        const startDate = '20260725T150000';
        const endDate = '20260725T230000';

        const url =
            `https://calendar.google.com/calendar/render?action=TEMPLATE` +
            `&text=${encodeURIComponent(eventTitle)}` +
            `&dates=${startDate}/${endDate}` +
            `&location=${encodeURIComponent(eventLocation)}`;

        window.open(url, '_blank');
    });
}

function initHeroScrub() {
    const FRAMES_DIR = './frames/';
    const FRAME_PREFIX = 'frame';
    const FRAME_DIGITS = 4;
    const FRAME_EXT = '.jpg';
    const TOTAL_FRAMES = 121;

    const driver = document.getElementById('scroll-driver');
    const hero = document.getElementById('hero');
    const canvas = document.getElementById('frame-canvas');
    const loaderEl = document.getElementById('loader');
    const loaderBar = document.getElementById('loader-bar');

    if (!driver || !hero || !canvas) return;

    const ctx = canvas.getContext('2d');
    let bitmaps = [];
    let frameCount = 0;
    let currentFrame = -1;

    // ── Set pixel heights from REAL innerHeight ────────────────────────────
    // dvh/vh are unreliable on mobile — they get computed while main-content
    // is display:none or while the address bar is still visible (634px).
    // We override with explicit px values using the live innerHeight instead.
    function setHeights() {
        const h = window.innerHeight;
        driver.style.height = (h * 5) + 'px'; // 4x scrub range + 1x for clean exit
        hero.style.height = h + 'px';
    }

    // ── Frame path ─────────────────────────────────────────────────────────
    function framePath(i) {
        return `${FRAMES_DIR}${FRAME_PREFIX}${String(i).padStart(FRAME_DIGITS, '0')}${FRAME_EXT}`;
    }

    // ── Draw a frame (cover-fit) ───────────────────────────────────────────
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

    // ── Scroll handler ─────────────────────────────────────────────────────
    function onScroll() {
        if (!frameCount) return;
        const scrolled = window.scrollY - driver.offsetTop;
        const range = driver.offsetHeight - window.innerHeight;
        const progress = Math.min(Math.max(scrolled / range, 0), 1);
        const frame = Math.min(Math.round(progress * (frameCount - 1)), frameCount - 1);
        if (frame !== currentFrame) {
            currentFrame = frame;
            drawFrame(frame);
            const bar = document.getElementById('progress-bar');
            if (bar) bar.style.width = (progress * 100) + '%';
        }
        const hint = document.getElementById('scroll-hint');
        if (hint) hint.style.opacity = window.scrollY > 40 ? '0' : '1';
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
        setHeights();
        canvas.width = 0;
        if (currentFrame >= 0) drawFrame(currentFrame);
        onScroll();
    }, { passive: true });

    // ── Load frames ────────────────────────────────────────────────────────
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
                        .then(r => r.blob())
                        .then(blob => createImageBitmap(blob))
                        .then(bmp => {
                            bitmaps[idx] = bmp;
                            loaded++;
                            if (loaderBar) loaderBar.style.width = ((loaded / total) * 100) + '%';
                        })
                );
            }
            await Promise.all(batch);
        }
    }

    // ── Boot ───────────────────────────────────────────────────────────────
    (async () => {
        try {
            // Set heights immediately using current innerHeight
            setHeights();
            await loadFrames(TOTAL_FRAMES);
            drawFrame(0);
            onScroll();
            if (loaderEl) {
                loaderEl.classList.add('hidden');
                setTimeout(() => loaderEl.remove(), 600);
            }
        } catch (e) {
            console.error('Hero scrub failed:', e);
        }
    })();

    // Expose so the envelope opener can trigger a height recalc
    window._heroScrubResize = () => { setHeights(); onScroll(); };
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});