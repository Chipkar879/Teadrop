document.addEventListener("DOMContentLoaded", () => {
    // Updated Robust Code Verification Handling
    submitBtn.addEventListener("click", () => {
        const userInput = codeInput.value.trim();
        
        // This checks "" safely by looking at its reversed string layout
        if (userInput.split("").reverse().join("") === "1102/21/51") {
            supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
            authScreen.classList.add("hidden");
            mainScreen.classList.remove("hidden");
            if (supabase) { 
                loadSavedComments(); 
                listenForLiveMessages(); 
            }
        } else {
            errorMsg.className = "error-visible";
            codeInput.style.borderColor = "#b13434";
            setTimeout(() => { codeInput.style.borderColor = ""; }, 500);
        }
    });
    const SUPABASE_URL = "https://zcnqrinkrxgjssvvpzmh.supabase.co"; 
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjbnFyaW5rcnhnanNzdnZwem1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NzM2NTIsImV4cCI6MjA5NzI0OTY1Mn0.sr7PE1awL-k-P5F5_vq8DRi9bgjfSs22aUMkquS4Q8A"; 
    let supabase = null;

    const USER_COLORS = ["#b5e2fa", "#edafb8", "#f4e285", "#b4e197", "#d8b4f8", "#fbc7a4", "#97dece"];

    // App Layout Views
    const nameScreen = document.getElementById("name-screen");
    const authScreen = document.getElementById("auth-screen");
    const mainScreen = document.getElementById("main-screen");

    // Profile Setup Elements
    const nameInput = document.getElementById("name-input");
    const nameSubmitBtn = document.getElementById("name-submit-btn");
    const nameErrorMsg = document.getElementById("name-error-msg");
    const pfpFileInput = document.getElementById("pfp-file-input");
    const pfpPreviewImg = document.getElementById("pfp-preview-img");
    const pfpPreviewFallback = document.getElementById("pfp-preview-fallback");

    // Login Gate Elements
    const userGreeting = document.getElementById("user-greeting");
    const codeInput = document.getElementById("code-input");
    const submitBtn = document.getElementById("submit-btn");
    const errorMsg = document.getElementById("error-msg");
    const changeNameBtn = document.getElementById("change-name-btn");
    const authPfp = document.getElementById("auth-pfp");
    const authPfpFallback = document.getElementById("auth-pfp-fallback");

    // Chat Workspaces
    const commentsList = document.getElementById("comments-list");
    const commentForm = document.getElementById("comment-form");
    const commentInput = document.getElementById("comment-input");
    const chatScroller = document.getElementById("chat-scroller");
    const chatImageInput = document.getElementById("chat-image-input");
    const voiceRecordBtn = document.getElementById("voice-record-btn");

    // States
    let currentUsername = localStorage.getItem("teadrop_username") || "";
    let userPfpBase64 = localStorage.getItem("teadrop_pfp") || "";
    let mediaRecorder = null;
    let audioChunks = [];

    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);                    
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    pfpFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                userPfpBase64 = event.target.result;
                pfpPreviewImg.src = userPfpBase64;
                pfpPreviewImg.classList.remove("hidden");
                pfpPreviewFallback.classList.add("hidden");
            };
            reader.readAsDataURL(file);
        }
    });

    if (!currentUsername) {
        nameScreen.classList.remove("hidden");
    } else {
        showPasswordScreen();
    }

    nameSubmitBtn.addEventListener("click", () => {
        const enteredName = nameInput.value.trim();
        if (enteredName.length >= 2) {
            localStorage.setItem("teadrop_username", enteredName);
            if (userPfpBase64) localStorage.setItem("teadrop_pfp", userPfpBase64);
            currentUsername = enteredName;
            nameScreen.classList.add("hidden");
            showPasswordScreen();
        } else {
            nameErrorMsg.className = "error-visible";
        }
    });

    function showPasswordScreen() {
        userGreeting.textContent = currentUsername;
        if (userPfpBase64) {
            authPfp.src = userPfpBase64;
            authPfp.classList.remove("hidden");
            authPfpFallback.classList.add("hidden");
        } else {
            authPfpFallback.textContent = currentUsername.charAt(0).toUpperCase();
            authPfpFallback.classList.remove("hidden");
            authPfp.classList.add("hidden");
        }
        authScreen.classList.remove("hidden");
    }

    changeNameBtn.addEventListener("click", () => {
        authScreen.classList.add("hidden");
        nameScreen.classList.remove("hidden");
    });

    submitBtn.addEventListener("click", async () => {
        const cleanHash = await sha256(codeInput.value.trim());
        if (cleanHash === HASHED_CODE) {
            supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
            authScreen.classList.add("hidden");
            mainScreen.classList.remove("hidden");
            if (supabase) { loadSavedComments(); listenForLiveMessages(); }
        } else {
            errorMsg.className = "error-visible";
        }
    });

    /* ==========================================================================
       WHATSAPP CHAT FUNCTIONS WITH VOICE AND IMAGE FEATURES
       ========================================================================== */

    function getBubbleColor(username) {
        const standard = username.trim().toLowerCase();
        let hash = 0;
        for (let i = 0; i < standard.length; i++) hash = standard.charCodeAt(i) + ((hash << 5) - hash);
        return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
    }

    function renderMessage(username, text, pfp, timestampStr) {
        const isSelf = username.trim().toLowerCase() === currentUsername.trim().toLowerCase();
        const msgContainer = document.createElement("div");
        msgContainer.className = `msg-container ${isSelf ? 'outgoing' : 'incoming'}`;

        if (!isSelf) {
            const avatar = document.createElement(pfp ? "img" : "div");
            avatar.className = "msg-avatar text-avatar";
            if (pfp) avatar.src = pfp; else avatar.textContent = username.charAt(0).toUpperCase();
            msgContainer.appendChild(avatar);
        }

        const bubble = document.createElement("div");
        bubble.className = "msg-bubble";
        if (!isSelf) bubble.style.backgroundColor = getBubbleColor(username);

        const author = document.createElement("span");
        author.className = "msg-author-tag";
        author.style.color = "#128c7e";
        author.textContent = username;
        if (!isSelf) bubble.appendChild(author);

        // Check if message payload is an Image data URI or an Audio data URI
        if (text.startsWith("data:image")) {
            const img = document.createElement("img");
            img.className = "msg-media-img";
            img.src = text;
            bubble.appendChild(img);
        } else if (text.startsWith("data:audio")) {
            const audio = document.createElement("audio");
            audio.controls = true;
            audio.src = text;
            audio.style.marginTop = "6px";
            bubble.appendChild(audio);
        } else {
            const p = document.createElement("p");
            p.className = "msg-text-payload";
            p.textContent = text;
            bubble.appendChild(p);
        }

        const time = document.createElement("span");
        time.className = "msg-time-stamp";
        time.textContent = timestampStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        bubble.appendChild(time);

        msgContainer.appendChild(bubble);
        commentsList.appendChild(msgContainer);
        chatScroller.scrollTop = chatScroller.scrollHeight;
    }

    async function loadSavedComments() {
        const { data } = await supabase.from('comments').select('username, text, pfp, created_at').order('created_at', { ascending: true });
        if (data) {
            commentsList.innerHTML = "";
            data.forEach(msg => {
                const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                renderMessage(msg.username || "Anonymous", msg.text, msg.pfp, time);
            });
        }
    }

    function listenForLiveMessages() {
        supabase.channel('public:comments').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
            const fresh = payload.new;
            if (fresh.username.trim().toLowerCase() !== currentUsername.trim().toLowerCase()) {
                const time = new Date(fresh.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                renderMessage(fresh.username, fresh.text, fresh.pfp, time);
            }
        }).subscribe();
    }

    async function sendMessagePayload(payloadText) {
        renderMessage(currentUsername, payloadText, userPfpBase64);
        if (supabase) {
            await supabase.from('comments').insert([{ username: currentUsername, text: payloadText, pfp: userPfpBase64 }]);
        }
    }

    commentForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = commentInput.value.trim();
        if (text) { sendMessagePayload(text); commentInput.value = ""; }
    });

    // Image Upload Feature Inside Chat Bar
    chatImageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => { sendMessagePayload(event.target.result); };
            reader.readAsDataURL(file);
        }
    });

    // Voice Notes Recording Feature Inside Chat Bar
    voiceRecordBtn.addEventListener("click", async () => {
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.addEventListener("dataavailable", e => audioChunks.push(e.data));
                mediaRecorder.addEventListener("stop", () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                    const reader = new FileReader();
                    reader.onload = (event) => { sendMessagePayload(event.target.result); };
                    reader.readAsDataURL(audioBlob);
                    
                    // Stop mic access tracks gently
                    stream.getTracks().forEach(track => track.stop());
                });

                mediaRecorder.start();
                voiceRecordBtn.classList.add("recording-active");
            } catch (err) { alert("Microphone access denied."); }
        } else {
            mediaRecorder.stop();
            voiceRecordBtn.classList.remove("recording-active");
        }
    });
});