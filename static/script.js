
// // script.js

// document.addEventListener('DOMContentLoaded', () => {
//     // --- LOGIN PAGE LOGIC ---
//     const loginForm = document.getElementById('loginForm');
//     if (loginForm) {
//         const emailInput = document.getElementById('email_address');
//         const passwordInput = document.getElementById('password');
//         const loginMessage = document.getElementById('loginMessage');
//         const toggleButtons = document.querySelectorAll('.account-type-toggle .toggle-button');

//         toggleButtons.forEach(button => {
//             button.addEventListener('click', () => {
//                 toggleButtons.forEach(btn => btn.classList.remove('active'));
//                 button.classList.add('active');
//             });
//         });

//         loginForm.addEventListener('submit', (event) => {
//             event.preventDefault();

//             const email = emailInput.value;
//             const password = passwordInput.value;

//             if (email && password) {
//                 loginMessage.textContent = 'Login successful! Redirecting...';
//                 loginMessage.style.color = '#28a745';

//                 sessionStorage.setItem('isLoggedIn', 'true');
//                 const activeAccountType = document.querySelector('.account-type-toggle .toggle-button.active');
//                 sessionStorage.setItem('userType', activeAccountType ? activeAccountType.dataset.type : 'user');

//                 setTimeout(() => {
//                     // In a real Flask app, you'd redirect to the endpoint
//                     window.location.href = '/'; // Redirects to your main dashboard route
//                 }, 1000);
//             } else {
//                 loginMessage.textContent = 'Please enter both email and password.';
//                 loginMessage.style.color = '#dc3545';
//             }
//         });
//     }

//     // --- DASHBOARD PAGE LOGIC ---
//     const dashboardBody = document.querySelector('.dashboard-body');
//     if (dashboardBody) {
//         // This simple check isn't secure, but works for a prototype
//         if (sessionStorage.getItem('isLoggedIn') !== 'true') {
//             // In a real Flask app, you'd redirect to the login endpoint
//             window.location.href = '/login'; // Redirects to your login route
//             return;
//         }

//         const savedTheme = localStorage.getItem('theme');
//         if (savedTheme === 'dark') {
//             document.body.classList.add('dark-mode');
//             const toggle = document.getElementById('darkModeToggle');
//             if (toggle) toggle.checked = true;
//         }

//         const userType = sessionStorage.getItem('userType') || 'User';
//         const userInfoSpan = document.querySelector('.header-right .user-info');
//         if (userInfoSpan) {
//             const formattedUserType = userType.charAt(0).toUpperCase() + userType.slice(1);
//             userInfoSpan.innerHTML = `<i class="fas fa-user"></i> Piyushwatari (${formattedUserType})`;
//         }

//         const logoutButton = document.querySelector('.logout-button');
//         const chatMessagesContainer = document.getElementById('chatMessages');
//         const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
//         const contentSections = document.querySelectorAll('.main-content-section');
//         const darkModeToggle = document.getElementById('darkModeToggle');

//         // if (logoutButton) {
//         //     logoutButton.addEventListener('click', () => {
//         //         sessionStorage.removeItem('isLoggedIn');
//         //         sessionStorage.removeItem('userType');
//         //         window.location.href = '/login'; // Redirect to login route
//         //     });
//         // }

//         if (chatMessagesContainer) {
//             setTimeout(() => {
//                 chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
//             }, 100);
//         }

//         const chatTextarea = document.querySelector('.chat-textarea');
//         const chatSendButton = document.querySelector('.chat-send-button');

//         if (chatTextarea && chatSendButton) {
//             const sendMessage = async () => {
//                 const messageText = chatTextarea.value.trim();
//                 if (messageText) {
//                     const now = new Date();
//                     const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
//                     const timestamp = now.toLocaleTimeString('en-IN', options);

//                     // 1. Add user's message to the chat window
//                     const userBubble = document.createElement('div');
//                     userBubble.classList.add('chat-bubble', 'user-message');
//                     userBubble.innerHTML = `${messageText}<span class="message-timestamp">${timestamp}</span>`;
//                     chatMessagesContainer.appendChild(userBubble);
//                     chatTextarea.value = '';
//                     chatTextarea.style.height = 'auto'; // Reset height after sending
//                     chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

