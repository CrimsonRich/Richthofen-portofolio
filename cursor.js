/* ============================================
   CURSOR.JS — Custom Cursor (Dot + Ring)
   ============================================ */

(function () {
    'use strict';

    // Skip on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    // ── Create cursor elements ──
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    document.body.appendChild(dot);

    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.appendChild(ring);

    // ── State ──
    let mouseX = -100, mouseY = -100;
    let ringX = -100, ringY = -100;
    let isHovering = false;
    let isClicking = false;

    // ── Mouse move ──
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Dot follows instantly
        dot.style.left = mouseX + 'px';
        dot.style.top = mouseY + 'px';
    });

    // ── Ring follows with lag (requestAnimationFrame) ──
    function animateRing() {
        const speed = 0.15;
        ringX += (mouseX - ringX) * speed;
        ringY += (mouseY - ringY) * speed;

        ring.style.left = ringX + 'px';
        ring.style.top = ringY + 'px';

        requestAnimationFrame(animateRing);
    }
    animateRing();

    // ── Hover detection ──
    const interactiveSelectors = 'a, button, input, textarea, select, [role="button"], .btn, .tag, .game-card, .skill-card, .contact-item, .social-item, .album-photo-card, .picker-item, .polaroid, .album-upload-btn, #admin-edit-btn, .nav-links a';

    document.addEventListener('mouseover', (e) => {
        if (e.target.closest(interactiveSelectors)) {
            isHovering = true;
            dot.classList.add('hover');
            ring.classList.add('hover');
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.closest(interactiveSelectors)) {
            isHovering = false;
            dot.classList.remove('hover');
            ring.classList.remove('hover');
        }
    });

    // ── Click ripple ──
    document.addEventListener('mousedown', () => {
        dot.classList.add('click');
        ring.classList.add('click');

        // Create ripple
        const ripple = document.createElement('div');
        ripple.className = 'cursor-ripple';
        ripple.style.left = mouseX + 'px';
        ripple.style.top = mouseY + 'px';
        document.body.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    });

    document.addEventListener('mouseup', () => {
        dot.classList.remove('click');
        ring.classList.remove('click');
    });

    // ── Hide when leaving window ──
    document.addEventListener('mouseleave', () => {
        dot.style.opacity = '0';
        ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
        dot.style.opacity = '1';
        ring.style.opacity = '1';
    });

})();
