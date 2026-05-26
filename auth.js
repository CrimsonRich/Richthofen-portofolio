/* ============================================
   AUTH.JS — Admin Authentication System
   Hidden EDIT button + Password Modal + Session
   ============================================ */

(function () {
    'use strict';

    const STORAGE_KEY = 'portfolio_admin_session';

    // ── State ──
    let isAdmin = false;

    // ── Check existing session ──
    function checkSession() {
        const session = localStorage.getItem(STORAGE_KEY);
        if (session === 'true') {
            activateAdmin(false);
        }
    }

    // ── Create the EDIT button (bottom-right corner) ──
    function createEditButton() {
        const btn = document.createElement('button');
        btn.id = 'admin-edit-btn';
        btn.innerHTML = '<i class="fas fa-pen"></i> EDIT';
        btn.title = 'Admin Mode';
        document.body.appendChild(btn);

        btn.addEventListener('click', () => {
            if (isAdmin) {
                showAdminMenu();
            } else {
                showPasswordModal();
            }
        });

        return btn;
    }

    // ── Password Modal ──
    function showPasswordModal() {
        // Prevent duplicate
        if (document.getElementById('admin-pw-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'admin-pw-overlay';
        overlay.className = 'admin-overlay';

        overlay.innerHTML = `
            <div class="admin-modal">
                <div class="admin-modal-header">
                    <i class="fas fa-lock"></i>
                    <h3>Admin Access</h3>
                </div>
                <p class="admin-modal-desc">Enter your password to enable edit mode.</p>
                <div class="admin-input-group">
                    <input type="password" id="admin-pw-input" placeholder="Password" autocomplete="off" />
                    <button id="admin-pw-submit"><i class="fas fa-arrow-right"></i></button>
                </div>
                <div id="admin-pw-error" class="admin-error"></div>
                <button class="admin-modal-close" id="admin-pw-close">&times;</button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Focus input
        setTimeout(() => document.getElementById('admin-pw-input').focus(), 100);

        // Close
        document.getElementById('admin-pw-close').addEventListener('click', closePasswordModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closePasswordModal();
        });

        // Submit
        document.getElementById('admin-pw-submit').addEventListener('click', handleLogin);
        document.getElementById('admin-pw-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }

    function closePasswordModal() {
        const overlay = document.getElementById('admin-pw-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    function handleLogin() {
        const input = document.getElementById('admin-pw-input');
        const error = document.getElementById('admin-pw-error');
        const password = input.value.trim();

        if (!password) {
            showError(error, 'Please enter a password.');
            shakeInput(input);
            return;
        }

        if (password === ADMIN_PASSWORD) {
            localStorage.setItem(STORAGE_KEY, 'true');
            closePasswordModal();
            activateAdmin(true);
        } else {
            showError(error, 'Wrong password. Try again.');
            shakeInput(input);
            input.value = '';
            input.focus();
        }
    }

    function showError(el, msg) {
        el.textContent = msg;
        el.classList.add('visible');
        setTimeout(() => el.classList.remove('visible'), 3000);
    }

    function shakeInput(el) {
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 500);
    }

    // ── Activate Admin Mode ──
    function activateAdmin(showToast) {
        isAdmin = true;
        document.body.classList.add('admin-active');

        const btn = document.getElementById('admin-edit-btn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check-circle"></i> ADMIN';
            btn.classList.add('active');
        }

        // Dispatch event for other modules
        window.dispatchEvent(new CustomEvent('adminModeChanged', { detail: { isAdmin: true } }));

        if (showToast) {
            showToastNotification('Admin mode activated!', 'success');
        }
    }

    // ── Admin Menu (shown when clicking active EDIT button) ──
    function showAdminMenu() {
        if (document.getElementById('admin-menu-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'admin-menu-overlay';
        overlay.className = 'admin-overlay';

        overlay.innerHTML = `
            <div class="admin-modal admin-menu">
                <div class="admin-modal-header">
                    <i class="fas fa-user-shield" style="color: #2ecc71;"></i>
                    <h3>Admin Mode Active</h3>
                </div>
                <p class="admin-modal-desc">You can now edit any text by clicking on it. Changes save to Supabase.</p>
                <div class="admin-menu-actions">
                    <button id="admin-logout-btn" class="admin-action-btn logout">
                        <i class="fas fa-sign-out-alt"></i> Logout Admin
                    </button>
                </div>
                <button class="admin-modal-close" id="admin-menu-close">&times;</button>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('admin-menu-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        document.getElementById('admin-logout-btn').addEventListener('click', () => {
            overlay.remove();
            deactivateAdmin();
        });
    }

    // ── Deactivate Admin Mode ──
    function deactivateAdmin() {
        isAdmin = false;
        localStorage.removeItem(STORAGE_KEY);
        document.body.classList.remove('admin-active');

        const btn = document.getElementById('admin-edit-btn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-pen"></i> EDIT';
            btn.classList.remove('active');
        }

        window.dispatchEvent(new CustomEvent('adminModeChanged', { detail: { isAdmin: false } }));
        showToastNotification('Logged out of admin mode.', 'info');

        // Reload to clean up editable states
        setTimeout(() => location.reload(), 800);
    }

    // ── Toast Notification ──
    function showToastNotification(message, type) {
        const existing = document.getElementById('admin-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'admin-toast';
        toast.className = `admin-toast ${type}`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('visible'), 50);
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // Expose toast globally for other modules
    window.showToastNotification = showToastNotification;

    // Expose isAdmin check globally
    window.isAdminMode = () => isAdmin;

    // ── Init ──
    document.addEventListener('DOMContentLoaded', () => {
        createEditButton();
        checkSession();
    });

})();
