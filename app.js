// ====================================================================
// CivicConnect — Smart Election Assistant
// Google Services: Gemini API, Firebase Auth, Firebase Realtime Database,
//                  Firestore, Google Charts, Google Translate, Google Maps,
//                  Google Calendar, Google Analytics, Web Speech API
// ====================================================================

"use strict"; // Enforce strict mode for better code quality and error catching

// ─── Utility: Security & Sanitization ───────────────────────────────
const DOMPurify = {
    sanitize: (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    }
};

// ─── Utility: Accessibility Announcer ───────────────────────────────
function announceToScreenReader(message) {
    const announcer = document.getElementById('sr-announcer');
    if (announcer) {
        announcer.textContent = message;
        // Clear after a moment to allow repeating the same message later
        setTimeout(() => { announcer.textContent = ''; }, 3000);
    }
}

// ─── Utility: Debounce (Efficiency) ─────────────────────────────────
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ─── Firebase Configuration ─────────────────────────────────────────
// NOTE: Replace with your own Firebase project credentials.
// Go to https://console.firebase.google.com → Create Project → Web App → Copy Config
const firebaseConfig = {
    apiKey: "AIzaSyDemo_Replace_With_Your_Key",
    authDomain: "civicconnect-demo.firebaseapp.com",
    projectId: "civicconnect-demo",
    storageBucket: "civicconnect-demo.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:aaaaaaaaaaaaaaaa",
    databaseURL: "https://civicconnect-demo-default-rtdb.firebaseio.com"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const rtdb = firebase.database();  // Realtime Database
const googleProvider = new firebase.auth.GoogleAuthProvider();

// ─── DOM Elements ───────────────────────────────────────────────────
const authOverlay = document.getElementById('auth-overlay');
const appContainer = document.getElementById('app-container');
const authError = document.getElementById('auth-error');
const authErrorText = document.getElementById('auth-error-text');

// Auth buttons
const emailLoginBtn = document.getElementById('email-login-btn');
const emailRegisterBtn = document.getElementById('email-register-btn');
const googleSigninBtn = document.getElementById('google-signin-btn');
const googleRegisterBtn = document.getElementById('google-register-btn');
const skipAuthBtn = document.getElementById('skip-auth-btn');
const logoutBtn = document.getElementById('logout-btn');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// User profile elements
const userDisplayName = document.getElementById('user-display-name');
const userAuthStatus = document.getElementById('user-auth-status');
const userAvatar = document.getElementById('user-avatar');

// Chat elements
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const voiceInputBtn = document.getElementById('voice-input-btn');
const micIcon = document.getElementById('mic-icon');
const ttsToggle = document.getElementById('tts-toggle');

// Navigation
const navButtons = document.querySelectorAll('.nav-btn');
const viewSections = document.querySelectorAll('.view-section');

// ─── State ──────────────────────────────────────────────────────────
let currentUser = null;
let ttsEnabled = false;

// ─── Gemini API Configuration ───────────────────────────────────────
// Replace with your own Gemini API key from https://aistudio.google.com/apikey
const GEMINI_API_KEY = 'PASTE_YOUR_GEMINI_API_KEY_HERE';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Conversation history for multi-turn context
let conversationHistory = [];

const GEMINI_SYSTEM_PROMPT = `You are CivicConnect, a friendly and knowledgeable AI assistant specializing in election process education. Your role is to help citizens understand:
- Voter registration steps and requirements
- Election timelines, dates, and deadlines
- Required documents for voting (IDs, proof of residence)
- Types of elections (general, primary, midterm, local, special)
- Polling station information
- Mail-in and absentee voting procedures
- Voter eligibility criteria
- Election statistics and participation

Guidelines:
- Keep responses concise, clear, and informative (under 200 words)
- Use bullet points and emojis for readability
- Be non-partisan — never endorse any candidate or party
- When relevant, mention the app features: Timeline tab, Polling Station map, Registration Steps, Election Stats
- If asked something outside elections/voting, politely redirect to election topics
- Use HTML formatting: <br> for line breaks, <strong> for bold, <em> for italic
- The current date context is April 2026. Key upcoming dates: Registration Deadline May 1 2026, Early Voting May 15, Mail-in Deadline May 25, Election Day June 2 2026`;

// ====================================================================
// 1. AUTH PARTICLES ANIMATION
// ====================================================================
function createAuthParticles() {
    const container = document.getElementById('auth-particles');
    const colors = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b'];
    for (let i = 0; i < 12; i++) {
        const p = document.createElement('div');
        p.className = 'auth-particle';
        p.style.width = `${Math.random() * 200 + 50}px`;
        p.style.height = p.style.width;
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.left = `${Math.random() * 100}%`;
        p.style.top = `${Math.random() * 100}%`;
        p.style.animationDelay = `${Math.random() * 5}s`;
        p.style.animationDuration = `${Math.random() * 10 + 10}s`;
        container.appendChild(p);
    }
}

createAuthParticles();

// ====================================================================
// 2. FIREBASE AUTHENTICATION
// ====================================================================

// Toggle between login/register forms
showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    hideAuthError();
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    hideAuthError();
});

