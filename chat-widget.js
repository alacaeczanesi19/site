(function() {
    // FontAwesome ikonlarının eksik olma ihtimaline karşı ekleyelim
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fa = document.createElement('link');
        fa.rel = 'stylesheet';
        fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fa);
    }

    // Firebase SDK'larını dinamik olarak yükle (sayfada yoksa)
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

        // Sohbet HTML Yapısı (Sayaç rozeti eklendi)
        const chatHTML = `
        <div id="chat-container" class="fixed bottom-6 right-6 z-50 font-sans">
            <button id="chat-toggle-btn" onclick="toggleChat()" class="relative bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all duration-200 hover:scale-105 cursor-pointer">
                <i class="fa-solid fa-comments text-lg"></i>
                <span>Sohbet Et</span>
                <span id="chat-badge" class="hidden absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md animate-bounce">0</span>
            </button>

            <div id="chat-box" class="hidden absolute bottom-16 right-0 w-80 sm:w-96 h-[450px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
                <div class="bg-emerald-700 text-white px-4 py-3 flex justify-between items-center font-semibold">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-headset"></i>
                        <span>Canlı Sohbet Alanı</span>
                    </div>
                    <button onclick="toggleChat()" class="text-emerald-100 hover:text-white transition-colors text-lg cursor-pointer">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div id="chat-messages" class="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3 text-sm">
                    <div class="bg-slate-200 text-slate-700 text-xs text-center py-1.5 px-3 rounded-lg self-center max-w-xs">
                        Ortak sohbet odasına hoş geldiniz!
                    </div>
                </div>

                <div class="p-3 bg-white border-t border-slate-200 flex flex-col gap-2">
                    <input type="text" id="chat-user" placeholder="Adınız..." class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600" />
                    <div class="flex gap-2">
                        <input type="text" id="chat-input" placeholder="Mesajınız" onkeypress="checkEnter(event)" class="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600" />
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

        // Firebase Konfigürasyonu
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
            
            // Sohbet açıldığında okunmamış mesaj sayacını sıfırla
            if (!chatBox.classList.contains('hidden')) {
                unreadCount = 0;
                updateBadge();
                document.getElementById('chat-input').focus();
            }
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

        function playNotificationSound() {
            try {
                if (!audioCtx) return;
                if (audioCtx.state === 'suspended') audioCtx.resume();

                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);

                gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.3);
            } catch (e) {
                console.log("Ses çalınamadı: ", e);
            }
        }

        window.sendMessage = function() {
            window.initAudioContext();
            const userInput = document.getElementById('chat-input');
            const userNameInput = document.getElementById('chat-user');

            const text = userInput.value.trim();
            const name = userNameInput.value.trim() || "Misafir";

            if (text === "") return;

            if (text === "/clear") {
                chatRef.remove();
                userInput.value = "";
                return;
            }

            chatRef.push({
                name: name,
                text: text,
                timestamp: Date.now()
            });

            userInput.value = "";
        };

        chatRef.on('child_added', (snapshot) => {
            const data = snapshot.val();
            const messagesContainer = document.getElementById('chat-messages');
            if (!messagesContainer) return;

            const messageDiv = document.createElement('div');
            messageDiv.classList.add('flex', 'flex-col', 'max-w-[85%]', 'self-start');
            
            messageDiv.innerHTML = `
                <span class="text-[11px] font-bold text-emerald-700 ml-1 mb-0.5">${escapeHtml(data.name)}</span>
                <div class="bg-emerald-50 border border-emerald-100 text-slate-700 px-3 py-2 rounded-xl rounded-tl-sm text-sm break-words shadow-sm">
                    ${escapeHtml(data.text)}
                </div>
            `;

            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            playNotificationSound();

            // Eğer sohbet kutusu kapalıysa sayacı artır
            const chatBox = document.getElementById('chat-box');
            if (chatBox && chatBox.classList.contains('hidden')) {
                unreadCount++;
                updateBadge();
            }
        });

        chatRef.on('value', (snapshot) => {
            const messagesContainer = document.getElementById('chat-messages');
            if (!messagesContainer) return;
            if (!snapshot.exists()) {
                messagesContainer.innerHTML = `
                    <div class="bg-slate-200 text-slate-700 text-xs text-center py-1.5 px-3 rounded-lg self-center max-w-xs">
                        Sohbet geçmişi temizlendi.
                    </div>
                `;
                unreadCount = 0;
                updateBadge();
            }
        });

        window.checkEnter = function(event) {
            if (event.key === 'Enter') {
                window.sendMessage();
            }
        };

        function escapeHtml(text) {
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    }
})();
