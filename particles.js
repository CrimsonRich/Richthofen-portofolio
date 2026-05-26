/* ============================================
   PARTICLES.JS — Floating Dust Particles on Canvas
   ============================================ */

(function () {
    'use strict';

    const PARTICLE_COUNT = 70;
    const PARTICLE_COLOR = '28, 71, 198'; // #1c47c6 in RGB
    const MIN_SIZE = 1;
    const MAX_SIZE = 2.5;
    const MIN_OPACITY = 0.05;
    const MAX_OPACITY = 0.12;
    const MAX_SPEED = 0.3;
    const MOUSE_RADIUS = 120;
    const MOUSE_FORCE = 0.02;

    let canvas, ctx;
    let particles = [];
    let mouseX = -1000, mouseY = -1000;
    let width, height;

    function init() {
        canvas = document.createElement('canvas');
        canvas.id = 'particle-canvas';
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
        document.body.prepend(canvas);

        ctx = canvas.getContext('2d');
        resize();

        // Create particles
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(createParticle());
        }

        // Events
        window.addEventListener('resize', resize);
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        // Start loop
        animate();
    }

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function createParticle() {
        return {
            x: Math.random() * (width || window.innerWidth),
            y: Math.random() * (height || window.innerHeight),
            size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE),
            opacity: MIN_OPACITY + Math.random() * (MAX_OPACITY - MIN_OPACITY),
            vx: (Math.random() - 0.5) * MAX_SPEED * 2,
            vy: (Math.random() - 0.5) * MAX_SPEED * 2
        };
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        particles.forEach(p => {
            // Mouse attraction
            const dx = mouseX - p.x;
            const dy = mouseY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < MOUSE_RADIUS && dist > 0) {
                const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * MOUSE_FORCE;
                p.vx += dx / dist * force;
                p.vy += dy / dist * force;
            }

            // Clamp velocity
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > MAX_SPEED) {
                p.vx = (p.vx / speed) * MAX_SPEED;
                p.vy = (p.vy / speed) * MAX_SPEED;
            }

            // Move
            p.x += p.vx;
            p.y += p.vy;

            // Bounce off edges
            if (p.x < 0 || p.x > width) { p.vx *= -1; p.x = Math.max(0, Math.min(width, p.x)); }
            if (p.y < 0 || p.y > height) { p.vy *= -1; p.y = Math.max(0, Math.min(height, p.y)); }

            // Draw
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${PARTICLE_COLOR}, ${p.opacity})`;
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }

    // Init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