function showAuthError(msg) {
    authError.classList.remove('hidden');
    authErrorText.textContent = msg;
}

function hideAuthError() {
    authError.classList.add('hidden');
}

function setButtonLoading(btn, loading) {
    if (loading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-outlined" style="animation: spin 1s linear infinite">progress_activity</span> Please wait...';
    } else {
        btn.disabled = false;
        if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
    }
}

// Email/Password Login
emailLoginBtn.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) return showAuthError('Please fill in all fields.');
    
    hideAuthError();
    setButtonLoading(emailLoginBtn, true);
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Welcome back!', 'success');
        announceToScreenReader('Successfully signed in. Welcome back to CivicConnect.');
    } catch (err) {
        const friendlyError = getFriendlyError(err.code);
        showAuthError(friendlyError);
        announceToScreenReader(`Sign in failed: ${friendlyError}`);
    }
    setButtonLoading(emailLoginBtn, false);
});

// Email/Password Register
emailRegisterBtn.addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    if (!name || !email || !password) return showAuthError('Please fill in all fields.');
    if (password.length < 6) return showAuthError('Password must be at least 6 characters.');

    hideAuthError();
    setButtonLoading(emailRegisterBtn, true);
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
        // Save user profile to Firestore
        await saveUserProfile(cred.user);
        showToast('Account created! Welcome to CivicConnect.', 'success');
        announceToScreenReader('Account created successfully. Welcome to CivicConnect.');
    } catch (err) {
        const friendlyError = getFriendlyError(err.code);
        showAuthError(friendlyError);
        announceToScreenReader(`Registration failed: ${friendlyError}`);
    }
    setButtonLoading(emailRegisterBtn, false);
});

// Google Sign-In
function handleGoogleSignIn() {
    auth.signInWithPopup(googleProvider)
        .then(result => {
            saveUserProfile(result.user);
            showToast('Signed in with Google!', 'success');
            announceToScreenReader('Successfully signed in with Google.');
        })
        .catch(err => {
            const friendlyError = getFriendlyError(err.code);
            showAuthError(friendlyError);
            announceToScreenReader(`Google sign in failed: ${friendlyError}`);
        });
}

googleSigninBtn.addEventListener('click', handleGoogleSignIn);
googleRegisterBtn.addEventListener('click', handleGoogleSignIn);

// Skip Auth (Guest mode)
skipAuthBtn.addEventListener('click', () => {
    enterApp(null);
    showToast('Browsing as Guest. Sign in to save your progress.', 'info');
    announceToScreenReader('Continuing as guest. Some features may be limited.');
    trackEvent('auth', 'guest_login');
});

// Logout
logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        showToast('Signed out successfully.', 'info');
        announceToScreenReader('You have been signed out.');
        currentUser = null;
        authOverlay.classList.remove('hide');
        appContainer.classList.add('hidden');
        
        // Reset Focus for Accessibility
        document.getElementById('email-login-btn')?.focus();
    });
});

// Firebase Auth State Observer
auth.onAuthStateChanged(user => {
    if (user) {
        enterApp(user);
    }
});

// ─── Firebase Realtime Database: Save User Profile ──────────────────
async function saveUserProfile(user) {
    if (!user) return;
    const userData = {
        name: user.displayName || 'Citizen',
        email: user.email,
        photoURL: user.photoURL || null,
        lastLogin: new Date().toISOString(),
        provider: user.providerData?.[0]?.providerId || 'email'
    };

    // Save to Realtime Database (primary)
    try {
        await rtdb.ref('users/' + user.uid + '/profile').set(userData);
        // Also track login count
        const loginCountRef = rtdb.ref('users/' + user.uid + '/loginCount');
        loginCountRef.transaction(count => (count || 0) + 1);
        console.log('User profile saved to Realtime Database.');
    } catch (e) {
        console.log('RTDB write skipped (demo mode):', e.message);
    }

    // Also save to Firestore (secondary/backup)
    try {
        await db.collection('users').doc(user.uid).set(userData, { merge: true });
    } catch (e) {
        console.log('Firestore write skipped (demo mode):', e.message);
    }
}

// ─── Firebase Realtime Database: Save Chat Messages ─────────────────
async function saveChatMessage(role, text) {
    if (!currentUser) return;
    const messageData = {
        role: role,
        text: text,
        timestamp: new Date().toISOString()
    };

    // Save to Realtime Database
    try {
        await rtdb.ref('users/' + currentUser.uid + '/chatHistory').push(messageData);
    } catch (e) {
        console.log('RTDB chat save skipped (demo mode):', e.message);
    }
}

// ─── Firebase Realtime Database: Load Previous Chat History ─────────
async function loadChatHistory() {
    if (!currentUser) return;
    try {
        const snapshot = await rtdb.ref('users/' + currentUser.uid + '/chatHistory')
            .orderByChild('timestamp')
            .limitToLast(20)  // Load last 20 messages
            .once('value');

        const messages = snapshot.val();
        if (!messages) return;

        // Clear existing welcome message
        // (keep the first assistant message)
        const existingMessages = chatMessages.querySelectorAll('.message');
        if (Object.keys(messages).length > 0 && existingMessages.length <= 1) {
            Object.values(messages).forEach(msg => {
                // Ensure text is safely injected when loading history
                appendMessage(msg.text, msg.role === 'user', true); // true = skipSave
            });
            showToast('Previous chat history loaded.', 'info');
        }
    } catch (e) {
        console.log('RTDB chat load skipped (demo mode):', e.message);
    }
}

