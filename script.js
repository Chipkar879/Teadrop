document.addEventListener("DOMContentLoaded", () => {
    const CORRECT_CODE = "15/12/2011"; 
    const SUPABASE_URL = "https://zcnqrinkrxgjssvvpzmh.supabase.co"; 
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjbnFyaW5rcnhnanNzdnZwem1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NzM2NTIsImV4cCI6MjA5NzI0OTY1Mn0.sr7PE1awL-k-P5F5_vq8DRi9bgjfSs22aUMkquS4Q8A"; 
    let supabase = null;

    const USER_COLORS = ["#fce1e4", "#e8bae2", "#bbf1fa", "#cff4d2", "#fef5c0", "#fbc4ab", "#daeaf6"];

    // UI Selectors
    const nameScreen = document.getElementById("name-screen");
    const authScreen = document.getElementById("auth-screen");
    const mainScreen = document.getElementById("main-screen");
    const nameInput = document.getElementById("name-input");
    const nameSubmitBtn = document.getElementById("name-submit-btn");
    const nameErrorMsg = document.getElementById("name-error-msg");
    const pfpFileInput = document.getElementById("pfp-file-input");
    const pfpPreviewImg = document.getElementById("pfp-preview-img");
    const pfpPreviewFallback = document.getElementById("pfp-preview-fallback");
    const userGreeting = document.getElementById("user-greeting");
    const codeInput = document.getElementById("code-input");
    const submitBtn = document.getElementById("submit-btn");
    const errorMsg = document.getElementById("error-msg");
    const changeNameBtn = document.getElementById("change-name-btn");
    const authPfp = document.getElementById("auth-pfp");
    const authPfpFallback = document.getElementById("auth-pfp-fallback");
    const commentsList = document.getElementById("comments-list");
    const commentForm = document.getElementById("comment-form");
    const commentInput = document.getElementById("comment-input");
    const chatScroller = document.getElementById("chat-scroller");
    const chatImageInput = document.getElementById("chat-image-input");
    const voiceRecordBtn = document.getElementById("voice-record-btn");

    let currentUsername = localStorage.getItem("teadrop_username") || "";
    let userPfpBase64 = localStorage.getItem("teadrop_pfp") || "";
    let mediaRecorder = null;
    let audioChunks = [];

    // Image Setup
    if (pfpFileInput) {
        pfpFileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    userPfpBase64 = event.target.result;
                    if (pfpPreviewImg) { pfpPreviewImg.src = userPfpBase64; pfpPreviewImg.classList.remove("hidden"); }
                    if (pfpPreviewFallback) pfpPreviewFallback.classList.add("hidden");
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (!currentUsername) { nameScreen.classList.remove("hidden"); } else { showPasswordScreen(); }

    nameSubmitBtn.addEventListener("click", () => {
        const enteredName = nameInput.value.trim();
        if (enteredName.length >= 2) {
            localStorage.setItem("teadrop_username", enteredName);
            if (userPfpBase64) localStorage.setItem("teadrop_pfp", userPfpBase64);
            currentUsername = enteredName;
            nameScreen.classList.add("hidden");
            showPasswordScreen();
        } else { nameErrorMsg.className = "error-visible"; }
    });

    function showPasswordScreen() {
        userGreeting.textContent = currentUsername;
        if (userPfpBase64 && authPfp) {
            authPfp.src = userPfpBase64; authPfp.classList.remove("hidden"); authPfpFallback.classList.add("hidden");
        } else if (authPfpFallback) {
            authPfpFallback.textContent = currentUsername.charAt(0).toUpperCase(); authPfpFallback.classList.remove("hidden"); authPfp.classList.add("hidden");
        }
        authScreen.classList.remove("hidden");
    }

    changeNameBtn.addEventListener("click", () => { authScreen.classList.add("hidden"); nameScreen.classList.remove("hidden"); });

    submitBtn.addEventListener("click", () => {
        if (codeInput.value.trim() === CORRECT_CODE) {
            supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
            authScreen.classList.add("hidden"); mainScreen.classList.remove("hidden");
            if (supabase) { loadSavedComments(); listenForLiveMessages(); }
        } else { errorMsg.className = "error-visible"; }
    });

    /* ==========================================================================
       WHATSAPP ENGINE & DYNAMIC LAYOUT
       ========================================================================== */

    function getBubbleColor(username) {
        const standard = username.trim().toLowerCase();
        let hash = 0;
        for (let i = 0; i < standard.length; i++) hash = standard.charCodeAt(i) + ((hash << 5) - hash);
        return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
    }

    function renderMessage(id, username, text, pfp, timestampStr) {
        const isSelf = username.trim().toLowerCase() === currentUsername.trim().toLowerCase();
        
        // Skip rendering if marked as hidden locally
        if (localStorage.getItem(`hide_msg_${id}`)) return;

        const msgContainer = document.createElement("div");
        msgContainer.className = `msg-container ${isSelf ? 'outgoing' : 'incoming'}`;
        msgContainer.dataset.id = id;

        if (!isSelf) {
            const avatar = document.createElement(pfp ? "img" : "div");
            avatar.className = "msg-avatar text-avatar";
            if (pfp) avatar.src = pfp; else avatar.textContent = username.charAt(0).toUpperCase();
            msgContainer.appendChild(avatar);
        }

        const bubble = document.createElement("div");
        bubble.className = "msg-bubble";
        bubble.style.backgroundColor = getBubbleColor(username);

        const author = document.createElement("span");
        author.className = "msg-author-tag";
        author.style.color = "#128c7e";
        author.textContent = username;
        if (!isSelf) bubble.appendChild(author);

        // Render contents safely
        if (text === "🚫 This message was deleted") {
            const p = document.createElement("p");
            p.className = "msg-text-payload";
            p.style.fontStyle = "italic";
            p.style.color = "#8696a0";
            p.innerHTML = `<i class="fa-solid fa-ban"></i> This message was deleted`;
            bubble.appendChild(p);
        } else if (text.startsWith("data:image")) {
            const img = document.createElement("img");
            img.className = "msg-media-img"; img.src = text; bubble.appendChild(img);
        } else if (text.startsWith("data:audio")) {
            // High-class voice player setup with no default browser controls
            const playerContainer = document.createElement("div");
            playerContainer.className = "custom-voice-player";

            const playBtn = document.createElement("button");
            playBtn.className = "vp-play-btn";
            playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;

            const track = document.createElement("div");
            track.className = "vp-slider-track";
            const progress = document.createElement("div");
            progress.className = "vp-slider-progress";
            track.appendChild(progress);

            const audioAudio = document.createElement("audio");
            audioAudio.src = text;

            playBtn.addEventListener("click", () => {
                if (audioAudio.paused) {
                    audioAudio.play(); playBtn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
                } else {
                    audioAudio.pause(); playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
                }
            });

            audioAudio.addEventListener("timeupdate", () => {
                const percent = (audioAudio.currentTime / audioAudio.duration) * 100;
                progress.style.width = `${percent}%`;
            });

            audioAudio.addEventListener("ended", () => { playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`; progress.style.width = "0%"; });

            playerContainer.appendChild(playBtn);
            playerContainer.appendChild(track);
            bubble.appendChild(playerContainer);
        } else {
            const p = document.createElement("p"); p.className = "msg-text-payload"; p.textContent = text; bubble.appendChild(p);
        }

        // WhatsApp Style Ticks & Timestamp
        const time = document.createElement("span");
        time.className = "msg-time-stamp";
        time.textContent = timestampStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Append blue read ticks status indicator
        time.innerHTML += ` <i class="fa-solid fa-check-double"></i>`;
        bubble.appendChild(time);

        // Hover Menu Configuration Option Elements
        if (text !== "🚫 This message was deleted") {
            const trigger = document.createElement("div");
            trigger.className = "msg-menu-trigger";
            trigger.innerHTML = `<i class="fa-solid fa-chevron-down"></i>`;
            
            trigger.addEventListener("click", (e) => {
                e.stopPropagation();
                // Clear active dropdown selections
                document.querySelectorAll(".msg-dropdown").forEach(d => d.remove());

                const menu = document.createElement("div");
                menu.className = "msg-dropdown";

                if (isSelf) {
                    const delEveryone = document.createElement("button");
                    delEveryone.textContent = "Delete for everyone";
                    delEveryone.addEventListener("click", async () => {
                        if (supabase) await supabase.from('comments').update({ text: "🚫 This message was deleted" }).eq('id', id);
                        menu.remove();
                    });
                    menu.appendChild(delEveryone);
                }

                const delMe = document.createElement("button");
                delMe.textContent = "Delete for me";
                delMe.addEventListener("click", () => {
                    localStorage.setItem(`hide_msg_${id}`, "true");
                    msgContainer.remove();
                });
                menu.appendChild(delMe);

                bubble.appendChild(menu);
            });
            bubble.appendChild(trigger);
        }

        msgContainer.appendChild(bubble);
        commentsList.appendChild(msgContainer);
        chatScroller.scrollTop = chatScroller.scrollHeight;
    }

    // Clear dropdowns on random frame target clicks
    document.addEventListener("click", () => document.querySelectorAll(".msg-dropdown").forEach(d => d.remove()));

    async function loadSavedComments() {
        if (!supabase) return;
        const { data } = await supabase.from('comments').select('id, username, text, pfp, created_at').order('created_at', { ascending: true });
        if (data && commentsList) {
            commentsList.innerHTML = "";
            data.forEach(msg => {
                const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                renderMessage(msg.id, msg.username || "Anonymous", msg.text, msg.pfp, time);
            });
        }
    }

    function listenForLiveMessages() {
        if (!supabase) return;
        supabase.channel('public:comments').on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
            loadSavedComments(); // Live re-sync for deletions/updates
        }).subscribe();
    }

    async function sendMessagePayload(payloadText) {
        if (supabase) {
            await supabase.from('comments').insert([{ username: currentUsername, text: payloadText, pfp: userPfpBase64 }]);
        }
    }

    commentForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = commentInput.value.trim();
        if (text) { sendMessagePayload(text); commentInput.value = ""; }
    });

    chatImageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => { sendMessagePayload(event.target.result); };
            reader.readAsDataURL(file);
        }
    });

    voiceRecordBtn.addEventListener("click", async () => {
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream); audioChunks = [];
                mediaRecorder.addEventListener("dataavailable", e => audioChunks.push(e.data));
                mediaRecorder.addEventListener("stop", () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                    const reader = new FileReader();
                    reader.onload = (event) => { sendMessagePayload(event.target.result); };
                    reader.readAsDataURL(audioBlob);
                    stream.getTracks().forEach(track => track.stop());
                });
                mediaRecorder.start(); voiceRecordBtn.classList.add("recording-active");
            } catch (err) { alert("Microphone access denied."); }
        } else { mediaRecorder.stop(); voiceRecordBtn.classList.remove("recording-active"); }
    });
});