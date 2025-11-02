// ====================== GLOBAL FUNCTIONS ======================

// Redirect based on account type (login/signup)
function goToLogin(type) {
    // Consolidated logic for clarity
    window.location.href = type === 'lawyer' ? '/lawyer/login' : '/login';
}

// ====================== LAWYER DIRECTORY ======================

async function fetchAndRenderLawyers(query = "") {
    const tableBody = document.getElementById('lawyerTableBody');
    const statusMessage = document.getElementById('lawyerStatusMessage');
    const staticPlaceholder = document.getElementById('staticLawyerPlaceholder'); // Target the static HTML placeholder

    if (!tableBody || !statusMessage) return;

    // 1. Hide the static placeholder immediately (Fixes the visible conflict)
    if (staticPlaceholder) staticPlaceholder.style.display = 'none';

    // 2. Clear previous table content and set loading message
    tableBody.innerHTML = '';
    statusMessage.textContent = query
        ? `Searching for "${query}"...`
        : 'Loading all available lawyers...';

    try {
        const response = await fetch(`/api/lawyers?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const lawyers = data.lawyers || [];

        if (!lawyers.length) {
            statusMessage.textContent = `No lawyers found matching "${query || 'your criteria'}" in the database.`;
            return;
        }

        lawyers.forEach(lawyer => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = lawyer.name;
            row.insertCell().textContent = lawyer.expertise;
            
            // NOTE: The 'email' field is crucial here for the 'Action' link.
            const actionCell = row.insertCell();
            
            // 💡 CURRENT IMPLEMENTATION: Connect button placeholder
            actionCell.innerHTML = `
                <button class="contact-button" data-email="${lawyer.email}">
                    <i class="fas fa-handshake"></i> Connect
                </button>`;
        });

        statusMessage.textContent = `${lawyers.length} lawyer(s) found.`;
        
        // After rendering, initialize the 'Connect' buttons (ready for the next step)
        initializeConnectButtons(); 

    } catch (err) {
        console.error('Error fetching lawyers:', err);
        statusMessage.textContent = 'Error loading lawyer data. Please check the server connection.';
    }
}

function searchLawyers() {
    const searchInput = document.getElementById('lawyerSearchInput');
    if (searchInput) fetchAndRenderLawyers(searchInput.value);
}


function initializeConnectButtons() {
    // This function will be completed in the next step to add email functionality
    // Currently, it's just a placeholder to ensure the buttons are ready.
    const connectButtons = document.querySelectorAll('.contact-button');
    connectButtons.forEach(button => {
        const email = button.dataset.email;
        if (email) {
            button.addEventListener('click', () => {
                window.location.href = `mailto:${email}?subject=Legal%20Inquiry%20from%20LawPilot%20User&body=Dear%20${email},%0A%0AI%20am%20a%20LawPilot%20user%20and%20would%20like%20to%20consult%20you%20regarding%20a%20case%20in%20your%20area%20of%20expertise.%0A%0A[Please%20insert%20your%20query%20here]`;
            });
        }
    });
}


// ====================== DOCUMENT READY ======================

document.addEventListener('DOMContentLoaded', () => {

    // ---------- LOGIN/SIGNUP PAGE ----------
    const toggleButtons = document.querySelectorAll('.toggle-button');
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const accountType = btn.dataset.type;
                loginForm.action = accountType === 'lawyer' ? '/lawyer/login' : '/login';
            });
        });
    }

    // ---------- DASHBOARD PAGE ----------
    const dashboardBody = document.querySelector('.dashboard-body');
    if (!dashboardBody) return;

    // ========== DARK MODE ==========
    const darkModeToggle = document.getElementById('darkModeToggle');

    // Apply saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) darkModeToggle.checked = true;
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            const isDark = darkModeToggle.checked;
            document.body.classList.toggle('dark-mode', isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    // ========== LOGOUT ==========
    const logoutButton = document.querySelector('.logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            fetch('/logout', { method: 'POST' }).finally(() => sessionStorage.clear());
        });
    }

    // ========== CHAT SYSTEM ==========
    const chatMessagesContainer = document.getElementById('chatMessages');
    const chatTextarea = document.querySelector('.chat-textarea');
    const chatSendButton = document.querySelector('.chat-send-button');

    if (chatMessagesContainer && chatTextarea && chatSendButton) {
        const sendMessage = async () => {
            const messageText = chatTextarea.value.trim();
            if (!messageText) return;

            const timestamp = new Date().toLocaleTimeString('en-IN');
            const userBubble = document.createElement('div');
            userBubble.classList.add('chat-bubble', 'user-message');
            userBubble.innerHTML = `${messageText}<span class="message-timestamp">${timestamp}</span>`;
            chatMessagesContainer.appendChild(userBubble);

            chatTextarea.value = '';
            chatTextarea.style.height = 'auto';
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

            try {
                const res = await fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: messageText })
                });

                const data = await res.json();
                const aiBubble = document.createElement('div');
                aiBubble.classList.add('chat-bubble', 'ai-message');
                aiBubble.innerHTML = `${data.response}<span class="message-timestamp">${timestamp}</span>`;
                chatMessagesContainer.appendChild(aiBubble);
                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

            } catch (err) {
                console.error('Chat error:', err);
            }
        };

        chatSendButton.addEventListener('click', sendMessage);
        chatTextarea.addEventListener('keypress', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        chatTextarea.addEventListener('input', () => {
            chatTextarea.style.height = 'auto';
            chatTextarea.style.height = chatTextarea.scrollHeight + 'px';
        });
    }

    // ========== SIDEBAR NAVIGATION ==========
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const contentSections = document.querySelectorAll('.main-content-section');
    const findLawyerInput = document.getElementById('lawyerSearchInput');

    navItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const targetId = item.dataset.target;

            // Reset active states
            navItems.forEach(n => n.classList.remove('active'));
            contentSections.forEach(sec => {
                sec.classList.remove('active');
                sec.classList.add('hidden');
            });

            item.classList.add('active');
            const section = document.getElementById(targetId);
            if (section) {
                section.classList.add('active');
                section.classList.remove('hidden');
            }

            // Load Lawyer Directory dynamically
            if (targetId === 'findLawyerSection') {
                if (findLawyerInput) findLawyerInput.value = '';
                fetchAndRenderLawyers("");
            }
        });
    });

    if (findLawyerInput) {
        findLawyerInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchLawyers();
            }
        });
    }
    
    // ========== MY CASES SECTION ==========
    const showCasesBtn = document.getElementById("showCasesBtn");
    const casesContainer = document.getElementById("casesContainer");

    if (showCasesBtn && casesContainer) {
        showCasesBtn.addEventListener("click", async () => {
            casesContainer.innerHTML = "<p class='loading-text'>Loading your cases...</p>";

            try {
                const res = await fetch("/history");
                const data = await res.json();

                if (!data.history || data.history.length === 0) {
                    casesContainer.innerHTML = "<p class='no-cases-text'>No case history found.</p>";
                    return;
                }

                casesContainer.innerHTML = data.history.map(c => `
                    <div class="case-card">
                        <p class="case-time">🕒 ${c.timestamp}</p>
                        <p><strong>प्रश्न:</strong> ${c.query}</p>
                        <div class="case-response">${c.response}</div>
                    </div>
                `).join("");
            } catch (err) {
                console.error("Error loading cases:", err);
                casesContainer.innerHTML = "<p class='error-text'>⚠ Failed to load history.</p>";
            }
        });
    }
});