// ─── Firebase Realtime Database: Save Eligibility Response ──────────
async function saveEligibilityResponse(result, details) {
    if (!currentUser) return;
    try {
        await rtdb.ref('users/' + currentUser.uid + '/responses/eligibility').push({
            eligible: result,
            details: details,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.log('RTDB eligibility save skipped (demo mode):', e.message);
    }
}

// ─── Firebase Realtime Database: Save User Interaction ──────────────
async function saveUserInteraction(type, data) {
    if (!currentUser) return;
    try {
        await rtdb.ref('users/' + currentUser.uid + '/interactions').push({
            type: type,
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.log('RTDB interaction save skipped (demo mode):', e.message);
    }
}

function enterApp(user) {
    currentUser = user;
    authOverlay.classList.add('hide');
    appContainer.classList.remove('hidden');

    if (user) {
        userDisplayName.textContent = user.displayName || user.email?.split('@')[0] || 'Citizen';
        userAuthStatus.textContent = 'Verified';
        userAuthStatus.classList.add('verified');
        
        if (user.photoURL) {
            userAvatar.innerHTML = `<img src="${user.photoURL}" alt="avatar">`;
        }

        // Load previous chat history from RTDB
        loadChatHistory();

        // Track login event in Google Analytics
        trackEvent('auth', 'login', user.providerData?.[0]?.providerId || 'email');
    } else {
        userDisplayName.textContent = 'Guest';
        userAuthStatus.textContent = 'Guest Mode';
        userAuthStatus.classList.remove('verified');
    }

    // Load charts after entering app
    loadGoogleCharts();
    startCountdowns();
    
    // Accessibility: Set focus on the active tab's first focusable element or heading
    setTimeout(() => {
        const activeSection = document.querySelector('.view-section.active');
        if (activeSection) {
            const heading = activeSection.querySelector('h2');
            if (heading) {
                heading.tabIndex = -1;
                heading.focus();
            }
        }
    }, 100);
}

function getFriendlyError(code) {
    const map = {
        'auth/user-not-found': 'No account found with that email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/email-already-in-use': 'An account with that email already exists.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-email': 'Invalid email address format.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
        'auth/invalid-credential': 'Invalid credentials. Please check and try again.'
    };
    return map[code] || 'An error occurred. Please try again.';
}

// ====================================================================
// 3. NAVIGATION LOGIC
// ====================================================================
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        viewSections.forEach(v => v.classList.remove('active'));

        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        
        const targetId = btn.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);
        targetSection.classList.add('active');
        
        // Accessibility: announce view change
        announceToScreenReader(`Navigated to ${btn.innerText.trim()}`);

        // Close mobile sidebar
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('open');
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.remove();
        
        // Set focus to new section for keyboard navigation
        setTimeout(() => {
            const heading = targetSection.querySelector('h2');
            if(heading) {
                heading.tabIndex = -1;
                heading.focus();
            }
        }, 50);
    });
});

// Mobile menu
document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');

    if (sidebar.classList.contains('open')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.remove();
        });
        document.body.appendChild(overlay);
    }
});

window.switchTab = function(targetId) {
    const btn = document.querySelector(`.nav-btn[data-target="${targetId}"]`);
    if (btn) btn.click();
};

window.sendQuickReply = function(text) {
    chatInput.value = text;
    handleSend();
};

