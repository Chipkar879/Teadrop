document.addEventListener("DOMContentLoaded", () => {
    // Access code requirement
    const CORRECT_CODE = "15/12/2011";
    
    // DATABASE CONFIGURATION (Live Credentials Applied)
    const SUPABASE_URL = "https://zcnqrinkrxgjssvvpzmh.supabase.co"; 
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjbnFyaW5rcnhnanNzdnZwem1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NzM2NTIsImV4cCI6MjA5NzI0OTY1Mn0.sr7PE1awL-k-P5F5_vq8DRi9bgjfSs22aUMkquS4Q8A"; 
    let supabase = null;

    // Auth Screen UI Elements
    const authScreen = document.getElementById("auth-screen");
    const mainScreen = document.getElementById("main-screen");
    const codeInput = document.getElementById("code-input");
    const submitBtn = document.getElementById("submit-btn");
    const errorMsg = document.getElementById("error-msg");

    // Main Content UI Elements
    const teaCup = document.querySelector(".tea-cup");
    const teaStream = document.getElementById("tea-stream");
    const feedContainer = document.getElementById("feed-container");
    const currentDateDisplay = document.getElementById("current-date-display");
    const newsContent = document.getElementById("news-content");
    
    // Comments UI Elements
    const commentForm = document.getElementById("comment-form");
    const commentInput = document.getElementById("comment-input");
    const commentsList = document.getElementById("comments-list");

    // Handle authentication login verification
    submitBtn.addEventListener("click", () => {
        if (codeInput.value.trim() === CORRECT_CODE) {
            // Initialize database carefully right when the user logs in
            try {
                if (window.supabase) {
                    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                }
            } catch (e) {
                console.error("Database initialization failed:", e);
            }
            transitionToMain();
        } else {
            errorMsg.className = "error-visible";
            codeInput.style.borderColor = "#b13434";
            setTimeout(() => { codeInput.style.borderColor = ""; }, 500);
        }
    });

    // Support submitting access code via the Enter key
    codeInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") submitBtn.click();
    });

    // Process UI Transition and sequence pouring animations
    function transitionToMain() {
        authScreen.classList.add("hidden");
        mainScreen.classList.remove("hidden");

        const todayStr = getFormattedDate();
        currentDateDisplay.textContent = todayStr;

        // Step 1: Tip the cup
        setTimeout(() => {
            teaCup.classList.add("cup-tip-pour");
        }, 300);

        // Step 2: Drop stream
        setTimeout(() => {
            teaStream.classList.add("spill-active");
        }, 900);

        // Step 3: Show news content and load comments
        setTimeout(() => {
            fetchNewsContent(todayStr);
            
            // Only load comments if the database connected successfully
            if (supabase) {
                loadSavedComments();
            } else {
                commentsList.innerHTML = "<p style='color: #8a807a; font-size: 0.9rem;'>Global comments temporarily unavailable. Showing local mode.</p>";
            }
            
            feedContainer.classList.add("feed-visible");
            
            teaStream.style.opacity = "0";
            teaStream.style.transition = "opacity 0.5s ease";
        }, 1600);
    }

    function getFormattedDate() {
        const date = new Date();
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function fetchNewsContent(targetDate) {
        fetch("news.txt")
            .then(response => {
                if (!response.ok) throw new Error("Network issue.");
                return response.text();
            })
            .then(text => {
                const newsMap = parseNewsFile(text);
                if (newsMap[targetDate]) {
                    newsContent.textContent = newsMap[targetDate].trim();
                } else {
                    newsContent.textContent = "No news available for today.";
                }
            })
            .catch(err => {
                console.error(err);
                newsContent.textContent = "Could not fetch today's drop.";
            });
    }

    function parseNewsFile(text) {
        const lines = text.split(/\r?\n/);
        const newsData = {};
        let currentKeyDate = null;

        lines.forEach(line => {
            const cleanLine = line.trim();
            if (!cleanLine) return;
            const isDatePattern = /^\d{2}\/\d{2}\/\d{4}$/.test(cleanLine);
            if (isDatePattern) {
                currentKeyDate = cleanLine;
                newsData[currentKeyDate] = "";
            } else if (currentKeyDate) {
                newsData[currentKeyDate] += (newsData[currentKeyDate] ? "\n" : "") + cleanLine;
            }
        });
        return newsData;
    }

    /* ==========================================================================
       SUPABASE REAL-TIME DATABASE INTERACTION
       ========================================================================== */

    function renderComment(text) {
        const newComment = document.createElement("div");
        newComment.className = "comment-item";
        newComment.textContent = text;
        commentsList.insertBefore(newComment, commentsList.firstChild);
    }

    // Pull comments from the cloud database
    async function loadSavedComments() {
        try {
            const { data, error } = await supabase
                .from('comments')
                .select('text')
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (data) {
                commentsList.innerHTML = ""; // Clear loader text
                data.forEach(comment => {
                    renderComment(comment.text);
                });
            }
        } catch (err) {
            console.error("Error loading comments:", err.message);
        }
    }

    // Push new comment to the cloud database
    async function saveCommentToStorage(text) {
        try {
            const { error } = await supabase
                .from('comments')
                .insert([{ text: text }]);

            if (error) throw error;
        } catch (err) {
            console.error("Error saving comment:", err.message);
        }
    }

    commentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const commentText = commentInput.value.trim();
        
        if (commentText) {
            // Show it on screen immediately
            renderComment(commentText);
            commentInput.value = "";

            // Send to cloud if database is active
            if (supabase) {
                await saveCommentToStorage(commentText);
            }
        }
    });
});