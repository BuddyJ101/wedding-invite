# Amber & Junaid – Wedding Invitation Website

An interactive, single-page wedding invitation website built with **vanilla HTML, CSS, and JavaScript**, designed to run on **GitHub Pages** with no frontend framework.

This site combines animation, personalization, and backend validation to create a custom RSVP experience.

Wedding Date: **25 July 2026**

---

## 🌐 Architecture Overview

Frontend:

- Static site (GitHub Pages)
- Vanilla JS
- No frameworks
- No build tools

Backend:

- Google Apps Script (Web App)
- Google Sheets as database

Flow:

Visitor → GitHub Pages → Google Apps Script → Google Sheets

---

## ✨ Features

### 📩 Animated Envelope Intro

- Full-screen baby-blue envelope
- 3D flap animation
- Custom wax seal
- Dynamic invite name on seal
- Smooth fade into main content

---

### 🎬 Scroll-Scrub Hero Animation (Video → Frames)

The hero section is a **frame-by-frame canvas animation** controlled by scroll position.

Instead of embedding a video:

- The video is converted into image frames
- Frames are preloaded
- Canvas renders based on scroll progress

This allows:

- Full scroll control
- Mobile compatibility
- No video autoplay issues
- Fine performance control

---

### 🎟 Scratch-to-Reveal Date

- Three circular scratch cards
- Canvas-based scratch detection
- 40% reveal threshold
- Automatically scrolls to countdown when completed

---

### ⏳ Live Countdown Timer

- Updates every second
- Automatically stops at wedding date

---

### 📍 Venue & Schedule

- Timeline layout (desktop + mobile responsive)
- Embedded Google Maps
- Add to Google Calendar button
- Scroll animations via IntersectionObserver

---

### 👗 Dress Code & Registry

- Registry external link
- Styled formal attire section

---

### 📝 Personalized RSVP System

Fully dynamic RSVP powered by Google Apps Script.

Features:

- Invite key validation via `?invite=KEY`
- Dynamic guest name rendering
- Guest count stepper
- Named + unnamed guest support
- Backend validation
- Duplicate prevention
- RSVP locking after submission
- Deadline enforcement
- Graceful error handling
- No CORS preflight (uses form-urlencoded POST)

---

## 🗂 Project Structure

```
/
│
├── index.html
├── styles.css
├── script.js
│
├── images/
│ ├── wax-seal.png
│ ├── venue.png
│
├── frames/
│ ├── frame0001.jpg
│ ├── frame0002.jpg
│ ├── ...
│
└── README.md
```

---

## 🎬 Hero Animation Setup (Important)

The hero animation requires converting a video into frames.

### Step 1 — Install FFmpeg

Download and install FFmpeg:

https://ffmpeg.org/download.html

Verify installation:

```bash
ffmpeg -version
```

### Step 2 — Convert Video to Frames

From your project folder:

```
ffmpeg -i turnaround.mp4 -vf fps=24 -q:v 2 frames/frame%04d.jpg
```

Explanation:

- `-vf fps=24` → extracts 24 frames per second

- `-q:v 2` → high quality

- `frame%04d.jpg` → frame0001.jpg, frame0002.jpg, etc.

### Step 3 — Update Frame Count in JavaScript

In `script.js`, update:

```js
const TOTAL_FRAMES = 121;
```

This must match the total number of frames generated.

If incorrect:

- Scroll will stop early

- Animation may glitch

- Progress bar will misalign

---

## ⚠ Performance Note

- Keep total frames under ~200 for performance

- Resize frames before export if needed

- Use compressed JPG instead of PNG

---

## 📝 RSVP Configuration

Inside `script.js`, set your backend URL:

```js
const RSVP_API_BASE =
  "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
```

The page expects URLs like:

```
https://yourdomain.com/?invite=granny-grandpa
```

Optional name override:

```
?invite=granny-grandpa&name=Grandma%20%26%20Grandpa
```

---

## 📦 Deployment (GitHub Pages)

1. Push repo to GitHub

2. Go to Settings → Pages

3. Select:
   - Branch: main

   - Folder: /root

4. Save

Your site will be available at:

```
https://username.github.io/repository-name/
```

---

## 🎨 Theme System

Uses CSS variables for easy theme customization:

```css
:root {
  --primary-blue: #a8d4f0;
  --light-blue: #d4ebf7;
  --dark-blue: #6bb3d9;
  --deeper-blue: #4a9bc4;
}
```

Changing these updates the entire site theme.

---

# 📱 Mobile Considerations

- Uses window.innerHeight override for sticky hero

- Avoids 100vh mobile bugs

- Handles iOS address bar shifting

- Touch-compatible scratch cards

- No autoplay video issues

---

# 🔒 Security Notes

- Invite validation happens server-side

- Guest limits enforced server-side

- No sensitive logic exposed in frontend

- RSVP cannot be overwritten once submitted

---

# 🧠 Design Philosophy

This site was intentionally built:

- Without frameworks

- Without bundlers

- Without server hosting

- With performance in mind

- With controlled animations

- With strong validation

Everything runs:

- On GitHub Pages

- Using Google Apps Script

- Using Google Sheets

Minimal infrastructure. Maximum control.

---

# 📌 Author

Junaid Brooks
Cape Town, South Africa
Wedding Date: 25 July 2026