// ====================================================================
// 4. AI CHAT ASSISTANT (Enhanced Knowledge Base)
// ====================================================================
const botKnowledge = [
    {
        keywords: ['register', 'registration', 'how to vote', 'apply', 'sign up to vote'],
        response: `Great question! Here's how to register to vote:<br><br>
        <strong>1.</strong> Check your eligibility (age, citizenship, residency)<br>
        <strong>2.</strong> Gather your documents (ID, proof of address)<br>
        <strong>3.</strong> Fill the registration form online or in person<br>
        <strong>4.</strong> Wait for confirmation (2-3 weeks)<br><br>
        Use the <a href='#' onclick='switchTab("registration-view")' style='color:var(--primary);font-weight:600'>Registration Steps</a> tab for the full interactive guide!`
    },
    {
        keywords: ['when', 'date', 'timeline', 'next election', 'schedule'],
        response: `Here are the key upcoming dates:<br><br>
        📅 <strong>Registration Deadline:</strong> May 1, 2026<br>
        📅 <strong>Early Voting Begins:</strong> May 15, 2026<br>
        📅 <strong>Mail-in Ballot Deadline:</strong> May 25, 2026<br>
        📅 <strong>General Election Day:</strong> June 2, 2026<br><br>
        Check the <a href='#' onclick='switchTab("timeline-view")' style='color:var(--primary);font-weight:600'>Election Timeline</a> for countdown timers and Google Calendar sync!`
    },
    {
        keywords: ['document', 'id', 'proof', 'what to bring', 'need'],
        response: `To vote, you'll typically need:<br><br>
        ✅ <strong>Government-issued Photo ID</strong> — Driver's License, State ID, or Passport<br>
        ✅ <strong>Proof of Residence</strong> — Utility bill, bank statement, or lease agreement<br>
        ✅ <strong>Social Security Number</strong> — Often required for registration<br><br>
        Requirements vary by state. Check your state election website for specifics.`
    },
    {
        keywords: ['where', 'location', 'polling', 'station', 'booth', 'near me'],
        response: `Find your nearest polling station using the <a href='#' onclick='switchTab("maps-view")' style='color:var(--primary);font-weight:600'>Polling Station</a> map powered by Google Maps! Simply enter your ZIP code or address to locate booths near you, check wait times, and get Google Maps directions.`
    },
    {
        keywords: ['hello', 'hi', 'hey', 'start', 'help'],
        response: `Hello! 👋 I'm your CivicConnect AI Assistant. I can help you with:<br><br>
        🔹 <strong>Voter Registration</strong> — Step-by-step guidance<br>
        🔹 <strong>Election Dates</strong> — Deadlines and timelines<br>
        🔹 <strong>Required Documents</strong> — What you need to bring<br>
        🔹 <strong>Polling Stations</strong> — Find yours on Google Maps<br>
        🔹 <strong>Eligibility</strong> — Check if you qualify to vote<br>
        🔹 <strong>Election Statistics</strong> — Turnout and demographics<br><br>
        What would you like to know?`
    },
    {
        keywords: ['eligible', 'eligibility', 'qualify', 'can i vote', 'allowed'],
        response: `To be eligible to vote, you generally must:<br><br>
        ✅ Be a citizen of the country<br>
        ✅ Be at least 18 years old by Election Day<br>
        ✅ Meet your state's residency requirements<br>
        ✅ Not be currently incarcerated for a felony (varies by state)<br><br>
        Use our <a href='#' onclick='switchTab("registration-view")' style='color:var(--primary);font-weight:600'>Eligibility Checker</a> to verify instantly!`
    },
    {
        keywords: ['type', 'kinds', 'types of election', 'primary', 'general', 'midterm', 'local'],
        response: `There are several types of elections:<br><br>
        🏛️ <strong>General Elections</strong> — National elections for major offices (President, Congress)<br>
        🗳️ <strong>Primary Elections</strong> — Party-level selections to choose nominees<br>
        📊 <strong>Midterm Elections</strong> — Congressional elections between presidential races<br>
        🏘️ <strong>Local Elections</strong> — Mayors, city councils, school boards, local measures<br>
        📜 <strong>Special Elections</strong> — To fill unexpected vacancies or ballot measures<br><br>
        Each type plays a critical role in representative democracy!`
    },
    {
        keywords: ['mail', 'absentee', 'mail-in', 'vote by mail', 'postal'],
        response: `Mail-in/absentee voting allows you to vote from home:<br><br>
        <strong>1.</strong> Request an absentee ballot from your local election office<br>
        <strong>2.</strong> Receive your ballot by mail<br>
        <strong>3.</strong> Complete it carefully following all instructions<br>
        <strong>4.</strong> Return by mail or drop-off before the deadline<br><br>
        ⚠️ The mail-in ballot request deadline is <strong>May 25, 2026</strong>. Don't miss it!`
    },
    {
        keywords: ['stats', 'statistics', 'turnout', 'data', 'numbers'],
        response: `Check out our <a href='#' onclick='switchTab("stats-view")' style='color:var(--primary);font-weight:600'>Election Stats</a> tab for interactive charts powered by Google Charts! You can see voter turnout trends, age group breakdowns, and voting method preferences.`
    },
    {
        keywords: ['translate', 'language', 'spanish', 'french', 'hindi'],
        response: `CivicConnect supports multiple languages through <strong>Google Translate</strong>! Look for the Language Selector in the sidebar to switch between 11 supported languages including English, Spanish, French, Hindi, Arabic, and more.`
    }
];

function getBotResponse(input) {
    const lowerInput = input.toLowerCase();
    for (const item of botKnowledge) {
        if (item.keywords.some(kw => lowerInput.includes(kw))) {
            return item.response;
        }
    }
    return `That's a great question! While I cover many election topics, I might not have the specific answer you're looking for right now. Try asking about:<br><br>
    🔹 <em>"How do I register?"</em><br>
    🔹 <em>"When is the next election?"</em><br>
    🔹 <em>"What documents do I need?"</em><br>
    🔹 <em>"Where is my polling station?"</em><br>
    🔹 <em>"Check my eligibility"</em><br>
    🔹 <em>"Types of elections"</em><br>
    🔹 <em>"How does mail-in voting work?"</em>`;
}

