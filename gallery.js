/* ============================================
   GALLERY.JS — Photo Albums + Lightbox
   Load, display, upload, delete photos
   ============================================ */

(function () {
    'use strict';

    const ALBUM_TYPES = ['trip', 'photo', 'gaming'];

    // ── Load photos on page ready ──
    document.addEventListener('DOMContentLoaded', () => {
        ALBUM_TYPES.forEach(type => loadPhotos(type));
        setupUploadButtons();
        setupLightbox();
    });

    // ══════════════════════════════════════════
    //  LOAD PHOTOS FROM SUPABASE
    // ══════════════════════════════════════════

    async function loadPhotos(albumType) {
        const grid = document.getElementById(`${albumType}-grid`);
        if (!grid) return;

        let photos = [];

        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('photos')
                    .select('*')
                    .eq('album_type', albumType)
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    photos = data;
                }
            } catch (e) {
                console.warn(`Could not load ${albumType} photos:`, e);
            }
        }

        // Fallback: load from localStorage
        if (photos.length === 0) {
            const saved = localStorage.getItem(`album_${albumType}`);
            if (saved) {
                try { photos = JSON.parse(saved); } catch (e) { /* skip */ }
            }
        }

        renderPhotos(grid, photos, albumType);
    }

    // ══════════════════════════════════════════
    //  RENDER PHOTO GRID
    // ══════════════════════════════════════════

    function renderPhotos(grid, photos, albumType) {
        // Clear existing photos (but keep upload card)
        grid.querySelectorAll('.album-photo-card').forEach(c => c.remove());

        if (photos.length === 0) {
            // Show empty state only if no admin
            let emptyEl = grid.querySelector('.album-empty');
            if (!emptyEl) {
                emptyEl = document.createElement('div');
                emptyEl.className = 'album-empty';
                emptyEl.innerHTML = '<i class="fas fa-image"></i><p>No photos yet</p>';
                grid.appendChild(emptyEl);
            }
            return;
        }

        // Remove empty state if exists
        const emptyEl = grid.querySelector('.album-empty');
        if (emptyEl) emptyEl.remove();

        photos.forEach((photo, index) => {
            const card = createPhotoCard(photo, albumType, index);
            grid.appendChild(card);
        });
    }

    function createPhotoCard(photo, albumType, index) {
        const card = document.createElement('div');
        card.className = 'album-photo-card reveal visible';
        card.setAttribute('data-photo-id', photo.id || `local_${index}`);
        card.style.animationDelay = `${index * 80}ms`;

        card.innerHTML = `
            <div class="album-photo-img-wrap" data-full-src="${photo.image_url}">
                <img src="${photo.image_url}" alt="${photo.caption || ''}" loading="lazy" />
            </div>
            <p class="album-caption" data-photo-id="${photo.id || ''}" data-album-type="${albumType}">${photo.caption || ''}</p>
            <button class="album-delete-btn" title="Delete photo" style="display:none;">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;

        // Lightbox on click
        const imgWrap = card.querySelector('.album-photo-img-wrap');
        imgWrap.addEventListener('click', () => {
            openLightbox(photo.image_url, photo.caption);
        });

        // Delete handler
        const deleteBtn = card.querySelector('.album-delete-btn');
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm('Delete this photo?')) return;

            const success = await deletePhoto(photo, albumType);
            if (success) {
                card.classList.add('fade-out-card');
                setTimeout(() => {
                    card.remove();
                    window.showToastNotification('Photo deleted.', 'info');
                }, 300);
            }
        });

        // Caption save on blur (admin mode)
        const caption = card.querySelector('.album-caption');
        caption.addEventListener('blur', async () => {
            const newCaption = caption.textContent.trim();
            if (photo.caption !== newCaption) {
                photo.caption = newCaption;
                await updateCaption(photo, albumType, newCaption);
            }
        });

        // Show delete btn if admin
        if (window.isAdminMode && window.isAdminMode()) {
            deleteBtn.style.display = 'flex';
            caption.setAttribute('contenteditable', 'true');
            caption.classList.add('editable-field');
        }

        return card;
    }

    // ══════════════════════════════════════════
    //  UPLOAD PHOTOS
    // ══════════════════════════════════════════

    function setupUploadButtons() {
        document.querySelectorAll('.album-upload-btn').forEach(btn => {
            const albumType = btn.getAttribute('data-album-type');
            const fileInput = btn.querySelector('input[type="file"]');

            btn.addEventListener('click', () => {
                if (window.isAdminMode && window.isAdminMode()) {
                    fileInput.click();
                }
            });

            fileInput.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                if (files.length === 0) return;

                btn.classList.add('uploading');
                btn.querySelector('.upload-text').textContent = `Uploading ${files.length} file(s)...`;

                for (const file of files) {
                    await uploadPhoto(file, albumType);
                }

                btn.classList.remove('uploading');
                btn.querySelector('.upload-text').textContent = '+ Upload Photo';
                fileInput.value = '';

                // Reload photos
                await loadPhotos(albumType);
                window.showToastNotification(`${files.length} photo(s) uploaded!`, 'success');
            });
        });
    }

    async function uploadPhoto(file, albumType) {
        let imageUrl = '';

        if (supabaseClient) {
            try {
                const fileName = `${albumType}_${Date.now()}_${file.name}`;
                const { data, error } = await supabaseClient.storage
                    .from(STORAGE_BUCKET)
                    .upload(fileName, file);

                if (error) throw error;

                const { data: urlData } = supabaseClient.storage
                    .from(STORAGE_BUCKET)
                    .getPublicUrl(fileName);

                imageUrl = urlData.publicUrl;

                // Insert into photos table
                await supabaseClient.from('photos').insert({
                    album_type: albumType,
                    image_url: imageUrl,
                    caption: '',
                    created_at: new Date().toISOString()
                });

                return;
            } catch (e) {
                console.error('Supabase upload error:', e);
            }
        }

        // Fallback: save as data URL in localStorage
        const dataUrl = await fileToDataUrl(file);
        const localPhotos = JSON.parse(localStorage.getItem(`album_${albumType}`) || '[]');
        localPhotos.push({
            id: `local_${Date.now()}`,
            album_type: albumType,
            image_url: dataUrl,
            caption: '',
            created_at: new Date().toISOString()
        });
        localStorage.setItem(`album_${albumType}`, JSON.stringify(localPhotos));
    }

    function fileToDataUrl(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    // ══════════════════════════════════════════
    //  DELETE PHOTO
    // ══════════════════════════════════════════

    async function deletePhoto(photo, albumType) {
        if (supabaseClient && photo.id && !String(photo.id).startsWith('local_')) {
            try {
                // Delete from storage
                if (photo.image_url) {
                    const path = photo.image_url.split('/').pop();
                    await supabaseClient.storage.from(STORAGE_BUCKET).remove([path]);
                }

                // Delete from table
                const { error } = await supabaseClient
                    .from('photos')
                    .delete()
                    .eq('id', photo.id);

                if (error) throw error;
                return true;
            } catch (e) {
                console.error('Delete error:', e);
                return false;
            }
        }

        // Fallback: remove from localStorage
        const localPhotos = JSON.parse(localStorage.getItem(`album_${albumType}`) || '[]');
        const filtered = localPhotos.filter(p => p.id !== photo.id);
        localStorage.setItem(`album_${albumType}`, JSON.stringify(filtered));
        return true;
    }

    // ══════════════════════════════════════════
    //  UPDATE CAPTION
    // ══════════════════════════════════════════

    async function updateCaption(photo, albumType, newCaption) {
        if (supabaseClient && photo.id && !String(photo.id).startsWith('local_')) {
            try {
                await supabaseClient
                    .from('photos')
                    .update({ caption: newCaption })
                    .eq('id', photo.id);
                return;
            } catch (e) {
                console.error('Caption update error:', e);
            }
        }

        // Fallback: update localStorage
        const localPhotos = JSON.parse(localStorage.getItem(`album_${albumType}`) || '[]');
        const target = localPhotos.find(p => p.id === photo.id);
        if (target) {
            target.caption = newCaption;
            localStorage.setItem(`album_${albumType}`, JSON.stringify(localPhotos));
        }
    }

    // ══════════════════════════════════════════
    //  LIGHTBOX
    // ══════════════════════════════════════════

    let lightboxEl = null;

    function setupLightbox() {
        lightboxEl = document.createElement('div');
        lightboxEl.id = 'photo-lightbox';
        lightboxEl.className = 'photo-lightbox';
        lightboxEl.innerHTML = `
            <div class="lightbox-backdrop"></div>
            <div class="lightbox-content">
                <img id="lightbox-img" src="" alt="" />
                <p id="lightbox-caption" class="lightbox-caption"></p>
                <button class="lightbox-close" id="lightbox-close"><i class="fas fa-times"></i></button>
            </div>
        `;
        document.body.appendChild(lightboxEl);

        // Close handlers
        lightboxEl.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);
        document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeLightbox();
        });
    }

    function openLightbox(src, caption) {
        if (!lightboxEl) return;
        document.getElementById('lightbox-img').src = src;
        document.getElementById('lightbox-caption').textContent = caption || '';
        lightboxEl.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        if (!lightboxEl) return;
        lightboxEl.classList.remove('active');
        document.body.style.overflow = '';
    }

})();
