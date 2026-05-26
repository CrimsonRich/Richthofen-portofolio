/* ============================================
   ADMIN.JS — Inline Editing + Profile Picture
   ============================================ */

(function () {
    'use strict';

    // ── Listen for admin mode changes ──
    window.addEventListener('adminModeChanged', (e) => {
        if (e.detail.isAdmin) {
            enableInlineEditing();
            enableProfilePicEdit();
            enableGalleryAdmin();
        }
    });

    // ── Also check on load (if session was persisted) ──
    document.addEventListener('DOMContentLoaded', () => {
        // Load saved content from Supabase
        loadSavedContent();
    });

    // ══════════════════════════════════════════
    //  INLINE TEXT EDITING
    // ══════════════════════════════════════════

    function enableInlineEditing() {
        const editables = document.querySelectorAll('[data-field-key]');
        editables.forEach(el => {
            // Skip gallery captions (handled by gallery.js)
            if (el.closest('.album-photo-card')) return;

            el.classList.add('editable-field');
            el.setAttribute('contenteditable', 'true');
            el.setAttribute('spellcheck', 'false');

            // Create save button
            const saveBtn = document.createElement('button');
            saveBtn.className = 'inline-save-btn';
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            saveBtn.style.display = 'none';

            // Position relative to parent
            el.style.position = 'relative';
            el.appendChild(saveBtn);

            // Show save on input
            el.addEventListener('input', () => {
                saveBtn.style.display = 'inline-flex';
            });

            // Save handler
            saveBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();

                const fieldKey = el.getAttribute('data-field-key');
                // Get text content without the save button text
                const clone = el.cloneNode(true);
                const btnInClone = clone.querySelector('.inline-save-btn');
                if (btnInClone) btnInClone.remove();
                const value = clone.innerHTML.trim();

                const success = await saveFieldToSupabase(fieldKey, value);
                if (success) {
                    saveBtn.style.display = 'none';
                    window.showToastNotification('Saved!', 'success');
                } else {
                    window.showToastNotification('Save failed — check Supabase config.', 'error');
                }
            });
        });
    }

    // ── Save field to Supabase ──
    async function saveFieldToSupabase(fieldKey, value) {
        if (!supabaseClient) {
            console.warn('Supabase not configured — saving to localStorage fallback.');
            localStorage.setItem('field_' + fieldKey, value);
            return true;
        }

        try {
            const { error } = await supabaseClient
                .from('profile_content')
                .upsert({
                    field_key: fieldKey,
                    field_value: value,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'field_key' });

            if (error) throw error;
            return true;
        } catch (e) {
            console.error('Supabase save error:', e);
            // Fallback to localStorage
            localStorage.setItem('field_' + fieldKey, value);
            return true;
        }
    }

    // ── Load saved content from Supabase (or localStorage fallback) ──
    async function loadSavedContent() {
        let data = null;

        if (supabaseClient) {
            try {
                const response = await supabaseClient
                    .from('profile_content')
                    .select('field_key, field_value');

                if (!response.error && response.data) {
                    data = {};
                    response.data.forEach(row => {
                        data[row.field_key] = row.field_value;
                    });
                }
            } catch (e) {
                console.warn('Could not load from Supabase:', e);
            }
        }

        // Apply saved values to DOM
        const editables = document.querySelectorAll('[data-field-key]');
        editables.forEach(el => {
            const key = el.getAttribute('data-field-key');
            let savedValue = null;

            if (data && data[key]) {
                savedValue = data[key];
            } else {
                // Fallback to localStorage
                savedValue = localStorage.getItem('field_' + key);
            }

            if (savedValue) {
                el.innerHTML = savedValue;
            }
        });

        // Also load profile picture
        loadProfilePicture(data);
    }

    // ══════════════════════════════════════════
    //  PROFILE PICTURE
    // ══════════════════════════════════════════

    function loadProfilePicture(data) {
        const profileImg = document.getElementById('hero-profile-pic');
        if (!profileImg) return;

        let savedUrl = null;
        if (data && data['profile_picture_url']) {
            savedUrl = data['profile_picture_url'];
        } else {
            savedUrl = localStorage.getItem('field_profile_picture_url');
        }

        if (savedUrl) {
            profileImg.src = savedUrl;
        }
    }

    function enableProfilePicEdit() {
        const container = document.getElementById('profile-pic-container');
        if (!container) return;

        container.classList.add('editable-pic');

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'profile-pic-overlay';
        overlay.innerHTML = '<i class="fas fa-camera"></i><span>Change Photo</span>';
        container.appendChild(overlay);

        // File input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        container.appendChild(fileInput);

        overlay.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            overlay.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Uploading...</span>';

            const url = await uploadProfilePicture(file);
            if (url) {
                const img = document.getElementById('hero-profile-pic');
                img.src = url;
                await saveFieldToSupabase('profile_picture_url', url);
                window.showToastNotification('Profile picture updated!', 'success');
            } else {
                window.showToastNotification('Upload failed.', 'error');
            }

            overlay.innerHTML = '<i class="fas fa-camera"></i><span>Change Photo</span>';
        });
    }

    async function uploadProfilePicture(file) {
        if (!supabaseClient) {
            // Fallback: use local data URL
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }

        try {
            const fileName = `profile_${Date.now()}_${file.name}`;
            const { data, error } = await supabaseClient.storage
                .from(STORAGE_BUCKET)
                .upload(fileName, file, { upsert: true });

            if (error) throw error;

            const { data: urlData } = supabaseClient.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(fileName);

            return urlData.publicUrl;
        } catch (e) {
            console.error('Upload error:', e);
            // Fallback to data URL
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (ev) => resolve(ev.target.result);
                reader.readAsDataURL(file);
            });
        }
    }

    // ══════════════════════════════════════════
    //  GALLERY ADMIN CONTROLS
    // ══════════════════════════════════════════

    function enableGalleryAdmin() {
        const albumSections = document.querySelectorAll('.album-section');

        albumSections.forEach(section => {
            const albumType = section.getAttribute('data-album-type');
            const grid = section.querySelector('.album-grid');
            if (!grid) return;

            // Show upload button
            const uploadBtn = section.querySelector('.album-upload-btn');
            if (uploadBtn) uploadBtn.style.display = 'flex';

            // Show delete buttons on existing photos
            grid.querySelectorAll('.album-delete-btn').forEach(btn => {
                btn.style.display = 'flex';
            });

            // Make captions editable
            grid.querySelectorAll('.album-caption').forEach(cap => {
                cap.setAttribute('contenteditable', 'true');
                cap.classList.add('editable-field');
            });
        });
    }

    // Expose for gallery.js
    window.saveFieldToSupabase = saveFieldToSupabase;

})();