function appendMessage(text, isUser, skipSave = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
    const avatarIcon = isUser ? 'person' : 'smart_toy';

    // Use user's photo for avatar if available
    let avatarContent = `<span class="material-symbols-outlined" aria-hidden="true">${avatarIcon}</span>`;
    if (isUser && currentUser?.photoURL) {
        avatarContent = `<img src="${DOMPurify.sanitize(currentUser.photoURL)}" alt="Your Avatar" style="width:100%;height:100%;border-radius:12px;object-fit:cover;">`;
    }

    // Security: Basic sanitization of user input before rendering
    const safeText = isUser ? DOMPurify.sanitize(text) : text; // Bot text is HTML from our system

    msgDiv.innerHTML = `
        <div class="msg-avatar">${avatarContent}</div>
        <div class="msg-bubble">
            <p>${safeText}</p>
        </div>
    `;

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Announce bot messages to screen readers (if TTS isn't taking over)
    if (!isUser && !ttsEnabled) {
        announceToScreenReader('New message from assistant.');
    }

    // Text-to-Speech for bot messages
    if (!isUser && ttsEnabled) {
        speakText(text.replace(/<[^>]*>/g, '')); // Strip HTML tags for TTS
    }

    // Save to Firebase Realtime Database (skip if loading history)
    if (!skipSave) {
        saveChatMessage(isUser ? 'user' : 'assistant', text.replace(/<[^>]*>/g, ''));
        trackEvent('chat', isUser ? 'user_message' : 'bot_response');
    }
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="msg-avatar"><span class="material-symbols-outlined">smart_toy</span></div>
        <div class="msg-bubble">
            <div class="typing-indicator"><span></span><span></span><span></span></div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const ind = document.getElementById('typing-indicator');
    if (ind) ind.remove();
}

// ─── Gemini API: Send message to Gemini ─────────────────────────────
async function getGeminiResponse(userMessage) {
    // Add user message to conversation history
    conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });

    // Ensure we don't exceed reasonable limits
    if(conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
    }

    const requestBody = {
        system_instruction: {
            parts: [{ text: GEMINI_SYSTEM_PROMPT }]
        },
        contents: conversationHistory,
        generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 512
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
        ]
    };

    const response = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('Gemini API error:', response.status, errData);
        throw new Error(`Gemini API returned ${response.status}`);
    }

    const data = await response.json();
    const botText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!botText) throw new Error('Empty response from Gemini');

    // Add bot response to conversation history (keep last 20 turns to manage tokens)
    conversationHistory.push({ role: 'model', parts: [{ text: botText }] });
    if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
    }

    return botText;
}

async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage(text, true);
    chatInput.value = '';
    showTypingIndicator();

    // Try Gemini API first, fall back to keyword matching
    const isGeminiConfigured = GEMINI_API_KEY && GEMINI_API_KEY !== 'PASTE_YOUR_GEMINI_API_KEY_HERE';

    if (isGeminiConfigured) {
        try {
            const response = await getGeminiResponse(text);
            removeTypingIndicator();
            // Convert markdown-style formatting to HTML
            const formatted = response
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');
            appendMessage(formatted, false);
        } catch (err) {
            console.warn('Gemini API failed, using keyword fallback:', err.message);
            removeTypingIndicator();
            const fallback = getBotResponse(text);
            appendMessage(fallback, false);
        }
    } else {
        // Keyword-based fallback (no API key configured)
        setTimeout(() => {
            removeTypingIndicator();
            const response = getBotResponse(text);
            appendMessage(response, false);
        }, 800 + Math.random() * 400);
    }
}

// Prevent spamming the send button (Efficiency)
const handleSendDebounced = debounce(handleSend, 500);

sendBtn.addEventListener('click', handleSendDebounced);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendDebounced();
});

// ====================================================================
// 5. WEB SPEECH API — Voice Input (Speech-to-Text)
// ====================================================================
let recognition = null;
let isListening = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        handleSend();
    };

    recognition.onstart = () => {
        isListening = true;
        voiceInputBtn.classList.add('active');
        voiceInputBtn.setAttribute('aria-pressed', 'true');
        micIcon.textContent = 'mic_off';
        showToast('Listening... Speak now.', 'info');
        announceToScreenReader('Voice input started. Please speak your question.');
    };

    recognition.onend = () => {
        isListening = false;
        voiceInputBtn.classList.remove('active');
        voiceInputBtn.setAttribute('aria-pressed', 'false');
        micIcon.textContent = 'mic';
        announceToScreenReader('Voice input ended.');
    };

    recognition.onerror = () => {
        isListening = false;
        voiceInputBtn.classList.remove('active');
        voiceInputBtn.setAttribute('aria-pressed', 'false');
        micIcon.textContent = 'mic';
        showToast('Voice input error. Please try again.', 'error');
    };
}

voiceInputBtn.addEventListener('click', () => {
    if (!recognition) {
        showToast('Voice input is not supported in this browser.', 'error');
        return;
    }
    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
});

// ====================================================================
// 6. WEB SPEECH API — Text-to-Speech
// ====================================================================
ttsToggle.addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    ttsToggle.querySelector('.material-symbols-outlined').textContent = ttsEnabled ? 'volume_up' : 'volume_off';
    ttsToggle.setAttribute('aria-pressed', ttsEnabled.toString());
    showToast(`Text-to-Speech ${ttsEnabled ? 'enabled' : 'disabled'}`, 'info');
    announceToScreenReader(`Text to speech ${ttsEnabled ? 'enabled' : 'disabled'}`);
});

function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
}