//                     // 2. Send the message to the Flask server
//                     try {
//                         const response = await fetch('/chat', {
//                             method: 'POST',
//                             headers: {
//                                 'Content-Type': 'application/json',
//                             },
//                             body: JSON.stringify({ message: messageText }),
//                         });

//                         if (!response.ok) {
//                             throw new Error(`HTTP error! status: ${response.status}`);
//                         }
                        
//                         const data = await response.json();
//                         const aiMessageText = data.response; // Get the response from Flask

//                         // 3. Add the AI's response to the chat window
//                         const aiTimestamp = new Date().toLocaleTimeString('en-IN', options);
//                         const aiResponse = document.createElement('div');
//                         aiResponse.classList.add('chat-bubble', 'ai-message');
//                         aiResponse.innerHTML = `${aiMessageText}<span class="message-timestamp">${aiTimestamp}</span>`;
//                         chatMessagesContainer.appendChild(aiResponse);
//                         chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

//                     } catch (error) {
//                         console.error('Error fetching chat response:', error);
//                         // Optionally, display an error message in the chat to the user
//                         const errorBubble = document.createElement('div');
//                         errorBubble.classList.add('chat-bubble', 'ai-message');
//                         errorBubble.style.backgroundColor = '#dc3545';
//                         errorBubble.style.color = 'white';
//                         errorBubble.innerHTML = `Sorry, an error occurred. Please try again. <span class="message-timestamp">${new Date().toLocaleTimeString('en-IN', options)}</span>`;
//                         chatMessagesContainer.appendChild(errorBubble);
//                         chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
//                     }
//                 }
//             };

//             chatSendButton.addEventListener('click', sendMessage);

//             chatTextarea.addEventListener('keypress', (e) => {
//                 if (e.key === 'Enter' && !e.shiftKey) {
//                     e.preventDefault();
//                     sendMessage();
//                 }
//             });

//             // Auto-resize textarea
//             chatTextarea.addEventListener('input', () => {
//                 chatTextarea.style.height = 'auto';
//                 chatTextarea.style.height = (chatTextarea.scrollHeight) + 'px';
//             });
//         }

//         navItems.forEach(item => {
//             item.addEventListener('click', (event) => {
//                 event.preventDefault();
//                 const targetId = item.dataset.target;

//                 navItems.forEach(nav => nav.classList.remove('active'));
//                 contentSections.forEach(section => section.classList.remove('active'));

//                 item.classList.add('active');

//                 const targetSection = document.getElementById(targetId);
//                 if (targetSection) {
//                     targetSection.classList.add('active');
//                 }
//             });
//         });

//         if (darkModeToggle) {
//             darkModeToggle.addEventListener('change', () => {
//                 document.body.classList.toggle('dark-mode');
//                 if (document.body.classList.contains('dark-mode')) {
//                     localStorage.setItem('theme', 'dark');
//                 } else {
//                     localStorage.setItem('theme', 'light');
//                 }
//             });
//         }
//     }

//     // --- SIGNUP PAGE LOGIC ---
//     const signupForm = document.getElementById('signupForm');
//     if (signupForm) {
//         const signupMessage = document.getElementById('signupMessage');

//         signupForm.addEventListener('submit', (event) => {
//             event.preventDefault();

//             const fullName = document.getElementById('full_name').value;
//             const email = document.getElementById('email_address').value;
//             const password = document.getElementById('password').value;

//             if (fullName && email && password) {
//                 signupMessage.textContent = 'Account created successfully! Redirecting to login...';
//                 signupMessage.style.color = '#28a745';

//                 setTimeout(() => {
//                     window.location.href = '/login'; // Redirect to login route
//                 }, 1500);
//             } else {
//                 signupMessage.textContent = 'Please fill out all fields.';
//                 signupMessage.style.color = '#dc3545';
//             }
//         });
//     }
// });



