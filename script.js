document.addEventListener("DOMContentLoaded", () => {
    // Normal, unencrypted password string
    const CORRECT_CODE = "15/12/2011"; 
    
    // Live Supabase Database Connection
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

    // Local profile picture upload selection handling
    if (pfpFileInput) {
        pfpFileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    userPfpBase64 = event.target.result;
                    if (pfpPreviewImg) {
                        pfpPreviewImg.src = userPfpBase64;
                        pfpPreviewImg.classList.remove("hidden");
                    }
                    if (pfpPreviewFallback) pfpPreviewFallback.classList.add("hidden");
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Check if user has visited before to bypass name creation screen
    if (!currentUsername) {
        if (nameScreen) nameScreen.classList.remove("hidden");
    } else {
        showPasswordScreen();
    }

    if (nameSubmitBtn) {
        nameSubmitBtn.addEventListener("click", () => {
            const enteredName = nameInput.value.trim();
            if (enteredName.length >= 2) {
                localStorage.setItem("teadrop_username", enteredName);
                if (userPfpBase64) {
                    localStorage.setItem("teadrop_pfp", userPfpBase64);
                } else {
                    localStorage.removeItem("teadrop_pfp");
                }
                currentUsername = enteredName;
                if (nameScreen) nameScreen.classList.add("hidden");
                showPasswordScreen();
            } else {
                if (nameErrorMsg) nameErrorMsg.className = "error-visible";
            }
        });
    }

    if (nameInput) {
        nameInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") nameSubmitBtn.click();
        });
    }

    function showPasswordScreen() {
        if (userGreeting) userGreeting.textContent = currentUsername;
        
        if (userPfpBase64 && authPfp) {
            authPfp.src = userPfpBase64;
            authPfp.classList.remove("hidden");
            if (authPfpFallback) authPfpFallback.classList.add("hidden");
        } else if (authPfpFallback) {
            authPfpFallback.textContent = currentUsername.charAt(0).toUpperCase();
            authPfpFallback.classList.remove("hidden");
            if (authPfp) authPfp.classList.add("hidden");
        }
        
        if (authScreen) authScreen.classList.remove("hidden");
        if (codeInput) codeInput.value = "";
    }

    if (changeNameBtn) {
        changeNameBtn.addEventListener("click", () => {
            if (authScreen) authScreen.classList.add("hidden");
            if (nameInput) nameInput.value = currentUsername;
            if (nameScreen) nameScreen.classList.remove("hidden");
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener("click", () => {
            const userInput = codeInput.value.trim();

            // Completely normal password check
            if (userInput === CORRECT_CODE) {
                try {
                    if (window.supabase) {
                        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                    }
                } catch (e) {
                    console.error("Database connection fault:", e);
                }
                transitionToMain();
            } else {
                if (errorMsg) errorMsg.className = "error-visible";
                if (codeInput) {
                    codeInput.style.borderColor = "#b13434";
                    setTimeout(() => { codeInput.style.borderColor = ""; }, 500);
                }
            }
        });
    }

    if (codeInput) {
        codeInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") submitBtn.click();
        });
    }

    function transitionToMain() {
        if (authScreen) authScreen.classList.add("hidden");
        if (mainScreen) mainScreen.classList.remove("hidden");

        if (supabase) {
            loadSavedComments();
            listenForLiveMessages();
        }
    }

    /* ==========================================================================
       WHATSAPP CHAT APPLICATION ENGINE
       ========================================================================== */

    function getBubbleColor(username) {
        // Lowercase standardization means Vikrant, vikrant, and VIKRANT use the same bubble colors
        const standard = username.trim().toLowerCase();
        let hash = 0;
        for (let i = 0; i < standard.length; i++) {
            hash = standard.charCodeAt(i) + ((hash << 5) - hash);
        }
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

        // Processes regular strings vs media attachments seamlessly
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
        if (commentsList) commentsList.appendChild(msgContainer);
        if (chatScroller) chatScroller.scrollTop = chatScroller.scrollHeight;
    }

    async function loadSavedComments() {
        if (!supabase) return;
        const { data } = await supabase.from('comments').select('username, text, pfp, created_at').order('created_at', { ascending: true });
        if (data && commentsList) {
            commentsList.innerHTML = "";
            data.forEach(msg => {
                const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                renderMessage(msg.username || "Anonymous", msg.text, msg.pfp, time);
            });
        }
    }

    function listenForLiveMessages() {
        if (!supabase) return;
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

    if (commentForm) {
        commentForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = commentInput.value.trim();
            if (text) { sendMessagePayload(text); commentInput.value = ""; }
        });
    }

    if (chatImageInput) {
        chatImageInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => { sendMessagePayload(event.target.result); };
                reader.readAsDataURL(file);
            }
        });
    }

    if (voiceRecordBtn) {
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
    }
});