// ====================================================================
// 7. GOOGLE CALENDAR INTEGRATION
// ====================================================================
function addToGoogleCalendar(title, dateStr) {
    const date = new Date(dateStr);
    const startDate = date.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 8);
    const endDate = startDate; // All-day event

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate}/${startDate}&details=${encodeURIComponent('Reminder from CivicConnect Election Assistant')}&sf=true&output=xml`;
    window.open(url, '_blank');
    showToast(`"${title}" opened in Google Calendar!`, 'success');
}

// Calendar mini buttons on timeline
document.querySelectorAll('.cal-mini-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const eventName = btn.dataset.event;
        const eventDate = btn.dataset.date;
        addToGoogleCalendar(eventName, eventDate);
    });
});

// Add All to Calendar button
document.getElementById('add-gcal-btn')?.addEventListener('click', () => {
    addToGoogleCalendar('Registration Deadline — CivicConnect', '2026-05-01');
    trackEvent('calendar', 'add_all_events');
});

// ====================================================================
// 8. COUNTDOWN TIMERS
// ====================================================================
function startCountdowns() {
    function updateCountdown(elementId, targetDate) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const now = new Date();
        const target = new Date(targetDate);
        let diff = target - now;

        if (diff <= 0) {
            el.innerHTML = '<span class="badge success">Event has passed</span>';
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        diff %= (1000 * 60 * 60 * 24);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        diff %= (1000 * 60 * 60);
        const mins = Math.floor(diff / (1000 * 60));
        diff %= (1000 * 60);
        const secs = Math.floor(diff / 1000);

        el.innerHTML = `
            <div class="countdown-unit"><div class="number">${days}</div><div class="label">Days</div></div>
            <div class="countdown-unit"><div class="number">${hours}</div><div class="label">Hours</div></div>
            <div class="countdown-unit"><div class="number">${mins}</div><div class="label">Mins</div></div>
            <div class="countdown-unit"><div class="number">${secs}</div><div class="label">Secs</div></div>
        `;
    }

    const countdownInterval = setInterval(() => {
        updateCountdown('countdown-registration', '2026-05-01T00:00:00');
        updateCountdown('countdown-election', '2026-06-02T00:00:00');
    }, 1000);

    // Initial call
    updateCountdown('countdown-registration', '2026-05-01T00:00:00');
    updateCountdown('countdown-election', '2026-06-02T00:00:00');
    
    // Clear interval on view change if needed (Memory Management)
    // For SPA, it might run infinitely, but good practice to keep the ref
    window._countdownInterval = countdownInterval;
}

// ====================================================================
// 9. GOOGLE MAPS — Dynamic Search
// ====================================================================
document.getElementById('map-search-btn')?.addEventListener('click', () => {
    const query = document.getElementById('map-search-input').value.trim();
    if (!query) {
        announceToScreenReader('Please enter a ZIP code or address to search.');
        return showToast('Please enter a ZIP code or address.', 'error');
    }

    // Security: sanitize query before injecting into URL
    const safeQuery = encodeURIComponent(DOMPurify.sanitize(query));

    const frame = document.getElementById('google-map-frame');
    frame.src = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d50000!2d0!3d0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s${safeQuery}!5e0!3m2!1sen!2sus`;

    // Simulate a polling station for the searched location
    document.getElementById('station-name').textContent = `Polling Station near ${DOMPurify.sanitize(query)}`;
    document.getElementById('station-distance').textContent = `${(Math.random() * 5 + 0.3).toFixed(1)} miles away`;
    document.getElementById('station-address').textContent = `Nearest station for: ${query}`;
    showToast('Searching for polling stations...', 'info');

    // Track search in Analytics & save to RTDB
    trackEvent('maps', 'polling_search', query);
    saveUserInteraction('polling_search', { query: query });
});

// Google Maps directions
document.getElementById('get-directions-btn')?.addEventListener('click', () => {
    const address = document.getElementById('station-address').textContent;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
});

// ====================================================================
// 10. ELIGIBILITY CHECKER
// ====================================================================
document.getElementById('check-eligibility-btn')?.addEventListener('click', () => {
    const checks = [
        document.getElementById('elig-citizen').checked,
        document.getElementById('elig-age').checked,
        document.getElementById('elig-resident').checked,
        document.getElementById('elig-felon').checked
    ];

    const result = document.getElementById('elig-result');
    const passContainer = document.getElementById('voter-pass-container');
    const passCard = document.getElementById('voter-pass-card');
    
    result.classList.remove('hidden', 'eligible', 'not-eligible');

    if (checks.every(Boolean)) {
        result.classList.add('eligible');
        result.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">check_circle</span> You appear to be eligible to vote! Proceed to the registration steps below.';
        showToast('Eligibility check passed! ✅', 'success');
        announceToScreenReader('Eligibility check passed. You appear to be eligible to vote.');
        saveEligibilityResponse(true, { citizen: true, age: true, resident: true, felon: true });
        trackEvent('eligibility', 'check_passed');
        
        // Show Voter Pass container
        passContainer.classList.remove('hidden');
    } else {
        result.classList.add('not-eligible');
        const missing = [];
        if (!checks[0]) missing.push('citizenship');
        if (!checks[1]) missing.push('age requirement');
        if (!checks[2]) missing.push('residency');
        if (!checks[3]) missing.push('felony status');
        result.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">cancel</span> Not all criteria met. Please review: ${missing.join(', ')}.`;
        announceToScreenReader(`Eligibility check failed. Missing criteria: ${missing.join(', ')}.`);
        saveEligibilityResponse(false, { citizen: checks[0], age: checks[1], resident: checks[2], felon: checks[3] });
        trackEvent('eligibility', 'check_failed', missing.join(','));
        
        // Hide Voter pass if failed
        passContainer.classList.add('hidden');
        passCard.classList.add('hidden');
    }
});

