// ---------------------- Global Functions ----------------------

// Redirect based on account type (login/signup)
function goToLogin(type) {
    if (type === 'lawyer') {
        window.location.href = '/lawyer/login';
    } else {
        window.location.href = '/login';
    }
}

// ---------------------- Lawyer Directory ----------------------

async function fetchAndRenderLawyers(query = "") {
    const tableBody = document.getElementById('lawyerTableBody');
    const statusMessage = document.getElementById('lawyerStatusMessage');

    tableBody.innerHTML = '';
    statusMessage.textContent = query ? `Searching for "${query}"...` : 'Loading all available lawyers...';

    try {
        const response = await fetch(`/api/lawyers?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const lawyers = data.lawyers;

        if (!lawyers.length) {
            statusMessage.textContent = `No lawyers found matching "${query || 'your criteria'}" in the database.`;
            return;
        }

        lawyers.forEach(lawyer => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = lawyer.name;
            row.insertCell().textContent = lawyer.expertise;
            const actionCell = row.insertCell();
            actionCell.innerHTML = `<button class="contact-button"><i class="fas fa-handshake"></i> Connect</button>`;
        });

        statusMessage.textContent = `${lawyers.length} lawyer(s) found.`;

    } catch (err) {
        console.error('Error fetching lawyers:', err);
        statusMessage.textContent = 'Error loading lawyer data. Please check the server connection.';
    }
}

function searchLawyers() {
    const searchInput = document.getElementById('lawyerSearchInput');
    if (searchInput) fetchAndRenderLawyers(searchInput.value);
}

// ---------------------- Document Ready ----------------------

document.addEventListener('DOMContentLoaded', () => {

    // ---------- Login/Signup Page ----------
    const toggleButtons = document.querySelectorAll('.toggle-button');
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const accountType = btn.dataset.type;
                loginForm.action = accountType === 'lawyer' ? '/lawyer/login' : '/login';
                console.log(`Form action set to: ${loginForm.action}`);
            });
        });
    }

    // ---------- Dashboard Page ----------
    const dashboardBody = document.querySelector('.dashboard-body');
    if (!dashboardBody) return;

    // Dark mode
    // DARK MODE TOGGLE
const darkModeToggle = document.getElementById('darkModeToggle');
if (darkModeToggle) {
    darkModeToggle.addEventListener('change', () => {
        if (darkModeToggle.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    });
}


    // Logout
    const logoutButton = document.querySelector('.logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            fetch('/logout', { method: 'POST' }).finally(() => sessionStorage.clear());
        });
    }

    // ---------- Chat ----------
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

    // ---------- Sidebar Navigation ----------
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const contentSections = document.querySelectorAll('.main-content-section');
    const findLawyerInput = document.getElementById('lawyerSearchInput');

    navItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const targetId = item.dataset.target;

            navItems.forEach(n => n.classList.remove('active'));
            contentSections.forEach(sec => {
                sec.classList.remove('active');
                sec.classList.add('hidden');
            });

            item.classList.add('active');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                targetSection.classList.remove('hidden');
            }

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
});
