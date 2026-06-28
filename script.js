document.addEventListener("DOMContentLoaded", () => {
    // High-class SHA-256 hash of "15/12/2011"
    const HASHED_CODE = "5c52bb88d8b87b7a1e05d26ff9841bb2f4cf4966d5b9b6574f1df91ff996f014";
    
    // Live Supabase Database Connection
    const SUPABASE_URL = "https://zcnqrinkrxgjssvvpzmh.supabase.co"; 
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjbnFyaW5rcnhnanNzdnZwem1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NzM2NTIsImV4cCI6MjA5NzI0OTY1Mn0.sr7PE1awL-k-P5F5_vq8DRi9bgjfSs22aUMkquS4Q8A"; 
    let supabase = null;

    const USER_COLORS = ["#b5e2fa", "#edafb8", "#f4e285", "#b4e197", "#d8b4f8", "#fbc7a4", "#97dece"];

    // App Screen Sections
    const nameScreen = document.getElementById("name-screen");
    const authScreen = document.getElementById("auth-screen");
    const mainScreen = document.getElementById("main-screen");

    // Profile Setup DOM Selectors
    const nameInput = document.getElementById("name-input");
    const nameSubmitBtn = document.getElementById("name-submit-btn");
    const nameErrorMsg = document.getElementById("name-error-msg");
    const pfpFileInput = document.getElementById("pfp-file-input");
    const pfpPreviewImg = document.getElementById("pfp-preview-img");
    const pfpPreviewFallback = document.getElementById("pfp-preview-fallback");

    // Password Gate UI
    const userGreeting = document.getElementById("user-greeting");
    const codeInput = document.getElementById("code-input");
    const submitBtn = document.getElementById("submit-btn");
    const errorMsg = document.getElementById("error-msg");
    const changeNameBtn = document.getElementById("change-name-btn");
    const authPfp = document.getElementById("auth-pfp");
    const authPfpFallback = document.getElementById("auth-pfp-fallback");

    // Chat Interface Components
    const commentsList = document.getElementById("comments-list");
    const commentForm = document.getElementById("comment-form");
    const commentInput = document.getElementById("comment-input");
    const chatScroller = document.getElementById("chat-scroller");

    // State Tracking
    let currentUsername = localStorage.getItem("teadrop_username") || "";
    let userPfpBase64 = localStorage.getItem("teadrop_pfp") || "";

    // Helper function to generate a SHA-256 hash using the browser's built-in Crypto API
    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);                    
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Image upload handler to convert picture files to compressed Base64 text strings
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

    // Determine initial application state routing on landing
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
        submitBtn.addEventListener("click", async () => {
            const inputClean = codeInput.value.trim();
            const inputHash = await sha256(inputClean);

            if (inputHash === HASHED_CODE) {
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
       WHATSAPP-STYLE COLOR SCHEME & REAL-TIME RECONCILIATION
       ========================================================================== */

    function getBubbleColor(username) {
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
            if (pfp) {
                const img = document.createElement("img");
                img.className = "msg-avatar";
                img.src = pfp;
                msgContainer.appendChild(img);
            } else {
                const fallback = document.createElement("div");
                fallback.className = "msg-avatar text-avatar";
                fallback.style.fontSize = "0.9rem";
                fallback.style.width = "32px";
                fallback.style.height = "32px";
                fallback.style.borderRadius = "50%";
                fallback.textContent = username.charAt(0).toUpperCase();
                msgContainer.appendChild(fallback);
            }
        }

        const bubble = document.createElement("div");
        bubble.className = "msg-bubble";
        if (!isSelf) {
            bubble.style.backgroundColor = getBubbleColor(username);
        }

        const authorTag = document.createElement("span");
        authorTag.className = "msg-author-tag";
        authorTag.style.color = "#128c7e";
        authorTag.textContent = username;

        const payload = document.createElement("p");
        payload.className = "msg-text-payload";
        payload.textContent = text;

        const timeStamp = document.createElement("span");
        timeStamp.className = "msg-time-stamp";
        timeStamp.textContent = timestampStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (!isSelf) bubble.appendChild(authorTag);
        bubble.appendChild(payload);
        bubble.appendChild(timeStamp);
        msgContainer.appendChild(bubble);

        if (commentsList) {
            commentsList.appendChild(msgContainer);
        }
        if (chatScroller) {
            chatScroller.scrollTop = chatScroller.scrollHeight;
        }
    }

    async function loadSavedComments() {
        try {
            const { data, error } = await supabase
                .from('comments')
                .select('username, text, pfp, created_at')
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data && commentsList) {
                commentsList.innerHTML = "";
                data.forEach(msg => {
                    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    renderMessage(msg.username || "Anonymous", msg.text, msg.pfp, time);
                });
            }
        } catch (err) {
            console.error("Fetch failure:", err.message);
        }
    }

    function listenForLiveMessages() {
        supabase
            .channel('public:comments')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
                const fresh = payload.new;
                if (fresh.username.trim().toLowerCase() !== currentUsername.trim().toLowerCase()) {
                    const time = new Date(fresh.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    renderMessage(fresh.username, fresh.text, fresh.pfp, time);
                }
            })
            .subscribe();
    }

    if (commentForm) {
        commentForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const msgText = commentInput.value.trim();
            if (!msgText) return;

            renderMessage(currentUsername, msgText, userPfpBase64);
            commentInput.value = "";

            if (supabase) {
                try {
                    await supabase.from('comments').insert([{ 
                        username: currentUsername, 
                        text: msgText, 
                        pfp: userPfpBase64 
                    }]);
                } catch (err) {
                    console.error("Broadcast failure:", err);
                }
            }
        });
    }
});