// Digital Voter Pass Generation
document.getElementById('generate-pass-btn')?.addEventListener('click', () => {
    const passCard = document.getElementById('voter-pass-card');
    const passName = document.getElementById('voter-pass-name');
    const passId = document.getElementById('voter-pass-id');
    
    // Animate in
    passCard.classList.remove('hidden');
    setTimeout(() => {
        passCard.style.transform = 'scale(1)';
    }, 50);
    
    const name = currentUser?.displayName || 'Guest Citizen';
    passName.textContent = DOMPurify.sanitize(name);
    
    // Generate a random ID format: VTR-XXXX-YYYY
    const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randomYear = new Date().getFullYear();
    passId.textContent = `ID: VTR-${randomId}-${randomYear}`;
    
    showToast('Digital Voter Pass Generated!', 'success');
    announceToScreenReader('Digital Voter Pass Generated.');
    trackEvent('engagement', 'voter_pass_generated');
});

// Registration form button
document.getElementById('open-reg-form-btn')?.addEventListener('click', () => {
    // Link to National Voter Registration form or a Google Form
    window.open('https://vote.gov/', '_blank');
    showToast('Opening voter registration portal...', 'success');
});

// ====================================================================
// 11. GOOGLE CHARTS
// ====================================================================
function loadGoogleCharts() {
    if (typeof google === 'undefined' || !google.charts) {
        console.log('Google Charts not loaded yet.');
        return;
    }

    google.charts.load('current', {
        packages: ['corechart', 'bar'],
        callback: drawAllCharts
    });
}

function drawAllCharts() {
    drawTurnoutChart();
    drawAgeChart();
    drawMethodChart();
    drawTrendChart();
}

function getChartTextStyle() {
    return { color: '#94a3b8', fontSize: 13, fontName: 'Outfit' };
}

function drawTurnoutChart() {
    const data = google.visualization.arrayToDataTable([
        ['Year', 'Turnout %', { role: 'style' }],
        ['2012', 54.9, '#3b82f6'],
        ['2014', 36.4, '#64748b'],
        ['2016', 55.7, '#8b5cf6'],
        ['2018', 49.3, '#64748b'],
        ['2020', 66.8, '#22c55e'],
        ['2022', 46.8, '#64748b'],
        ['2024', 62.1, '#3b82f6']
    ]);

    const options = {
        backgroundColor: 'transparent',
        chartArea: { width: '80%', height: '75%' },
        legend: 'none',
        hAxis: { textStyle: getChartTextStyle(), gridlines: { color: 'transparent' } },
        vAxis: { textStyle: getChartTextStyle(), gridlines: { color: 'rgba(255,255,255,0.05)' }, minValue: 0, maxValue: 100, format: '#\'%\'' },
        bar: { groupWidth: '60%' },
        animation: { startup: true, duration: 800, easing: 'out' }
    };

    const chart = new google.visualization.ColumnChart(document.getElementById('turnout-chart'));
    chart.draw(data, options);
}

function drawAgeChart() {
    const data = google.visualization.arrayToDataTable([
        ['Age Group', 'Registered Voters'],
        ['18-24', 22],
        ['25-34', 28],
        ['35-44', 24],
        ['45-54', 18],
        ['55-64', 15],
        ['65+', 13]
    ]);

    const options = {
        backgroundColor: 'transparent',
        chartArea: { width: '90%', height: '85%' },
        pieHole: 0.45,
        pieSliceBorderColor: 'transparent',
        colors: ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'],
        legend: { position: 'right', textStyle: { color: '#94a3b8', fontSize: 12, fontName: 'Outfit' } },
        pieSliceTextStyle: { color: 'white', fontSize: 12 },
        animation: { startup: true, duration: 800 }
    };

    const chart = new google.visualization.PieChart(document.getElementById('age-chart'));
    chart.draw(data, options);
}

function drawMethodChart() {
    const data = google.visualization.arrayToDataTable([
        ['Method', 'Percentage', { role: 'style' }],
        ['In-Person', 45, '#3b82f6'],
        ['Mail-In', 32, '#8b5cf6'],
        ['Early Voting', 18, '#22c55e'],
        ['Provisional', 5, '#f59e0b']
    ]);

    const options = {
        backgroundColor: 'transparent',
        chartArea: { width: '75%', height: '75%' },
        legend: 'none',
        hAxis: { textStyle: getChartTextStyle(), gridlines: { color: 'rgba(255,255,255,0.05)' }, format: '#\'%\'' },
        vAxis: { textStyle: getChartTextStyle() },
        bars: 'horizontal',
        bar: { groupWidth: '65%' },
        animation: { startup: true, duration: 800, easing: 'out' }
    };

    const chart = new google.visualization.BarChart(document.getElementById('method-chart'));
    chart.draw(data, options);
}

