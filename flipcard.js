/* ============================================
   FLIPCARD.JS — Game Stats + Admin Editing
   ============================================ */

(function () {
    'use strict';

    // ── Default game stats (editable via admin) ──
    const gameStats = {
        valorant: {
            title: 'Valorant Stats',
            stats: [
                { icon: 'fas fa-trophy', label: 'Rank', value: 'Gold II', key: 'valorant_rank' },
                { icon: 'fas fa-clock', label: 'Hours Played', value: '850+ hrs', key: 'valorant_hours' },
                { icon: 'fas fa-user-ninja', label: 'Main Agent', value: 'Jett / Reyna', key: 'valorant_main' },
                { icon: 'fas fa-star', label: 'Best Play', value: 'Ace Clutch', key: 'valorant_best' }
            ]
        },
        minecraft: {
            title: 'Minecraft Stats',
            stats: [
                { icon: 'fas fa-cube', label: 'Favorite Mode', value: 'Survival', key: 'mc_mode' },
                { icon: 'fas fa-clock', label: 'Hours Played', value: '600+ hrs', key: 'mc_hours' },
                { icon: 'fas fa-home', label: 'Biggest Build', value: 'Medieval Castle', key: 'mc_build' },
                { icon: 'fas fa-star', label: 'Achievement', value: 'The End', key: 'mc_achievement' }
            ]
        },
        deltaforce: {
            title: 'Delta Force Stats',
            stats: [
                { icon: 'fas fa-medal', label: 'Level', value: 'Level 42', key: 'df_level' },
                { icon: 'fas fa-clock', label: 'Hours Played', value: '200+ hrs', key: 'df_hours' },
                { icon: 'fas fa-crosshairs', label: 'Favorite Weapon', value: 'M4A1', key: 'df_weapon' },
                { icon: 'fas fa-star', label: 'K/D Ratio', value: '1.8', key: 'df_kd' }
            ]
        },
        rocketleague: {
            title: 'Rocket League Stats',
            stats: [
                { icon: 'fas fa-trophy', label: 'Rank', value: 'Platinum III', key: 'rl_rank' },
                { icon: 'fas fa-clock', label: 'Hours Played', value: '400+ hrs', key: 'rl_hours' },
                { icon: 'fas fa-car', label: 'Favorite Car', value: 'Octane', key: 'rl_car' },
                { icon: 'fas fa-star', label: 'Best Goal', value: 'Ceiling Shot', key: 'rl_goal' }
            ]
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        buildFlipCards();
        loadSavedStats();
    });

    function buildFlipCards() {
        const cards = document.querySelectorAll('.game-card');

        cards.forEach(card => {
            const gameKey = card.getAttribute('data-game');
            if (!gameKey || !gameStats[gameKey]) return;

            const stats = gameStats[gameKey];
            const front = card.querySelector('.card-front');
            const existingBack = card.querySelector('.card-back');

            // Skip if already built
            if (existingBack) return;

            // Wrap existing content in card-inner + card-front
            const inner = document.createElement('div');
            inner.className = 'card-inner';

            // Move existing content into card-front
            if (!front) {
                const newFront = document.createElement('div');
                newFront.className = 'card-front';
                while (card.firstChild) {
                    newFront.appendChild(card.firstChild);
                }
                inner.appendChild(newFront);
            } else {
                inner.appendChild(front);
            }

            // Create back face
            const back = document.createElement('div');
            back.className = 'card-back';

            let statsHtml = `<div class="card-back-title">${stats.title}</div>`;
            stats.stats.forEach(stat => {
                statsHtml += `
                    <div class="card-stat">
                        <div class="card-stat-icon"><i class="${stat.icon}"></i></div>
                        <div class="card-stat-info">
                            <span class="card-stat-label">${stat.label}</span>
                            <span class="card-stat-value" data-field-key="${stat.key}">${stat.value}</span>
                        </div>
                    </div>
                `;
            });

            back.innerHTML = statsHtml;
            inner.appendChild(back);
            card.appendChild(inner);
        });
    }

    async function loadSavedStats() {
        // Try loading from Supabase first, then localStorage
        let data = null;

        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
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
            } catch (e) { /* skip */ }
        }

        // Apply saved stat values
        document.querySelectorAll('.card-stat-value[data-field-key]').forEach(el => {
            const key = el.getAttribute('data-field-key');
            let saved = null;

            if (data && data[key]) {
                saved = data[key];
            } else {
                saved = localStorage.getItem('field_' + key);
            }

            if (saved) {
                el.textContent = saved;
            }
        });
    }

    // ── Admin mode: make stats editable ──
    window.addEventListener('adminModeChanged', (e) => {
        if (e.detail.isAdmin) {
            document.querySelectorAll('.card-stat-value[data-field-key]').forEach(el => {
                el.setAttribute('contenteditable', 'true');
                el.classList.add('editable-field');
                el.setAttribute('spellcheck', 'false');

                el.addEventListener('blur', async () => {
                    const key = el.getAttribute('data-field-key');
                    const value = el.textContent.trim();

                    if (typeof window.saveFieldToSupabase === 'function') {
                        await window.saveFieldToSupabase(key, value);
                        window.showToastNotification('Stat saved!', 'success');
                    }
                });
            });
        }
    });

})();
