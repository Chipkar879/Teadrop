document.addEventListener("DOMContentLoaded", () => {
    const CORRECT_CODE = "15/12/2011";
    
    // Live Supabase Database Connection
    const SUPABASE_URL = "https://zcnqrinkrxgjssvvpzmh.supabase.co"; 
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjbnFyaW5rcnhnanNzdnZwem1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NzM2NTIsImV4cCI6MjA5NzI0OTY1Mn0.sr7PE1awL-k-P5F5_vq8DRi9bgjfSs22aUMkquS4Q8A"; 
    let supabase = null;

    // A beautiful array of warm, distinct pastel colors to rotate through based on usernames
    const USER_COLORS = [
        "#f4ede7", // Pastel Warm Grey
        "#e8f1f5", // Pastel Soft Blue
        "#edf5e8", // Pastel Mint Sage
        "#f5ede8", // Pastel Light Coral
        "#f3e8f5", // Pastel Lavender
        "#f5f3e8", // Pastel Soft Sand
        "#e8f5f3"  // Pastel Pale Teal
    ];

    // Screen Layout Elements
    const nameScreen = document.getElementById("name-screen");
    const authScreen = document.getElementById("auth-screen");
    const mainScreen = document.getElementById("main-screen");

    // Interactive Form Controls
    const nameInput = document.getElementById("name-input");
    const nameSubmitBtn = document.getElementById("name-submit-btn");
    const nameErrorMsg = document.getElementById("name-error-msg");
    
    const userGreeting = document.getElementById("user-greeting");
    const codeInput = document.getElementById("code-input");
    const submitBtn = document.getElementById("submit-btn");
    const errorMsg = document.getElementById("error-msg");
    const changeNameBtn = document.getElementById("change-name-btn");

    // Feed Components
    const teaCup = document.querySelector(".tea-cup");
    const teaStream = document.getElementById("tea-stream");
    const feedContainer = document.getElementById("feed-container");
    const currentDateDisplay = document.getElementById("current-date-display");
    const newsContent = document.getElementById("news-content");
    
    const commentForm = document.getElementById("comment-form");
    const commentInput = document.getElementById("comment-input");
    const commentsList = document.getElementById("comments-list");

    // Initialize View Routine based on cached name string
    let currentUsername = localStorage.getItem("teadrop_username");

    if (!currentUsername) {
        nameScreen.classList.remove("hidden");
    } else {
        showPasswordScreen();
    }

    // Name Screen Form Controller Actions
    nameSubmitBtn.addEventListener("click", () => {
        const enteredName = nameInput.value.trim();
        if (enteredName.length >= 2) {
            localStorage.setItem("teadrop_username", enteredName);
            currentUsername = enteredName;
            nameScreen.classList.add("hidden");
            showPasswordScreen();
        } else {
            nameErrorMsg.className = "error-visible";
        }
    });

    nameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") nameSubmitBtn.click();
    });

    // Helper to transition to password entry gate
    function showPasswordScreen() {
        userGreeting.textContent = currentUsername;
        authScreen.classList.remove("hidden");
        codeInput.value = ""; 
    }

    // Allow user to clear cache and change name right from password panel
    changeNameBtn.addEventListener("click", () => {
        authScreen.classList.add("hidden");
        nameInput.value = currentUsername;
        nameScreen.classList.remove("hidden");
    });

    // Code Verification Handling
    submitBtn.addEventListener("click", () => {
        if (codeInput.value.trim() === CORRECT_CODE) {
            try {
                if (window.supabase) {
                    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                }
            } catch (e) {
                console.error("Database connection fault:", e);
            }
            transitionToMain();
        } else {
            errorMsg.className = "error-visible";
            codeInput.style.borderColor = "#b13434";
            setTimeout(() => { codeInput.style.borderColor = ""; }, 500);
        }
    });

    codeInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") submitBtn.click();
    });

    // Main Drop Animation Timelines
    function transitionToMain() {
        authScreen.classList.add("hidden");
        mainScreen.classList.remove("hidden");

        const todayStr = getFormattedDate();
        currentDateDisplay.textContent = todayStr;

        setTimeout(() => { teaCup.classList.add("cup-tip-pour"); }, 300);
        setTimeout(() => { teaStream.classList.add("spill-active"); }, 900);

        setTimeout(() => {
            fetchNewsContent(todayStr);
            if (supabase) {
                loadSavedComments();
            } else {
                commentsList.innerHTML = "<p>Global comments unavailable.</p>";
            }
            feedContainer.classList.add("feed-visible");
            teaStream.style.opacity = "0";
        }, 1600);
    }

    function getFormattedDate() {
        const date = new Date();
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }

    function fetchNewsContent(targetDate) {
        fetch("news.txt?v=" + new Date().getTime())
            .then(res => { if (!res.ok) throw new Error(); return res.text(); })
            .then(text => {
                const newsMap = parseNewsFile(text);
                newsContent.textContent = newsMap[targetDate] ? newsMap[targetDate].trim() : "No news available for today.";
            })
            .catch(() => { newsContent.textContent = "Could not fetch today's drop."; });
    }

    function parseNewsFile(text) {
        const lines = text.split(/\r?\n/);
        const newsData = {};
        let currentKeyDate = null;
        lines.forEach(line => {
            const clean = line.trim();
            if (!clean) return;
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
                currentKeyDate = clean;
                newsData[currentKeyDate] = "";
            } else if (currentKeyDate) {
                newsData[currentKeyDate] += (newsData[currentKeyDate] ? "\n" : "") + clean;
            }
        });
        return newsData;
    }

    /* ==========================================================================
       SUPABASE DATASTREAM WRITING & COLOR ROTATION
       ========================================================================== */

    // Custom coloring helper: maps a specific username string to a permanent index color from array
    function getBackgroundColorForUser(username) {
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % USER_COLORS.length;
        return USER_COLORS[index];
    }

    // Modern styled rendering including the User Name header tags
    function renderComment(username, text) {
        const blockColor = getBackgroundColorForUser(username);

        const itemWrapper = document.createElement("div");
        itemWrapper.className = "comment-item";
        itemWrapper.style.backgroundColor = blockColor;

        const nameHeader = document.createElement("span");
        nameHeader.className = "comment-user-header";
        nameHeader.textContent = username;

        const bodyText = document.createElement("p");
        bodyText.className = "comment-text-body";
        bodyText.textContent = text;

        itemWrapper.appendChild(nameHeader);
        itemWrapper.appendChild(bodyText);
        commentsList.insertBefore(itemWrapper, commentsList.firstChild);
    }

    async function loadSavedComments() {
        try {
            // Fetching both columns from your table asset
            const { data, error } = await supabase
                .from('comments')
                .select('username, text')
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data) {
                commentsList.innerHTML = "";
                data.forEach(comment => {
                    // Falls back to "Anonymous" if old records have a blank column
                    renderComment(comment.username || "Anonymous", comment.text);
                });
            }
        } catch (err) {
            console.error("Fetch failure:", err.message);
        }
    }

    async function saveCommentToStorage(username, text) {
        try {
            const { error } = await supabase
                .from('comments')
                .insert([{ username: username, text: text }]);
            if (error) throw error;
        } catch (err) {
            console.error("Save failure:", err.message);
        }
    }

    commentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const commentText = commentInput.value.trim();
        
        if (commentText) {
            renderComment(currentUsername, commentText);
            commentInput.value = "";
            if (supabase) {
                await saveCommentToStorage(currentUsername, commentText);
            }
        }
    });
});