function drawTrendChart() {
    const data = google.visualization.arrayToDataTable([
        ['Month', 'New Registrations', 'Updates'],
        ['Jan', 45000, 12000],
        ['Feb', 52000, 15000],
        ['Mar', 78000, 23000],
        ['Apr', 110000, 34000],
        ['May', 185000, 56000],
        ['Jun', 92000, 28000]
    ]);

    const options = {
        backgroundColor: 'transparent',
        chartArea: { width: '85%', height: '75%' },
        colors: ['#3b82f6', '#8b5cf6'],
        legend: { position: 'top', textStyle: { color: '#94a3b8', fontSize: 13, fontName: 'Outfit' } },
        hAxis: { textStyle: getChartTextStyle(), gridlines: { color: 'transparent' } },
        vAxis: { textStyle: getChartTextStyle(), gridlines: { color: 'rgba(255,255,255,0.05)' } },
        curveType: 'function',
        lineWidth: 3,
        pointSize: 6,
        animation: { startup: true, duration: 1000, easing: 'out' }
    };

    const chart = new google.visualization.LineChart(document.getElementById('trend-chart'));
    chart.draw(data, options);
}

// Debounce the resize event to prevent performance issues (Efficiency)
const handleResize = debounce(() => {
    if (typeof google !== 'undefined' && google.visualization) {
        drawAllCharts();
    }
}, 250);

window.addEventListener('resize', handleResize);

// ====================================================================
// 12. TOAST NOTIFICATIONS
// ====================================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    
    // Ensure message is safe
    const safeMessage = DOMPurify.sanitize(message);
    
    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    toast.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${icons[type] || 'info'}</span> ${safeMessage}`;
    
    container.appendChild(toast);
    
    // Auto cleanup memory
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400); // Wait for transition
    }, 4000);
}

// ====================================================================
// 13. CSS ANIMATION FOR SPINNER
// ====================================================================
const spinStyle = document.createElement('style');
spinStyle.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
document.head.appendChild(spinStyle);

// ====================================================================
// 14. GOOGLE ANALYTICS — Custom Event Tracking
// ====================================================================
// Tracks custom events to Google Analytics (gtag.js)
// Usage: trackEvent('category', 'action', 'label')
function trackEvent(category, action, label = '') {
    if (typeof gtag === 'function') {
        gtag('event', action, {
            event_category: category,
            event_label: label
        });
    }
    console.log(`[Analytics] ${category} > ${action} ${label ? '> ' + label : ''}`);
}

// Track page/view changes via Analytics
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        trackEvent('navigation', 'view_change', target);
    });
});

// ====================================================================
// 15. THEME SWITCHER
// ====================================================================
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
    let isLightMode = false;
    themeToggleBtn.addEventListener('click', () => {
        isLightMode = !isLightMode;
        const root = document.documentElement;
        
        if (isLightMode) {
            root.style.setProperty('--bg-dark', 'hsl(210, 40%, 96%)');
            root.style.setProperty('--bg-darker', 'hsl(210, 40%, 98%)');
            root.style.setProperty('--text-main', 'hsl(222, 47%, 11%)');
            root.style.setProperty('--text-dim', 'hsl(215, 20%, 35%)');
            root.style.setProperty('--glass-bg', 'hsla(0, 0%, 100%, 0.8)');
            root.style.setProperty('--glass-border', 'hsla(0, 0%, 0%, 0.1)');
            root.style.setProperty('--border-color', 'hsla(0, 0%, 0%, 0.1)');
            
            // Fixes for visibility in Light Mode
            root.style.setProperty('--input-bg', 'hsla(0, 0%, 100%, 0.6)');
            root.style.setProperty('--sidebar-bg', 'hsla(210, 40%, 94%, 0.9)');
            root.style.setProperty('--hover-bg', 'hsla(0, 0%, 0%, 0.05)');
            
            document.getElementById('theme-icon').textContent = 'dark_mode';
            document.getElementById('theme-text').textContent = 'Dark Mode';
            showToast('Switched to Light Mode', 'info');
            trackEvent('engagement', 'theme_switched', 'light');
        } else {
            // Reset to dark mode (empty string removes inline style to fall back to CSS class)
            root.style.removeProperty('--bg-dark');
            root.style.removeProperty('--bg-darker');
            root.style.removeProperty('--text-main');
            root.style.removeProperty('--text-dim');
            root.style.removeProperty('--glass-bg');
            root.style.removeProperty('--glass-border');
            root.style.removeProperty('--border-color');
            
            root.style.removeProperty('--input-bg');
            root.style.removeProperty('--sidebar-bg');
            root.style.removeProperty('--hover-bg');
            
            document.getElementById('theme-icon').textContent = 'light_mode';
            document.getElementById('theme-text').textContent = 'Light Mode';
            showToast('Switched to Dark Mode', 'info');
            trackEvent('engagement', 'theme_switched', 'dark');
        }
    });
}
