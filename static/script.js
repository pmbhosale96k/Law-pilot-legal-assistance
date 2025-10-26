function goToLogin(type) {
    if (type === 'lawyer') {
        window.location.href = '/lawyer/login';
    } else {
        window.location.href = '/login';
    }
}

document.addEventListener('DOMContentLoaded', () => {

    /* -------------------- ACCOUNT TYPE TOGGLE -------------------- */
    const toggleButtons = document.querySelectorAll('.toggle-button');
    let accountType = 'user'; // default type
    
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            accountType = btn.dataset.type; // 'user' or 'lawyer'
            console.log("Selected account type:", accountType);
        });
    });

    


    /* -------------------- LOGIN PAGE LOGIC -------------------- */
    document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        // Choose API route based on accountType
        const route = accountType === "lawyer" ? "/lawyer/login" : "/login";
        console.log("Submitting to:", route);

        const response = await fetch(route, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        console.log("Response:", result);

        if (result.status === "success") {
            window.location.href = result.redirect;
        } else {
            document.getElementById("loginMessage").innerText = result.message;
        }
    });
});


    /* -------------------- SIGNUP PAGE LOGIC -------------------- */
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        const signupMessage = document.getElementById('signupMessage');

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('full_name')?.value.trim();
            const email = document.getElementById('email_address')?.value.trim();
            const password = document.getElementById('password')?.value.trim();

            if (!fullName || !email || !password) {
                signupMessage.textContent = 'Please fill out all fields.';
                signupMessage.style.color = '#dc3545';
                return;
            }

            try {
                const res = await fetch('/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ full_name: fullName, email_address: email, password })
                });

                const data = await res.json();

                if (data.success) {
                    signupMessage.textContent = 'Account created successfully! Redirecting to login...';
                    signupMessage.style.color = '#28a745';
                    setTimeout(() => { window.location.href = '/login'; }, 1500);
                } else {
                    signupMessage.textContent = data.message || 'Signup failed';
                    signupMessage.style.color = '#dc3545';
                }

            } catch (err) {
                console.error('Signup error:', err);
                signupMessage.textContent = 'Error connecting to server';
                signupMessage.style.color = '#dc3545';
            }
        });
    }

    /* -------------------- DASHBOARD PAGE LOGIC -------------------- */
    const dashboardBody = document.querySelector('.dashboard-body');
    if (dashboardBody) {

        // Redirect to login if not logged in (client-side check only)
        // if (sessionStorage.getItem('isLoggedIn') !== 'true') {
        //     window.location.href = '/login';
        //     return;
        // }

        // DARK MODE
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            const toggle = document.getElementById('darkModeToggle');
            if (toggle) toggle.checked = true;
        }

        const logoutButton = document.querySelector('.logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                fetch('/logout', { method: 'POST' }).finally(() => {
                    sessionStorage.clear();
                    window.location.href = '/login';
                });
            });
        }

        /* ----- Chat functionality ----- */
        const chatMessagesContainer = document.getElementById('chatMessages');
        const chatTextarea = document.querySelector('.chat-textarea');
        const chatSendButton = document.querySelector('.chat-send-button');

        if (chatTextarea && chatSendButton && chatMessagesContainer) {
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

            // Auto-resize textarea
            chatTextarea.addEventListener('input', () => {
                chatTextarea.style.height = 'auto';
                chatTextarea.style.height = chatTextarea.scrollHeight + 'px';
            });
        }

        /* ----- Sidebar navigation ----- */
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
        const contentSections = document.querySelectorAll('.main-content-section');

        navItems.forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                const targetId = item.dataset.target;

                navItems.forEach(n => n.classList.remove('active'));
                contentSections.forEach(sec => sec.classList.remove('active'));

                item.classList.add('active');
                document.getElementById(targetId)?.classList.add('active');
            });
        });

        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', () => {
                document.body.classList.toggle('dark-mode');
                localStorage.setItem('theme',
                    document.body.classList.contains('dark-mode') ? 'dark' : 'light'
                );
            });
        }
    }
});
