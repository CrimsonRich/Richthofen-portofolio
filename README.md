# 🚀 Richthofen Portfolio — Setup Guide

## Quick Start

This portfolio website has a built-in **Admin CMS** powered by **Supabase** (free backend-as-a-service). Follow these steps to set everything up.

---

## 1️⃣ Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up (free)
2. Click **"New Project"**
3. Give it a name (e.g., `portfolio-richthofen`)
4. Set a database password (save it somewhere!)
5. Choose the closest region to you
6. Click **"Create new project"** and wait ~2 minutes

---

## 2️⃣ Create Database Tables

Go to **SQL Editor** (left sidebar) and run these queries one by one:

### Table: `profile_content`
```sql
CREATE TABLE profile_content (
    id SERIAL PRIMARY KEY,
    field_key TEXT UNIQUE NOT NULL,
    field_value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profile_content ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Public can read profile_content"
    ON profile_content FOR SELECT
    USING (true);

-- Allow public insert/update (for admin editing via anon key)
CREATE POLICY "Anyone can insert profile_content"
    ON profile_content FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can update profile_content"
    ON profile_content FOR UPDATE
    USING (true)
    WITH CHECK (true);
```

### Table: `photos`
```sql
CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    album_type TEXT NOT NULL CHECK (album_type IN ('trip', 'photo', 'gaming')),
    image_url TEXT NOT NULL,
    caption TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Public can read photos"
    ON photos FOR SELECT
    USING (true);

-- Allow public insert/update/delete (for admin via anon key)
CREATE POLICY "Anyone can insert photos"
    ON photos FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can update photos"
    ON photos FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can delete photos"
    ON photos FOR DELETE
    USING (true);
```

---

## 3️⃣ Create Storage Bucket

1. Go to **Storage** (left sidebar)
2. Click **"New bucket"**
3. Name: `portfolio-images`
4. ✅ Check **"Public bucket"**
5. Click **"Create bucket"**
6. Click on the bucket, then go to **Policies** tab
7. Add a policy: **Allow public access for all operations** (or use the SQL below):

```sql
-- In the SQL Editor, run:
CREATE POLICY "Public Access" ON storage.objects
    FOR ALL
    USING (bucket_id = 'portfolio-images')
    WITH CHECK (bucket_id = 'portfolio-images');
```

---

## 4️⃣ Get Your Credentials

1. Go to **Settings** → **API** (left sidebar)
2. Copy these two values:
   - **Project URL** → looks like `https://abcdefg.supabase.co`
   - **anon public key** → a long string starting with `eyJ...`

---

## 5️⃣ Update config.js

Open `config.js` in your project folder and replace the placeholder values:

```js
const SUPABASE_URL = 'https://YOUR_ACTUAL_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ACTUAL_ANON_KEY_HERE';
const ADMIN_PASSWORD = 'your_secret_password';
```

---

## 6️⃣ Deploy to GitHub Pages

### Upload all files to GitHub:

1. Create a new **public** repository on [github.com](https://github.com)
2. Upload these files:
   - `index.html` (main portfolio page)
   - `config.js`
   - `auth.js`
   - `admin.js`
   - `gallery.js`
   - `img_trip.jpg`
   - `img_myphoto.jpg`
   - `img_gaming.png`

3. Go to **Settings** → **Pages**
4. Set **Source** to `Deploy from a branch`
5. Select **`main`** branch, root folder
6. Click **Save**
7. Your site will be live at `https://USERNAME.github.io/REPO-NAME/`

---

## 🔐 How Admin Mode Works

1. Open your website
2. Click the subtle **"EDIT"** button at the bottom-right corner
3. Enter your admin password
4. All text becomes editable — click to edit, then click "Save"
5. Upload photos to the gallery sections
6. Click "ADMIN" button → "Logout Admin" when done

---

## 📁 File Structure

```
Anti gravity/
├── index.html          ← Main portfolio page
├── portofolio.html     ← Working copy (same content)
├── config.js           ← Supabase credentials + password
├── auth.js             ← Login/logout system
├── admin.js            ← Inline editing + profile pic
├── gallery.js          ← Photo albums + lightbox
├── README.md           ← This file
├── img_trip.jpg        ← Hero polaroid photo
├── img_myphoto.jpg     ← Hero polaroid photo
└── img_gaming.png      ← Hero polaroid photo
```

---

## ⚠️ Security Notes

- The admin password is stored client-side. This is fine for a personal portfolio but not for commercial apps.
- The Supabase anon key is designed to be public — security comes from RLS policies.
- For a personal portfolio, this level of security is perfectly acceptable.