document.addEventListener('DOMContentLoaded', () => {

    /* -------------------- LOGIN PAGE LOGIC -------------------- */
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const emailInput = document.getElementById('email_address');
        const passwordInput = document.getElementById('password');
        const loginMessage = document.getElementById('loginMessage');
        const toggleButtons = document.querySelectorAll('.account-type-toggle .toggle-button');

        // toggle user / lawyer selection
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                loginMessage.textContent = 'Please enter both email and password.';
                loginMessage.style.color = '#dc3545';
                return;
            }

            loginMessage.textContent = 'Login successful! Redirecting...';
            loginMessage.style.color = '#28a745';

            // save simple flags for client-side redirect protection
            sessionStorage.setItem('isLoggedIn', 'true');
            const activeType = document.querySelector('.account-type-toggle .toggle-button.active');
            sessionStorage.setItem('userType', activeType ? activeType.dataset.type : 'user');

            setTimeout(() => { window.location.href = '/'; }, 1000);
        });
    }

    /* -------------------- DASHBOARD PAGE LOGIC -------------------- */
    const dashboardBody = document.querySelector('.dashboard-body');
    if (dashboardBody) {

        // redirect to login if not logged in (client-side guard only)
        if (sessionStorage.getItem('isLoggedIn') !== 'true') {
            window.location.href = '/login';
            return;
        }

        // DARK MODE
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            const toggle = document.getElementById('darkModeToggle');
            if (toggle) toggle.checked = true;
        }

        // ✅ get username & usertype from data attributes set by Flask
        const flaskUserName = dashboardBody.dataset.username || 'Guest';
        const flaskUserType = dashboardBody.dataset.usertype || 'User';

        const userInfoSpan = document.querySelector('.header-right .user-info');
        if (userInfoSpan) {
            const formattedType = flaskUserType.charAt(0).toUpperCase() + flaskUserType.slice(1);
            userInfoSpan.innerHTML = `<i class="fas fa-user"></i> ${flaskUserName} (${formattedType})`;
        }

        /* ----- Logout button ----- */
        const logoutButton = document.querySelector('.logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                sessionStorage.clear();
                window.location.href = '/logout';  // hits Flask /logout route
            });
        }

        /* ----- Chat area ----- */
        const chatMessagesContainer = document.getElementById('chatMessages');
        if (chatMessagesContainer) {
            setTimeout(() => {
                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
            }, 100);
        }

        const chatTextarea = document.querySelector('.chat-textarea');
        const chatSendButton = document.querySelector('.chat-send-button');

        if (chatTextarea && chatSendButton) {
            const sendMessage = async () => {
                const messageText = chatTextarea.value.trim();
                if (!messageText) return;

                const now = new Date();
                const opts = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
                const timestamp = now.toLocaleTimeString('en-IN', opts);

                // add user's bubble
                const userBubble = document.createElement('div');
                userBubble.classList.add('chat-bubble', 'user-message');
                userBubble.innerHTML = `${messageText}<span class="message-timestamp">${timestamp}</span>`;
                chatMessagesContainer.appendChild(userBubble);
                chatTextarea.value = '';
                chatTextarea.style.height = 'auto';
                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

                // ask Flask for response
                try {
                    const res = await fetch('/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: messageText }),
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();

                    const aiBubble = document.createElement('div');
                    aiBubble.classList.add('chat-bubble', 'ai-message');
                    aiBubble.innerHTML = `${data.response}<span class="message-timestamp">${new Date().toLocaleTimeString('en-IN', opts)}</span>`;
                    chatMessagesContainer.appendChild(aiBubble);
                    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
                } catch (err) {
                    console.error('Chat error:', err);
                    const errorBubble = document.createElement('div');
                    errorBubble.classList.add('chat-bubble', 'ai-message');
                    errorBubble.style.backgroundColor = '#dc3545';
                    errorBubble.style.color = '#fff';
                    errorBubble.innerHTML = `Sorry, an error occurred.<span class="message-timestamp">${new Date().toLocaleTimeString('en-IN', opts)}</span>`;
                    chatMessagesContainer.appendChild(errorBubble);
                }
            };

            chatSendButton.addEventListener('click', sendMessage);
            chatTextarea.addEventListener('keypress', e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });

            // auto-resize textarea
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
                const target = document.getElementById(targetId);
                if (target) target.classList.add('active');
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

    /* -------------------- SIGNUP PAGE LOGIC -------------------- */
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        const signupMessage = document.getElementById('signupMessage');

        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const fullName = document.getElementById('full_name').value.trim();
            const email = document.getElementById('email_address').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!fullName || !email || !password) {
                signupMessage.textContent = 'Please fill out all fields.';
                signupMessage.style.color = '#dc3545';
                return;
            }

            signupMessage.textContent = 'Account created successfully! Redirecting to login...';
            signupMessage.style.color = '#28a745';

            setTimeout(() => { window.location.href = '/login'; }, 1500);
        });
    }
});
