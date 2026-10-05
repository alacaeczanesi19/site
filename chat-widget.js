(function() {
    // FontAwesome ikonları
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fa = document.createElement('link');
        fa.rel = 'stylesheet';
        fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fa);
    }

    // Firebase SDK yükleme
    if (typeof firebase === 'undefined') {
        const scriptApp = document.createElement('script');
        scriptApp.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
        scriptApp.onload = () => {
            const scriptDb = document.createElement('script');
            scriptDb.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js';
            scriptDb.onload = initChatWidget;
            document.head.appendChild(scriptDb);
        };
        document.head.appendChild(scriptApp);
    } else {
        initChatWidget();
    }

    function initChatWidget() {
        let unreadCount = 0;
        let typingTimeout = null;

        const chatHTML = `
        <div id="chat-container" class="fixed bottom-6 right-6 z-50 font-sans">
            <button id="chat-toggle-btn" onclick="toggleChat()" class="relative bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all duration-200 hover:scale-105 cursor-pointer">
                <i class="fa-solid fa-comments text-lg"></i>
                <span>Sohbet Et</span>
                <span id="chat-badge" class="hidden absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md animate-bounce">0</span>
            </button>

            <div id="chat-box" class="hidden absolute bottom-16 right-0 w-80 sm:w-96 h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
                <!-- Sohbet Header -->
                <div id="chat-header" class="bg-emerald-700 text-white px-4 py-3 flex justify-between items-center font-semibold">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-headset"></i>
                        <span>Canlı Sohbet Alanı</span>
                    </div>
                    <div id="header-right-actions" class="flex items-center gap-2">
                        <!-- Kapatma Butonu -->
                        <button onclick="toggleChat()" class="text-white hover:text-emerald-200 transition-colors text-lg cursor-pointer p-1">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                <!-- Mesajların Listelendiği Alan -->
                <div id="chat-messages" class="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3 text-sm">
                    <div class="bg-slate-200 text-slate-700 text-xs text-center py-1.5 px-3 rounded-lg self-center max-w-xs shadow-sm">
                        Ortak sohbet odasına hoş geldiniz! Temizlemek için <b>/clear</b> yazabilirsiniz.
                    </div>
                </div>

                <!-- Yazıyor Göstergesi -->
                <div id="typing-indicator" class="hidden px-4 py-1 text-[11px] text-slate-400 italic bg-slate-50">
                    Biri yazıyor...
                </div>

                <!-- Emoji Paneli -->
                <div id="emoji-picker" class="hidden grid grid-cols-6 gap-1 p-2 bg-slate-100 border-t border-slate-200 text-lg">
                    <button onclick="addEmoji('😊')" class="hover:bg-slate-200 rounded p-1">😊</button>
                    <button onclick="addEmoji('👍')" class="hover:bg-slate-200 rounded p-1">👍</button>
                    <button onclick="addEmoji('💊')" class="hover:bg-slate-200 rounded p-1">💊</button>
                    <button onclick="addEmoji('📦')" class="hover:bg-slate-200 rounded p-1">📦</button>
                    <button onclick="addEmoji('🔥')" class="hover:bg-slate-200 rounded p-1">🔥</button>
                    <button onclick="addEmoji('❤️')" class="hover:bg-slate-200 rounded p-1">❤️</button>
                </div>

                <!-- Mesaj Gönderme Alanı -->
                <div id="chat-footer-bar" class="p-3 bg-white border-t border-slate-200 flex flex-col gap-2">
                    <input type="text" id="chat-user" placeholder="Adınız..." oninput="saveUser()" class="w-full px-3 py-1.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600" />
                    <div class="flex gap-2">
                        <button onclick="toggleEmojiPicker()" type="button" class="text-slate-500 hover:text-emerald-600 px-2 text-base cursor-pointer" title="Emoji Seç">
                            <i class="fa-regular fa-face-smile"></i>
                        </button>
                        <input type="text" id="chat-input" placeholder="Mesajınız veya /clear..." oninput="notifyTyping()" onkeypress="checkEnter(event)" class="flex-1 px-3 py-2 text-sm bg-white text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600" />
                        <button onclick="sendMessage()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center cursor-pointer">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

        const div = document.createElement('div');
        div.innerHTML = chatHTML;
        document.body.appendChild(div);

        // --- KESİN ÇÖZÜM: BUTONU JS İLE DİNAMİK OLARAK EKLEME ---
        const headerRight = document.getElementById('header-right-actions');
        const themeBtn = document.createElement('button');
        themeBtn.id = "theme-toggle-btn";
        themeBtn.setAttribute("onclick", "toggleDarkMode()");
        themeBtn.title = "Karanlık/Aydınlık Mod";
        themeBtn.style.cssText = "background: rgba(0,0,0,0.15); border: none; cursor: pointer; color: white; padding: 6px 10px; border-radius: 6px; font-size: 14px; margin-right: 4px; display: flex; align-items: center; justify-content: center;";
        themeBtn.innerHTML = '<i id="theme-icon" class="fa-solid fa-moon"></i>';
        
        // Kapatma butonundan önce (sağ üstte en solda kalacak şekilde) araya ekle
        headerRight.insertBefore(themeBtn, headerRight.firstChild);

        // Tema Değiştirme Fonksiyonu
        const applyTheme = (isDark) => {
            const box = document.getElementById('chat-box');
            const header = document.getElementById('chat-header');
            const icon = document.getElementById('theme-icon');
            const messages = document.getElementById('chat-messages');
            const typing = document.getElementById('typing-indicator');
            const emojiPicker = document.getElementById('emoji-picker');
            const footerBar = document.getElementById('chat-footer-bar');
            const userInput = document.getElementById('chat-user');
            const chatInput = document.getElementById('chat-input');

            if (isDark) {
                box.style.backgroundColor = '#0f172a';
                box.style.borderColor = '#1e293b';
                header.style.backgroundColor = '#065f46';
                messages.style.backgroundColor = '#020617';
                typing.style.backgroundColor = '#020617';
                typing.style.color = '#94a3b8';
                emojiPicker.style.backgroundColor = '#0f172a';
                emojiPicker.style.borderColor = '#1e293b';
                footerBar.style.backgroundColor = '#0f172a';
                footerBar.style.borderColor = '#1e293b';
                userInput.style.backgroundColor = '#1e293b';
                userInput.style.color = '#f8fafc';
                userInput.style.borderColor = '#334155';
                chatInput.style.backgroundColor = '#1e293b';
                chatInput.style.color = '#f8fafc';
                chatInput.style.borderColor = '#334155';
                
                icon.className = "fa-solid fa-sun";
                localStorage.setItem('chat_theme', 'dark');
            } else {
                box.style.backgroundColor = '#ffffff';
                box.style.borderColor = '#e2e8f0';
                header.style.backgroundColor = '#047857';
                messages.style.backgroundColor = '#f8fafc';
                typing.style.backgroundColor = '#f8fafc';
                typing.style.color = '#94a3b8';
                emojiPicker.style.backgroundColor = '#f1f5f9';
                emojiPicker.style.borderColor = '#e2e8f0';
                footerBar.style.backgroundColor = '#ffffff';
                footerBar.style.borderColor = '#e2e8f0';
                userInput.style.backgroundColor = '#ffffff';
                userInput.style.color = '#1e293b';
                userInput.style.borderColor = '#cbd5e1';
                chatInput.style.backgroundColor = '#ffffff';
                chatInput.style.color = '#1e293b';
                chatInput.style.borderColor = '#cbd5e1';

                icon.className = "fa-solid fa-moon";
                localStorage.setItem('chat_theme', 'light');
            }
        };

        if (localStorage.getItem('chat_theme') === 'dark') {
            applyTheme(true);
        }

        window.toggleDarkMode = function() {
            const currentTheme = localStorage.getItem('chat_theme');
            if (currentTheme === 'dark') {
                applyTheme(false);
            } else {
                applyTheme(true);
            }
        };

        // Diğer Fonksiyonlar
        const savedName = localStorage.getItem('chat_username');
        if (savedName) {
            document.getElementById('chat-user').value = savedName;
        }

        window.saveUser = function() {
            localStorage.setItem('chat_username', document.getElementById('chat-user').value);
        };

        const firebaseConfig = {
            apiKey: "AIzaSyBYQZEYws-2H_wNMLjJ49xw0FpvOOWX3k4",
            authDomain: "alacaeczanesi.firebaseapp.com",
            databaseURL: "https://alacaeczanesi-default-rtdb.firebaseio.com",
            projectId: "alacaeczanesi",
            storageBucket: "alacaeczanesi.firebasestorage.app",
            messagingSenderId: "225106853473",
            appId: "1:225106853473:web:46b0addd19cb09e59e7420",
            measurementId: "G-KQS93JMS4P"
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        const db = firebase.database();
        const chatRef = db.ref('messages');
        const typingRef = db.ref('typing');

        let audioCtx = null;
        window.initAudioContext = function() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } else if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        };

        window.toggleChat = function() {
            window.initAudioContext();
            const chatBox = document.getElementById('chat-box');
            chatBox.classList.toggle('hidden');
            if (!chatBox.classList.contains('hidden')) {
                unreadCount = 0;
                updateBadge();
                document.getElementById('chat-input').focus();
            }
        };

        window.toggleEmojiPicker = function() {
            document.getElementById('emoji-picker').classList.toggle('hidden');
        };

        window.addEmoji = function(emoji) {
            const input = document.getElementById('chat-input');
            input.value += emoji;
            input.focus();
            document.getElementById('emoji-picker').classList.add('hidden');
        };

        function updateBadge() {
            const badge = document.getElementById('chat-badge');
            if (!badge) return;
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        window.notifyTyping = function() {
            const name = document.getElementById('chat-user').value.trim() || "Misafir";
            typingRef.set({ name: name, isTyping: true });
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => { typingRef.remove(); }, 2000);
        };

        typingRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const indicator = document.getElementById('typing-indicator');
            const currentName = document.getElementById('chat-user').value.trim() || "Misafir";
            if (data && data.isTyping && data.name !== currentName) {
                indicator.textContent = `${data.name} yazıyor...`;
                indicator.classList.remove('hidden');
            } else {
                indicator.classList.add('hidden');
            }
        });

        window.sendMessage = function() {
            window.initAudioContext();
            const userInput = document.getElementById('chat-input');
            const userNameInput = document.getElementById('chat-user');
            const text = userInput.value.trim();
            const name = userNameInput.value.trim() || "Misafir";

            if (text === "") return;
            if (text === "/clear") {
                chatRef.remove();
                typingRef.remove();
                userInput.value = "";
                return;
            }

            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            chatRef.push({ name: name, text: text, time: timeString, timestamp: Date.now() });
            typingRef.remove();
            userInput.value = "";
            document.getElementById('emoji-picker').classList.add('hidden');
        };

        chatRef.on('child_added', (snapshot) => {
            const data = snapshot.val();
            const messagesContainer = document.getElementById('chat-messages');
            if (!messagesContainer) return;

            const isDark = localStorage.getItem('chat_theme') === 'dark';
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('flex', 'flex-col', 'max-w-[85%]', 'self-start');
            
            messageDiv.innerHTML = `
                <div class="flex items-center gap-2 ml-1 mb-0.5">
                    <span class="text-[11px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}">${escapeHtml(data.name)}</span>
                    <span class="text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'}">${data.time || ''}</span>
                </div>
                <div class="${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-emerald-50 border-emerald-100 text-slate-700'} border px-3 py-2 rounded-xl rounded-tl-sm text-sm break-words shadow-sm">
                    ${escapeHtml(data.text)}
                </div>
            `;

            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            const chatBox = document.getElementById('chat-box');
            if (chatBox && chatBox.classList.contains('hidden')) {
                unreadCount++;
                updateBadge();
            }
        });

        window.checkEnter = function(event) {
            if (event.key === 'Enter') {
                window.sendMessage();
            }
        };

        function escapeHtml(text) {
            return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        }
    }
})();
