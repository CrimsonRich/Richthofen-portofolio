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

        // Also load saved polaroid photos
        loadPolaroidPhotos(data);
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

        // Also enable polaroid editing
        enablePolaroidEdit();
    }

    // ══════════════════════════════════════════
    //  POLAROID PHOTO EDITING (Hero Section)
    // ══════════════════════════════════════════

    function enablePolaroidEdit() {
        const polaroids = document.querySelectorAll('.polaroid');

        polaroids.forEach(polaroid => {
            const img = polaroid.querySelector('.photo-area img');
            if (!img) return;

            // Skip if already set up
            if (polaroid.querySelector('.polaroid-edit-overlay')) return;

            // Create edit overlay
            const overlay = document.createElement('div');
            overlay.className = 'polaroid-edit-overlay';
            overlay.innerHTML = '<i class="fas fa-images"></i><span>Change</span>';

            const photoArea = polaroid.querySelector('.photo-area');
            photoArea.style.position = 'relative';
            photoArea.appendChild(overlay);

            // On click, open photo picker
            overlay.addEventListener('click', (e) => {
                e.stopPropagation();
                openPhotoPicker(img, polaroid);
            });
        });
    }

    // ── Photo Picker Modal ──
    async function openPhotoPicker(targetImg, polaroid) {
        // Remove existing picker
        const existing = document.getElementById('photo-picker-overlay');
        if (existing) existing.remove();

        // Gather all uploaded photos from all album grids
        let allPhotos = [];

        // From Supabase
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('photos')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    allPhotos = data;
                }
            } catch (e) {
                console.warn('Could not load photos for picker:', e);
            }
        }

        // Fallback: from localStorage
        if (allPhotos.length === 0) {
            ['trip', 'photo', 'gaming'].forEach(type => {
                const saved = localStorage.getItem(`album_${type}`);
                if (saved) {
                    try {
                        const photos = JSON.parse(saved);
                        allPhotos = allPhotos.concat(photos);
                    } catch (e) { /* skip */ }
                }
            });
        }

        // Also include the existing polaroid images as options
        const existingPolaroidImgs = document.querySelectorAll('.polaroid .photo-area img');
        existingPolaroidImgs.forEach(pImg => {
            const src = pImg.getAttribute('src');
            if (src && !src.startsWith('data:')) {
                // Only add non-data-url images (external URLs)
                const exists = allPhotos.find(p => p.image_url === src);
                if (!exists) {
                    allPhotos.push({ image_url: src, caption: pImg.alt || 'Existing photo', _isLocal: true });
                }
            }
        });

        // Build modal
        const overlay = document.createElement('div');
        overlay.id = 'photo-picker-overlay';
        overlay.className = 'admin-overlay';

        let photosHtml = '';
        if (allPhotos.length === 0) {
            photosHtml = '<div class="picker-empty"><i class="fas fa-image"></i><p>No photos uploaded yet. Upload photos in the gallery sections first!</p></div>';
        } else {
            photosHtml = '<div class="picker-grid">';
            allPhotos.forEach((photo, idx) => {
                const typeLabel = photo.album_type ? photo.album_type.charAt(0).toUpperCase() + photo.album_type.slice(1) : '';
                photosHtml += `
                    <div class="picker-item" data-idx="${idx}">
                        <img src="${photo.image_url}" alt="${photo.caption || ''}" loading="lazy" />
                        <div class="picker-item-info">
                            <span class="picker-caption">${photo.caption || 'No caption'}</span>
                            ${typeLabel ? `<span class="picker-type">${typeLabel}</span>` : ''}
                        </div>
                    </div>
                `;
            });
            photosHtml += '</div>';
        }

        overlay.innerHTML = `
            <div class="admin-modal picker-modal">
                <div class="admin-modal-header">
                    <i class="fas fa-images" style="color: var(--accent-gold);"></i>
                    <h3>Choose a Photo</h3>
                </div>
                <p class="admin-modal-desc">Select a photo from your gallery to use for this polaroid, or upload a new one.</p>
                <div class="picker-upload-row">
                    <button class="picker-upload-btn" id="picker-upload-new">
                        <i class="fas fa-cloud-upload-alt"></i> Upload New Photo
                    </button>
                    <input type="file" id="picker-file-input" accept="image/*" style="display:none;" />
                </div>
                <div class="picker-content">
                    ${photosHtml}
                </div>
                <button class="admin-modal-close" id="picker-close">&times;</button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Close handler
        document.getElementById('picker-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        // Upload new photo handler
        const fileInput = document.getElementById('picker-file-input');
        document.getElementById('picker-upload-new').addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const url = await uploadProfilePicture(file);
            if (url) {
                targetImg.src = url;
                const fieldKey = getPolaroidFieldKey(polaroid);
                await saveFieldToSupabase(fieldKey, url);
                window.showToastNotification('Polaroid photo updated!', 'success');
                overlay.remove();
            }
        });

        // Click to select existing photo
        overlay.querySelectorAll('.picker-item').forEach((item) => {
            item.addEventListener('click', async () => {
                const idx = parseInt(item.getAttribute('data-idx'));
                const photo = allPhotos[idx];
                if (!photo) return;

                targetImg.src = photo.image_url;
                const fieldKey = getPolaroidFieldKey(polaroid);
                await saveFieldToSupabase(fieldKey, photo.image_url);
                window.showToastNotification('Polaroid photo updated!', 'success');
                overlay.remove();
            });
        });
    }

    function getPolaroidFieldKey(polaroid) {
        if (polaroid.classList.contains('pol-1')) return 'polaroid_1_url';
        if (polaroid.classList.contains('pol-2')) return 'polaroid_2_url';
        if (polaroid.classList.contains('pol-3')) return 'polaroid_3_url';
        return 'polaroid_unknown_url';
    }

    // ── Load saved polaroid photos on page load ──
    function loadPolaroidPhotos(data) {
        const mappings = {
            'polaroid_1_url': '.pol-1 .photo-area img',
            'polaroid_2_url': '.pol-2 .photo-area img',
            'polaroid_3_url': '.pol-3 .photo-area img'
        };

        Object.entries(mappings).forEach(([key, selector]) => {
            let savedUrl = null;
            if (data && data[key]) {
                savedUrl = data[key];
            } else {
                savedUrl = localStorage.getItem('field_' + key);
            }

            if (savedUrl) {
                const img = document.querySelector(selector);
                if (img) img.src = savedUrl;
            }
        });
    }

    // Expose for gallery.js
    window.saveFieldToSupabase = saveFieldToSupabase;

})();
