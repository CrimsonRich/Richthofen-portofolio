/* ============================================
   CONFIG.JS — Supabase Credentials & Admin Settings
   ============================================ */

// ⚠️ IMPORTANT: Replace these with your actual Supabase project values!
// See README.md for setup instructions.
const SUPABASE_URL = 'https://enuselhmdirqnseusabm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVudXNlbGhtZGlycW5zZXVzYWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODU3MzAsImV4cCI6MjA5NTM2MTczMH0.fh2WqBeobDMRODCBj1lxsHnV_JX4tCS8rt_aSauBMto';

// Admin password for edit mode (change this to your own secret password)
const ADMIN_PASSWORD = 'richthofen2026';

// Supabase Storage bucket name
const STORAGE_BUCKET = 'portfolio-images';

// Initialize Supabase client (will be null if CDN not loaded or credentials not set)
let supabaseClient = null;
try {
    if (window.supabase && SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.warn('Supabase not initialized:', e.message);
}
