# Elingno (Asisten Catatan & Pengingat Kerja)

[![Next.js 15](https://img.shields.io/badge/Next.js-15.2.1-black?logo=next.js)](https://nextjs.org/)
[![Drizzle ORM](https://img.shields.io/badge/ORM-Drizzle-C5F74F?logo=drizzle)](https://orm.drizzle.team/)
[![Turso](https://img.shields.io/badge/Database-Turso%20libSQL-00FFE0)](https://turso.tech/)
[![Groq](https://img.shields.io/badge/STT-Groq%20Whisper%20v3-F55036)](https://groq.com/)
[![Gemini 2.5 Flash](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-4285F4?logo=google)](https://deepmind.google/technologies/gemini/)
[![PWA](https://img.shields.io/badge/PWA-Ready-223309)](https://web.dev/progressive-web-apps/)

**Elingno** (*"Asisten Catatan & Pengingat Kerja"*) is a mobile-first Progressive Web App (PWA) designed as a personal executive secretary for factory and industrial operations leaders on the shop floor. 

It converts messy spoken Indonesian voice notes recorded in noisy manufacturing environments (containing technical jargon, raw metrics, and precision units like *kg, m³, sak, Volt, Ampere, bar, °C, RPM, ton, rupiah*) into structured, categorized daily work logs, chronological follow-up threads, and due-date reminders with Web Push notifications.

---

## 🎨 Tactile Organic-Neo-Brutalism Design System

Engineered with design guidance from 8 advanced UI design skills (`superdesign-skill`, `better-design`, `design-taste`, `canvas-ui`, `paper-design/shaders`, `hyperiux-components`, `uilayouts`, `cursify`):

- **Anti-AI-Slop Rules:** Strictly eliminates generic purple/indigo SaaS templates, default Inter typography, centered 3-card clichés, and emoji icons.
- **Color Palette Tokens:**
  - **Background Canvas:** `#F4F3EE` (Warm Alabaster)
  - **Primary Action & Featured Card:** `#E4F65B` (Electric Acid Lime) with organic fluid wave surface textures
  - **Deep Contrast Header & Secondary Card:** `#223309` (Forest Olive)
  - **Primary Ink & Active Pills:** `#1A1B18` (Charcoal Black)
  - **Muted Surface / Floating Dock:** `#E5E4DE` (Stone Grey)
  - **Pure Card Surface:** `#FFFFFF`
- **Typography:** `Plus Jakarta Sans` (weights 500, 600, 700, 800) with tight display tracking (`-0.025em`) and `tabular-nums` for precision factory figures.
- **Tactile Shapes:** Cards `rounded-[30px]`, floating action dock `rounded-full`, diagonal-striped progress bars (`repeating-linear-gradient`), and spring physics via Framer Motion.

---

## ⚡ Zero-Timeout Decoupled AI Pipeline (< 2.2s total)

1. **Client Audio Recording (`src/lib/audioRecorder.ts`):**
   - MediaRecorder with `audio/webm;codecs=opus` (iOS fallback to MP4) at 24 kbps speech-optimized bitrate (1 min ≈ 150 KB).
   - Live organic audio waveform visualizer via Web Audio API `AnalyserNode`.
   - Client offline queue with **Dexie.js (`pendingAudioQueue`)** to safeguard recordings during signal dropouts on factory floors.
2. **Step 1: `POST /api/transcribe` (~0.8s):**
   - Forwards audio to Groq Whisper (`whisper-large-v3-turbo`) with specialized Indonesian industrial prompt biasing for extruder, rafia, pelletizing, voltase, bearing, sak, kg, and numbers.
3. **Step 2: `POST /api/structure` (~1.1s):**
   - Queries user's active divisions from Turso.
   - Calls **Google Gemini 2.5 Flash** with strict `responseSchema` (Structured JSON) to extract title, division match, Indonesian markdown bullets, priority, and WIB due dates.
4. **Instant Review & Edit Drawer:**
   - Review and tweak output before committing to database.

---

## 📱 3 Core Screens & Interactive Sheets

1. **Home Hub ("Elingno — Catatan & Tugas Site"):**
   - Top brand bar with Category Manager gear and active notification badge.
   - Hero greeting and Task Summary Pill (`#E5E4DE` with instant jump arrow `↗`).
   - Horizontal division filter chips with live counts.
   - Featured Snap Carousel with Acid Lime & Forest Olive cards, update thread counter, and diagonal-striped progress bar.
   - Daily logs feed with quick completion checkmark.
2. **Daily Timeline & Calendar View:**
   - Curved dark header (`#223309`, `rounded-b-[36px]`) with month picker and 7-day horizontal week strip.
   - Hourly vertical timeline (`07:00` – `22:00` WIB) with chronological task cards and a live horizontal red current-time marker.
3. **Interactive Drawers & Floating Dock:**
   - **Floating Bottom Dock:** Centered `#E5E4DE/90` frosted pill with Home, Hero Mic button (tap or long-press for hands-free recording), and Timeline selector.
   - **Voice & Manual Capture Sheet:** Live animated waveform, timer, and instant review card.
   - **Note Detail & Follow-up Thread Drawer:** Full formatted text, raw verbatim transcript toggle, 0–100% progress slider, status switcher, and chronological Catatan Lanjutan thread with voice or quick text append.
   - **Notifications & Reminders Drawer:** Filter reminders, view upcoming due dates, and 1-tap Web Push notification activator.
   - **Category Manager Drawer:** Custom divisions, palette swatch picker, icon selector, and industrial keyword tags.

---

## 🗄️ Database Schema (`src/db/schema.ts` — Turso + Drizzle)

- `categories`: Divisions (Produksi, Maintenance, Gudang & Stok, Kelistrikan, HR & Personalia, Umum) with color, icon, and AI keywords.
- `notes`: Parent operational logs with title, verbatim raw transcript, formatted content, status (`open` | `in_progress` | `done`), priority (`normal` | `high`), progress (0-100), and due date timestamp.
- `noteUpdates`: Chronological follow-up logs (`voice` or `manual`).
- `pushSubscriptions`: Browser Web Push endpoints with VAPID keys.
- **Auto-seeding:** `ensureSchema()` auto-creates tables and initial categories on first load without manual CLI pushes.

---

## ⏰ Cron Reminders Endpoint

`GET /api/cron/reminders`
- Protected by `Authorization: Bearer ${CRON_SECRET}`.
- Triggered every 15 minutes by external cron (e.g. Cron-job.org).
- Queries notes due within 30 minutes, sends Web Push notifications via `web-push`, and sets `reminderSent = 1`.

---

## 🚀 Environment Configuration (`.env.local`)

```bash
# Turso Database
TURSO_DATABASE_URL="file:local.db" # or libsql://your-db.turso.io
TURSO_AUTH_TOKEN=""

# Groq STT API
GROQ_API_KEY="gsk_..."

# Google Gemini API
GEMINI_API_KEY="AIzaSy..."

# Web Push VAPID Keys (Generate with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:operations@elingno.local"

# Cron Secret
CRON_SECRET="elingno-cron-secret-key-321"
```

---

## 🛠️ Development & Production Build

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production build
npm run build

# Start production server
npm start
```
