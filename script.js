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
    initScratchCards();
    initCountdown();
    initRSVPForm();
    initScrollAnimations();
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
    const sections = document.querySelectorAll('section:not(.hero)');

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
