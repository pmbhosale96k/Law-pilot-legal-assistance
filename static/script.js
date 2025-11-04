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
                <button class="action-button contact-button" data-email="${lawyer.email}">
                    <i class="fas fa-handshake"></i> Connect
                </button>`;
        });

        statusMessage.textContent = `${lawyers.length} lawyer(s) found.`;
        
        // After rendering, initialize the 'Connect' buttons
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

// --- NEW FUNCTION: Send Connection Request (From Friend's Code) ---
async function sendConnectionRequest(lawyerName, lawyerEmail) {
    try {
        const response = await fetch('/api/request-connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                lawyer_name: lawyerName,
                lawyer_email: lawyerEmail,
                // The backend will fetch the current user details (name, email) from the session
            }),
        });

        const data = await response.json();

        if (response.ok) {
            // Success Pop-up
            alert(`✅ Request Sent! Your connection request has been successfully sent to ${lawyerName}. The lawyer will be able to view your last case query.`);
            
            // Optionally, disable the button after a successful request to prevent duplicates
            const button = document.querySelector(`.contact-button[data-email="${lawyerEmail}"]`);
            if (button) {
                button.innerHTML = '<i class="fas fa-check"></i> Request Sent';
                button.disabled = true;
                button.classList.add('request-sent'); // Add a class for different styling
            }
        } else {
            alert(`❌ Error sending request: ${data.error || 'Please try again.'}`);
        }
    } catch (error) {
        console.error('Network or server error:', error);
        alert('❌ An unexpected error occurred while contacting the server.');
    }
}

// --- MODIFIED FUNCTION: initializeConnectButtons (Uses new sendConnectionRequest) ---
function initializeConnectButtons() {
    const connectButtons = document.querySelectorAll('.contact-button');
    connectButtons.forEach(button => {
        // Prevent duplicate listeners, especially important for dynamic content
        button.removeEventListener('click', button.clickHandler); 

        const email = button.dataset.email;
        // The lawyer's name is not available in the dataset, so we find it from the table row
        const row = button.closest('tr');
        const lawyerName = row ? row.cells[0].textContent.trim() : 'Lawyer';

        // Use a named function reference so we can remove it later if needed
        const clickHandler = () => {
             // Check if button is already disabled (Request Sent)
            if (button.disabled) return; 

            // Call the new async function
            sendConnectionRequest(lawyerName, email);
        };

        button.addEventListener('click', clickHandler);
        button.clickHandler = clickHandler; // Store reference for removal
    });
}


// ====================== BNS SECTION EXTRACTION (From Your Code) ======================

// Mapping of expertise to BNS sections/ranges
const expertiseToRanges = [
    { name: 'General Criminal Law', ranges: [[1,44],[358,358]] },
    { name: 'Criminal Conspiracy & Abetment', ranges: [[45,62]] },
    { name: "Women's & Child Protection Law", ranges: [[63,99]] },
    { name: 'Personal Injury & Assault Law', ranges: [[100,146]] },
    { name: 'Constitutional & State Security Law', ranges: [[147,158]] },
    { name: 'Defense & Military Law', ranges: [[159,168]] },
    { name: 'Election & Political Law', ranges: [[169,177]] },
    { name: 'Financial & Currency Crimes', ranges: [[178,188]] },
    { name: 'Public Order & Safety Law', ranges: [[189,197]] },
    { name: 'Public Servant & Corruption Law', ranges: [[198,205]] },
    { name: 'Administrative & Contempt Law', ranges: [[206,226]] },
    { name: 'Evidence & Justice Law', ranges: [[227,269]] },
    { name: 'Public Health & Safety Law', ranges: [[270,297]] },
    { name: 'Religious & Cultural Law', ranges: [[298,302]] },
    { name: 'Property & Theft Law', ranges: [[303,334]] },
    { name: 'Documentation & Fraud Law', ranges: [[335,350]] },
    { name: 'Civil & Criminal Defamation Law', ranges: [[351,357]] }
];

function extractSectionNumbers(text) {
    if (!text) return [];
    // remove HTML tags
    const clean = text.replace(/<[^>]+>/g, ' ');
    const numbers = new Set();

    // match ranges like 1-44
    const rangeRe = /(\d+)\s*-\s*(\d+)/g;
    let m;
    while ((m = rangeRe.exec(clean)) !== null) {
        const start = parseInt(m[1], 10);
        const end = parseInt(m[2], 10);
        if (!isNaN(start) && !isNaN(end) && end >= start) {
            for (let i = start; i <= end; i++) numbers.add(i);
        }
    }

    // match standalone numbers (avoid ones already parsed in ranges)
    const singleRe = /\b(\d{1,4})\b/g;
    while ((m = singleRe.exec(clean)) !== null) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n)) numbers.add(n);
    }

    return Array.from(numbers).sort((a,b)=>a-b);
}

function mapSectionsToExpertise(sectionNumbers) {
    const matched = new Set();
    sectionNumbers.forEach(num => {
        expertiseToRanges.forEach(exp => {
            for (const r of exp.ranges) {
                const start = r[0], end = r[1];
                if (num >= start && num <= end) matched.add(exp.name);
            }
        });
    });
    return Array.from(matched);
}

function extractExpertiseFromAIResponse(htmlResponse) {
    const sections = extractSectionNumbers(htmlResponse);
    if (!sections || sections.length === 0) return [];
    return mapSectionsToExpertise(sections);
}

function showLawyerSuggestionPanel(lawyers, expertiseList) {
    let panel = document.getElementById('lawyerSuggestionPanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'lawyerSuggestionPanel';
        panel.className = 'lawyer-suggestion-panel';
        document.body.appendChild(panel);
    }

    // Build HTML
    let html = `<div class="panel-header"><strong>Suggested lawyers for:</strong> ${expertiseList.join(', ')} <button id="closeLawyerPanel">×</button></div>`;
    if (!lawyers || lawyers.length === 0) {
        html += `<div class="panel-body"><p>No lawyers found matching these expertise areas.</p></div>`;
    } else {
        html += `<div class="panel-body"><ul class="suggestion-list">`;
        lawyers.forEach(l => {
            html += `<li>
                <strong>${l.name}</strong>
                <div class="small">${l.expertise || ''}</div>
                <div class="small">${l.email || ''}</div>
                <div class="panel-actions"><button class="contact-button panel-contact-button" data-email="${l.email}">Contact</button></div>
            </li>`;
        });
        html += `</ul></div>`;
    }

    panel.innerHTML = html;

    // basic styles (scoped) if not already present
    if (!document.getElementById('lawyerSuggestionStyles')) {
        const style = document.createElement('style');
        style.id = 'lawyerSuggestionStyles';
        style.innerHTML = `
            .lawyer-suggestion-panel { position: fixed; right: 20px; bottom: 20px; width: 340px; max-height: 60vh; overflow:auto; background:#fff; box-shadow:0 6px 24px rgba(0,0,0,0.2); border-radius:8px; z-index:9999; font-family:Inter, Arial, sans-serif; }
            .lawyer-suggestion-panel .panel-header { padding:10px 12px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; }
            .lawyer-suggestion-panel .panel-body { padding:10px 12px; }
            .lawyer-suggestion-panel .suggestion-list { list-style:none; margin:0; padding:0; }
            .lawyer-suggestion-panel .suggestion-list li { padding:8px 0; border-bottom:1px dashed #f0f0f0; }
            .lawyer-suggestion-panel .small { color:#666; font-size:13px; }
            .lawyer-suggestion-panel .panel-actions { margin-top:6px; }
            .lawyer-suggestion-panel button.panel-contact-button { background:var(--primary-blue); color:var(--chat-user-bubble-text); border:none; padding:6px 8px; border-radius:4px; cursor:pointer; font-weight:600; }
            .lawyer-suggestion-panel #closeLawyerPanel { background:transparent; border:none; font-size:18px; cursor:pointer; }
        `;
        document.head.appendChild(style);
    }

    // wire contact buttons in panel to the new AJAX request
    panel.querySelectorAll('.panel-contact-button').forEach(btn => {
        const email = btn.dataset.email;
        // The lawyer's name is available in the list item's first strong tag
        const nameElement = btn.closest('li').querySelector('strong');
        const lawyerName = nameElement ? nameElement.textContent.trim() : 'Lawyer';

        btn.addEventListener('click', () => {
             // Check if button is already disabled (Request Sent)
            if (btn.disabled) return; 

            // Call the new async function
            sendConnectionRequest(lawyerName, email);
        });
    });

    const closeBtn = document.getElementById('closeLawyerPanel');
    if (closeBtn) closeBtn.addEventListener('click', () => panel.remove());
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
                
                // --- After AI responds, try to extract BNS section numbers and enable search button ---
                try {
                    const matchedExpertise = extractExpertiseFromAIResponse(data.response);
                    const searchBtn = document.getElementById('searchLawyersBtn');
                    if (matchedExpertise && matchedExpertise.length > 0) {
                        // store matched expertise on button for later use
                        searchBtn.dataset.expertise = JSON.stringify(matchedExpertise);
                        searchBtn.disabled = false;
                        searchBtn.title = `Find lawyers: ${matchedExpertise.join(', ')}`;
                    } else {
                        if (searchBtn) {
                            searchBtn.dataset.expertise = JSON.stringify([]);
                            searchBtn.disabled = true;
                            searchBtn.title = 'No BNS prediction found';
                        }
                    }
                } catch (err) {
                    console.error('Error processing AI response for BNS sections:', err);
                }

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
        
        // 💡 NEW CHANGE: Automatically re-render all lawyers when input is cleared.
        findLawyerInput.addEventListener('input', () => {
            if (findLawyerInput.value.trim() === '') {
                fetchAndRenderLawyers("");
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
                        <p class="case-query"><strong>प्रश्न:</strong> ${c.query}</p>
                        <div class="case-response">${c.response}</div>
                    </div>
                `).join("");
            } catch (err) {
                console.error("Error loading cases:", err);
                casesContainer.innerHTML = "<p class='error-text'>⚠ Failed to load history.</p>";
            }
        });
    }

    // ========== LAWYER SUGGESTION CLICK HANDLER ==========
    const searchBtn = document.getElementById('searchLawyersBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const dataExpertise = JSON.parse(searchBtn.dataset.expertise || '[]');
            if (!dataExpertise || dataExpertise.length === 0) {
                alert('No predicted BNS sections detected to search lawyers for.');
                return;
            }

            // fetch all lawyers and filter by expertise names
            try {
                const res = await fetch('/api/lawyers?query=');
                const payload = await res.json();
                const allLawyers = payload.lawyers || [];

                const matched = allLawyers.filter(l => {
                    if (!l.expertise) return false;
                    const lower = l.expertise.toLowerCase();
                    return dataExpertise.some(exp => lower.includes(exp.toLowerCase()));
                });

                showLawyerSuggestionPanel(matched, dataExpertise);
            } catch (err) {
                console.error('Error fetching/filtering lawyers:', err);
                alert('Failed to look up lawyers. See console for details.');
            }
        });
    }
});