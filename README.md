# CivicConnect — Smart Election Process Assistant

> **Challenge Vertical:** Election Process Education  
> **Tech Stack:** HTML, CSS, JavaScript (Vanilla)  
> **Google Services:** Gemini API (AI), Firebase Auth, Firebase Realtime Database, Firestore, Google Analytics, Google Maps, Google Calendar, Google Charts, Google Translate, Google Fonts, Material Symbols, Web Speech API

---

## 🗳️ Chosen Vertical

**Election Process Education** — An interactive AI assistant that guides citizens through every step of the election process: understanding eligibility, registration, timelines, locating polling stations, and visualizing election data.

---

## 🧠 Approach & Logic

CivicConnect was designed as a **Single Page Application (SPA)** prioritizing:

1. **Context-Aware AI Chat** — A natural language parser scans user input for context keywords and returns rich, linked responses that cross-reference other app sections.
2. **Authentication-First Design** — Firebase Authentication gates the app with Google Sign-In, Email/Password, and Guest modes.
3. **Progressive Disclosure** — Information is layered across 5 focused tabs so users aren't overwhelmed.
4. **Accessibility** — Voice input (Speech-to-Text) and Text-to-Speech powered by the Web Speech API, plus 11-language support via Google Translate.
5. **Data Visualization** — Interactive charts via Google Charts bring election statistics to life.

---

## 🔧 How the Solution Works

### 🔐 Authentication (Firebase)
- **Google Sign-In** — One-click OAuth via Firebase Auth with Google Provider
- **Email/Password** — Traditional registration with validation
- **Guest Mode** — Skip auth to browse (limited features)
- **Auth State Observer** — Seamless session persistence across page reloads

### 🗄️ Firebase Realtime Database
- **User Profiles** — Stores name, email, photo URL, provider, last login, and login count
- **Chat History** — Every user/bot message is persisted; last 20 messages auto-loaded on login
- **Eligibility Responses** — Stores each eligibility check result with detailed criteria
- **User Interactions** — Tracks polling station searches and other key actions
- **RTDB Data Structure:**
```
users/
  {uid}/
    profile/         → { name, email, photoURL, lastLogin, provider }
    loginCount       → number
    chatHistory/     → { role, text, timestamp }
    responses/
      eligibility/   → { eligible, details, timestamp }
    interactions/    → { type, data, timestamp }
```

### 📈 Google Analytics
- **Page View Tracking** — Every tab/view change is tracked
- **Auth Events** — Login, registration, guest access logged
- **Chat Events** — User messages and bot responses tracked
- **Feature Usage** — Eligibility checks, map searches, calendar adds tracked
- Custom event categories: `auth`, `navigation`, `chat`, `eligibility`, `maps`, `calendar`

### 🤖 AI Chat Assistant (Gemini API)
- **Primary Engine:** Google Gemini 2.0 Flash via REST API for real-time, intelligent responses
- **System Prompt:** Custom-tuned persona scoped to election education — non-partisan, concise, and actionable
- **Multi-turn Conversations:** Full conversation history maintained (last 20 turns) for contextual follow-ups
- **Graceful Fallback:** If Gemini API key is not configured or API fails, seamlessly falls back to keyword-based NLP engine with 10+ topic categories
- Covers: registration, eligibility, timelines, documents, voting methods, polling locations, statistics
- Quick replies for common questions
- Typing indicator animation
- Markdown-to-HTML formatting of Gemini responses
- Chat history saved to Firebase Realtime Database per user
- Previous chat sessions auto-restored on login (last 20 messages)

### 🎤 Voice Input & 🔊 Text-to-Speech
- **Speech-to-Text**: Click the mic icon to speak your question (Web Speech API / `SpeechRecognition`)
- **Text-to-Speech**: Toggle TTS to have the bot read responses aloud (`SpeechSynthesis`)

### 📅 Election Timeline
- Visual chronological display of key election dates
- **Live countdown timers** to Registration Deadline and Election Day
- **Google Calendar Integration** — Each event has a button that deep-links to Google Calendar with pre-filled event details

### 🗺️ Polling Station Finder
- **Google Maps Embed** — Interactive map with address/ZIP search
- Dynamic station card with distance estimates
- **Google Maps Directions** — Opens turn-by-turn navigation in Google Maps

### ✅ Eligibility Checker
- Interactive checkbox form checking citizenship, age, residency, and felony status
- Instant visual feedback (pass/fail)
- Results saved to Firebase Realtime Database for user tracking

### 📊 Election Statistics (Google Charts)
- **Voter Turnout by Year** — Column chart
- **Registration by Age Group** — Donut/Pie chart  
- **Voting Methods** — Horizontal bar chart
- **Registration Trend** — Line chart with curves
- All charts are responsive and re-render on window resize

### 🌍 Google Translate
- Sidebar widget powered by Google Translate API
- 11 languages: English, Spanish, French, German, Hindi, Chinese, Arabic, Japanese, Korean, Portuguese, Russian

---

## 🔌 Google Services Integration Summary

| Google Service | Usage |
|---|---|
| **Gemini API** | Primary AI chatbot engine (gemini-2.0-flash) with multi-turn context |
| **Firebase Authentication** | Google Sign-In, Email/Password auth, session management |
| **Firebase Realtime Database** | User profiles, chat history, eligibility responses, interactions |
| **Cloud Firestore** | Secondary/backup user profile storage |
| **Google Analytics** | Page views, auth events, feature usage, chat tracking |
| **Google Maps (Embed)** | Polling station locator with dynamic search |
| **Google Calendar** | Deep-link event creation for election dates |
| **Google Charts** | 4 interactive data visualizations |
| **Google Translate** | 11-language translation widget |
| **Google Fonts** | Outfit typeface for premium typography |
| **Material Symbols** | 40+ icons throughout the UI |

---

## 📝 Assumptions Made

- Firebase and Gemini configs use demo/placeholder credentials — replace with your own keys for production
- Gemini API key is called client-side; in production, proxy through a backend for security
- Polling station data is simulated; in production, this would use the Google Civic Information API
- Election dates are illustrative (2026 cycle)
- The app is designed as a client-side SPA with no build step required

---

## 🚀 To Run Locally

Simply open `index.html` in a modern browser:

```bash
# Option 1: Direct file open
open index.html

# Option 2: Local server
npx serve .
```

### Firebase Setup (for full functionality)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Sign-in methods → Email/Password + Google
4. Enable **Realtime Database** (primary data store)
5. Enable **Cloud Firestore** (secondary/backup)
6. Register a Web App and copy the config
7. Replace the `firebaseConfig` object in `app.js` (including `databaseURL`)

### Google Analytics Setup
1. Go to [Google Analytics](https://analytics.google.com)
2. Create a property and get your Measurement ID (e.g., `G-XXXXXXXXXX`)
3. Replace `G-XXXXXXXXXX` in `index.html` (two occurrences in the head)

### Gemini API Setup
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create an API key
3. Replace `PASTE_YOUR_GEMINI_API_KEY_HERE` in `app.js` with your key
4. The app uses `gemini-2.0-flash` model by default (fast + free tier friendly)

---

## 📁 Project Structure

```
challenge-2/
├── index.html    # Main SPA structure (auth overlay + 5 views)
├── style.css     # Complete design system (glassmorphism, responsive)
├── app.js        # All application logic (auth, chat, charts, maps)
└── README.md     # This file
```
