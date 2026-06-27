(function() {
  'use strict';

  let currentUser = null;
  let currentChat = null;
  let isMobile = window.innerWidth <= 768;
  let soundEnabled = true;
  let compactMode = false;
  let incomingCallIsVideo = false;
  let incomingCallFrom = null;
  let voiceStream = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let recordingStartTime = null;
  let recordingTimer = null;
  let notifTimer = null;

  // ===== DOM =====
  const $ = (id) => document.getElementById(id);
  const loginForm = $('login-form');
  const registerForm = $('register-form');
  const loginError = $('login-error');
  const registerError = $('register-error');
  const sidebarUsername = $('sidebar-username');
  const myAvatar = $('my-avatar');
  const chatsContainer = $('chats-container');
  const searchInput = $('search-input');
  const searchResults = $('search-results');
  const searchContainer = $('search-container');
  const closeSearch = $('close-search');
  const welcomeScreen = $('welcome-screen');
  const chatScreen = $('chat-screen');
  const chatUsername = $('chat-username');
  const chatAvatar = $('chat-avatar');
  const chatUserStatus = $('chat-user-status');
  const messagesList = $('messages-list');
  const messageInput = $('message-input');
  const sendBtn = $('send-btn');
  const emojiBtn = $('emoji-btn');
  const emojiPicker = $('emoji-picker');
  const emojiCategories = $('emoji-categories');
  const emojiGrid = $('emoji-grid');
  const logoutBtn = $('logout-btn');
  const newChatBtn = $('new-chat-btn');
  const settingsBtn = $('settings-btn');
  const refreshChats = $('refresh-chats');
  const voiceCallBtn = $('voice-call-btn');
  const videoCallBtn = $('video-call-btn');
  const callOverlay = $('call-overlay');
  const incomingCallOverlay = $('incoming-call-overlay');
  const callAvatar = $('call-avatar');
  const callName = $('call-name');
  const callStatus = $('call-status');
  const callDuration = $('call-duration');
  const callError = $('call-error');
  const localVideo = $('local-video');
  const remoteVideo = $('remote-video');
  const callMuteBtn = $('call-mute-btn');
  const callVideoToggleBtn = $('call-video-toggle-btn');
  const callEndBtn = $('call-end-btn');
  const incomingCallAvatar = $('incoming-call-avatar');
  const incomingCallName = $('incoming-call-name');
  const incomingCallStatus = $('incoming-call-status');
  const callAcceptBtn = $('call-accept-btn');
  const callDeclineBtn = $('call-decline-btn');
  const messagesContainer = $('messages-container');
  const toastContainer = $('toast-container');
  const settingsPanel = $('settings-panel');
  const settingsOverlay = $('settings-overlay');
  const settingsCloseBtn = $('settings-close-btn');
  const settingsName = $('settings-name');
  const settingsAvatarPreview = $('settings-avatar-preview');
  const settingsSaveBtn = $('settings-save-btn');
  const voiceMsgBtn = $('voice-msg-btn');
  const voiceRecordingBar = $('voice-recording-bar');
  const voiceTimer = $('voice-timer');
  const voiceSendBtn = $('voice-send-btn');
  const voiceCancelBtn = $('voice-cancel-btn');
  const sidebar = $('sidebar');
  const mobileBackBtn = $('mobile-back-btn');
  const rememberCheckbox = $('remember-checkbox');
  const authNotif = $('auth-notif');
  const authNotifText = $('auth-notif-text');
  const serverDot = $('server-dot');
  const serverUrlInput = $('server-url-input');
  const serverUrlBtn = $('server-url-btn');
  const serverStatusText = $('server-status-text');

  // ===== TOAST =====
  function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.className = 'toast' + (type ? ' ' + type : '');
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
  }

  // ===== SOUND =====
  function playNotification() {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [880, 1100].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.2;
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.start(t);
        osc.stop(t + 0.12);
      });
    } catch(e) {}
  }

  // ===== AUTH NOTIFICATION =====
  function showAuthNotif(msg) {
    if (!authNotif) return;
    clearTimeout(notifTimer);
    authNotif.classList.remove('leaving', 'hidden');
    authNotifText.textContent = msg;
    void authNotif.offsetWidth;
    authNotif.style.animation = 'none';
    void authNotif.offsetWidth;
    authNotif.style.animation = '';
    notifTimer = setTimeout(() => {
      authNotif.classList.add('leaving');
      setTimeout(() => { authNotif.classList.add('hidden'); authNotif.classList.remove('leaving'); }, 350);
    }, 4000);
  }

  function clearAuthNotif() {
    clearTimeout(notifTimer);
    authNotif.classList.add('hidden');
    authNotif.classList.remove('leaving');
  }

  if (authNotif) authNotif.addEventListener('click', () => {
    authNotif.classList.add('leaving');
    setTimeout(() => { authNotif.classList.add('hidden'); authNotif.classList.remove('leaving'); }, 350);
    clearTimeout(notifTimer);
  });

  // ===== AUTH TABS =====
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab + '-form').classList.add('active');
      loginError.textContent = '';
      registerError.textContent = '';
      clearAuthNotif();
    });
  });

  // ===== REGISTER =====
  const regName = $('reg-name');
  const regLogin = $('reg-login');
  const regEmail = $('reg-email');
  const regPassword = $('reg-password');
  const regConfirm = $('reg-confirm');
  const regBtn = $('register-btn');
  const strengthBar = $('strength-bar');
  const strengthText = $('strength-text');
  const strengthSection = $('password-strength');

  function setValid(el, state) {
    const icon = el.parentElement.querySelector('.input-valid');
    if (!icon) return;
    el.classList.remove('input-error', 'input-valid');
    icon.classList.remove('show', 'ok', 'fail', 'loading');
    if (state === 'ok') { el.classList.add('input-valid'); icon.classList.add('show', 'ok'); icon.textContent = '✓'; }
    else if (state === 'fail') { el.classList.add('input-error'); icon.classList.add('show', 'fail'); icon.textContent = '✕'; }
    else if (state === 'loading') { icon.classList.add('show', 'loading'); icon.textContent = '⟳'; }
    else { icon.classList.remove('show'); }
  }

  function getPasswordStrength(pass) {
    let score = 0;
    if (pass.length >= 6) score += 20;
    if (pass.length >= 8) score += 15;
    if (pass.length >= 12) score += 15;
    if (/[a-z]/.test(pass)) score += 10;
    if (/[A-Z]/.test(pass)) score += 15;
    if (/[0-9]/.test(pass)) score += 15;
    if (/[^a-zA-Z0-9]/.test(pass)) score += 10;
    return Math.min(score, 100);
  }

  function updateStrength() {
    const pass = regPassword.value;
    if (!pass) { strengthSection.classList.add('hidden'); return; }
    strengthSection.classList.remove('hidden');
    const score = getPasswordStrength(pass);
    const colors = ['#f85149','#f85149','#d29922','#d29922','#3fb950','#3fb950'];
    const labels = ['очень слабый','слабый','средний','хороший','сильный','очень сильный'];
    const idx = Math.min(Math.floor(score / 20), 5);
    strengthBar.style.setProperty('--strength', score + '%');
    strengthBar.style.setProperty('--strength-color', colors[idx]);
    strengthText.textContent = labels[idx];
    strengthText.style.color = colors[idx];
  }

  // Live validation
  regName.addEventListener('input', () => {
    setValid(regName, regName.value.length >= 2 ? 'ok' : regName.value.length > 0 ? 'fail' : null);
  });
  regLogin.addEventListener('input', () => {
    const v = regLogin.value;
    if (v.length < 3 && v.length > 0) setValid(regLogin, 'fail');
    else if (v.length >= 3) setValid(regLogin, 'ok');
    else setValid(regLogin, null);
  });
  regEmail.addEventListener('input', () => {
    const v = regEmail.value;
    setValid(regEmail, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'ok' : v.length > 0 ? 'fail' : null);
  });
  regPassword.addEventListener('input', () => {
    updateStrength();
    setValid(regPassword, regPassword.value.length >= 6 ? 'ok' : regPassword.value.length > 0 ? 'fail' : null);
    if (regConfirm.value) {
      setValid(regConfirm, regConfirm.value === regPassword.value ? 'ok' : 'fail');
    }
  });
  regConfirm.addEventListener('input', () => {
    setValid(regConfirm, regConfirm.value === regPassword.value && regConfirm.value.length > 0 ? 'ok' : regConfirm.value.length > 0 ? 'fail' : null);
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = regName.value.trim();
    const login = regLogin.value.trim();
    const email = regEmail.value.trim();
    const password = regPassword.value;
    const confirm = regConfirm.value;

    clearAuthNotif();

    if (!name || name.length < 2) { showAuthNotif('Имя должно быть минимум 2 символа'); return; }
    if (!login || login.length < 3) { showAuthNotif('Логин должен быть минимум 3 символа'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAuthNotif('Введите корректный email'); return; }
    if (password.length < 6) { showAuthNotif('Пароль должен быть минимум 6 символов'); return; }
    if (password !== confirm) { showAuthNotif('Пароли не совпадают'); return; }

    regBtn.classList.add('loading');
    const result = await Auth.register(name, login, email, password);
    regBtn.classList.remove('loading');

    if (result.success) {
      showAuthNotif('Регистрация успешна! Теперь войдите.');
      document.querySelector('[data-tab="login"]').click();
      $('login-email').value = login;
    } else {
      showAuthNotif(result.error);
    }
  });

  // ===== LOGIN =====
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginOrEmail = $('login-email').value.trim();
    const password = $('login-password').value;
    const rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;
    const result = await Auth.login(loginOrEmail, password, rememberMe);
    if (result.success) {
      loginError.textContent = '';
      currentUser = Auth.getCurrentUser();
      enterApp();
    } else {
      loginError.textContent = '';
      showAuthNotif(result.error);
    }
  });

  // ===== LOGOUT =====
  logoutBtn.addEventListener('click', () => {
    Auth.logout();
    currentUser = null;
    currentChat = null;
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('main-screen').classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
    chatScreen.classList.add('hidden');
    settingsPanel.classList.add('hidden');
    settingsOverlay.classList.add('hidden');
    showToast('Вы вышли из аккаунта', 'info');
  });

  // ===== MOBILE NAV =====
  let touchStartX = 0;
  function showSidebar() { sidebar.classList.remove('sidebar-hidden'); mobileBackBtn.classList.add('hidden'); }
  function hideSidebar() { if (isMobile) { sidebar.classList.add('sidebar-hidden'); mobileBackBtn.classList.remove('hidden'); } }

  mobileBackBtn.addEventListener('click', showSidebar);

  document.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (touchStartX < 30 && e.changedTouches[0].screenX > touchStartX + 50) showSidebar();
    if (diff > 60 && isMobile && !sidebar.classList.contains('sidebar-hidden')) hideSidebar();
  }, { passive: true });
  document.addEventListener('click', (e) => {
    if (isMobile && !sidebar.classList.contains('sidebar-hidden') && !sidebar.contains(e.target) && e.target !== mobileBackBtn) hideSidebar();
  });

  // ===== ENTER APP =====
  function enterApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-screen').classList.remove('hidden');
    sidebarUsername.textContent = currentUser.name;
    myAvatar.textContent = currentUser.avatar;
    settingsName.value = currentUser.name;
    settingsAvatarPreview.textContent = currentUser.avatar;
    chatScreen.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
    if (isMobile) showSidebar();
    loadChatsList();
    showToast('Добро пожаловать, ' + currentUser.name + '!', 'success');
  }

  // ===== SERVER MESSAGE HANDLER =====
  DB.onMessage((data) => {
    if (!data || !currentUser) return;

    // Incoming message
    if (data.type === 'new-msg') {
      const msg = data.msg;
      if (currentChat === msg.from) {
        renderMessages(currentChat);
        scrollToBottom();
      }
      if (msg.from !== currentUser.login) {
        loadChatsList();
        document.title = '🔔 NovaChat';
        setTimeout(() => { document.title = 'NovaChat'; }, 3000);
        playNotification();
        const fromUser = DB._lastUsers?.[msg.from];
        showToast('Новое сообщение от ' + (fromUser?.name || msg.from), 'info');
      }
    }

    // Chat list update
    if (data.type === 'chat-update' && data.with !== currentUser.login) {
      loadChatsList();
    }

    // Call signals
    if (data.type && data.type.startsWith('call-')) {
      Calls.handleSignal(data);
    }
  });

  // ===== CHATS =====
  async function loadChatsList() {
    if (!currentUser) return;
    const chats = await DB.getChats();
    chatsContainer.innerHTML = '';

    if (!chats || chats.length === 0) {
      chatsContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💬</div><div class="empty-state-text">Нет чатов. Найдите пользователя в поиске.</div></div>';
      return;
    }

    chats.forEach((chat, idx) => {
      const div = document.createElement('div');
      div.className = 'chat-item' + (currentChat === chat.with ? ' active' : '');
      div.style.animationDelay = (idx * 0.03) + 's';
      div.innerHTML = `
        <div class="avatar" style="background:linear-gradient(135deg,${getAvatarColor(chat.with)},${getAvatarColor2(chat.with)})">${chat.avatar}</div>
        <div class="chat-item-info">
          <div class="chat-item-name">${escapeHtml(chat.name)}</div>
          <div class="chat-item-last">${escapeHtml(chat.lastMessage || 'Нет сообщений')}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
          <div class="chat-item-time">${chat.lastTime || ''}</div>
          ${chat.online ? '<div class="chat-online-dot"></div>' : ''}
        </div>
      `;
      div.addEventListener('click', () => openChat(chat.with));
      chatsContainer.appendChild(div);
    });
  }

  function getAvatarColor(str) {
    const colors = ['#7c5cfc','#f472b6','#34d399','#fbbf24','#60a5fa','#a78bfa','#fb923c','#4ade80','#f43f5e','#06b6d4'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  function getAvatarColor2(str) {
    const colors = ['#a78bfa','#fb7185','#6ee7b7','#fcd34d','#93c5fd','#c4b5fd','#fdba74','#86efac','#e11d48','#0891b2'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) * 31 + hash;
    return colors[Math.abs(hash) % colors.length];
  }

  // ===== OPEN CHAT =====
  async function openChat(withLogin) {
    currentChat = withLogin;
    DB.send({ type: 'get-user', login: withLogin });
    // Get user info from a temp mechanism
    const user = { name: withLogin, avatar: withLogin.charAt(0).toUpperCase(), online: false };
    chatUsername.textContent = user.name;
    chatAvatar.textContent = user.avatar;
    chatAvatar.style.background = `linear-gradient(135deg, ${getAvatarColor(withLogin)}, ${getAvatarColor2(withLogin)})`;
    chatUserStatus.textContent = 'загрузка...';
    chatUserStatus.style.color = 'var(--text-muted)';
    welcomeScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    messageInput.focus();
    loadChatsList();
    renderMessages(withLogin);
    scrollToBottom();
  }

  // ===== MESSAGES =====
  async function renderMessages(withLogin) {
    const msgs = await DB.getMessages(withLogin);
    messagesList.innerHTML = '';

    if (!msgs || msgs.length === 0) {
      messagesList.innerHTML = '<div class="empty-state" style="padding:40px 20px"><div class="empty-state-icon">👋</div><div class="empty-state-text">Начните общение</div></div>';
      return;
    }

    let lastDate = '';
    msgs.forEach((msg, idx) => {
      const d = new Date(msg.time);
      const msgDate = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      if (msgDate !== lastDate) {
        lastDate = msgDate;
        const divider = document.createElement('div');
        divider.className = 'date-divider';
        divider.textContent = msgDate;
        messagesList.appendChild(divider);
      }

      const isSent = msg.from === currentUser.login;
      const div = document.createElement('div');
      div.className = 'message ' + (isSent ? 'sent' : 'received');
      div.style.animationDelay = (idx * 0.02) + 's';

      if (msg.type === 'voice' && msg.audioData) {
        div.innerHTML = buildAudioMessage(msg, isSent);
      } else {
        div.innerHTML = `${escapeHtml(msg.text)}<div class="message-time">${msg.formattedTime}</div>`;
      }
      messagesList.appendChild(div);
    });

    messagesList.querySelectorAll('.audio-play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const audioEl = document.getElementById('audio-' + btn.dataset.audioId);
        if (audioEl) {
          if (audioEl.paused) { audioEl.play(); btn.innerHTML = ''; btn.appendChild(Icons.create('pause', 16)); }
          else { audioEl.pause(); btn.innerHTML = ''; btn.appendChild(Icons.create('play', 16)); }
        }
      });
    });
  }

  function buildAudioMessage(msg, isSent) {
    const bars = [];
    for (let i = 0; i < 20; i++) {
      const h = 4 + Math.random() * 20;
      bars.push(`<span style="height:${h}px;background:${isSent ? 'rgba(255,255,255,0.4)' : 'var(--text-muted)'}"></span>`);
    }
    const playHtml = '<svg viewBox="0 0 24 24" fill="none" width="16" height="16"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.4"/><path d="M10 8v8l6-4-6-4z" fill="currentColor"/></svg>';
    return `
      <div class="audio-message">
        <button class="audio-play-btn" data-audio-id="${msg.id}">${playHtml}</button>
        <div class="audio-waveform">${bars.join('')}</div>
        <span class="audio-duration">${msg.duration || '0:00'}</span>
      </div>
      <div class="message-time">${msg.formattedTime}</div>
      <audio id="audio-${msg.id}" src="${msg.audioData}" style="display:none" preload="auto"></audio>
    `;
  }

  function scrollToBottom() {
    setTimeout(() => { messagesContainer.scrollTop = messagesContainer.scrollHeight; }, 80);
  }

  // ===== SEND =====
  function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;
    DB.sendMessage(currentChat, text);
    messageInput.value = '';
    emojiPicker.classList.add('hidden');
    setTimeout(() => { renderMessages(currentChat); scrollToBottom(); loadChatsList(); }, 200);
  }

  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // ===== SEARCH =====
  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      const query = searchInput.value.trim();
      if (query.length < 1) { searchResults.classList.add('hidden'); return; }
      const results = await DB.searchUsers(query);
      searchResults.classList.remove('hidden');
      searchContainer.innerHTML = '';

      if (!results || results.length === 0) {
        searchContainer.innerHTML = '<div class="empty-state"><div class="empty-state-text">Пользователи не найдены</div></div>';
        return;
      }

      const existingChats = (await DB.getChats()).map(c => c.with);
      results.forEach(user => {
        const div = document.createElement('div');
        div.className = 'search-item';
        const added = existingChats.includes(user.login);
        div.innerHTML = `
          <div class="avatar" style="background:linear-gradient(135deg,${getAvatarColor(user.login)},${getAvatarColor2(user.login)})">${user.avatar}</div>
          <div class="chat-item-info">
            <div class="chat-item-name">${escapeHtml(user.name)}</div>
            <div class="chat-item-last">@${escapeHtml(user.login)}</div>
          </div>
          <button class="search-add-btn ${added?'added':''}">${added ? '✓' : 'Написать'}</button>
        `;
        div.querySelector('.search-add-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          if (!added) {
            // Send first message to create chat
            DB.sendMessage(user.login, 'Привет! Давай общаться в NovaChat ✦');
            setTimeout(() => { loadChatsList(); openChat(user.login); }, 300);
            searchResults.classList.add('hidden');
            searchInput.value = '';
            showToast('Чат с ' + user.name + ' создан', 'success');
          }
        });
        searchContainer.appendChild(div);
      });
    }, 250);
  });

  closeSearch.addEventListener('click', () => { searchResults.classList.add('hidden'); searchInput.value = ''; });
  newChatBtn.addEventListener('click', () => { searchInput.focus(); searchInput.value = ''; searchResults.classList.remove('hidden'); DB.searchUsers('').then(r => { /* noop */ }); });
  refreshChats.addEventListener('click', loadChatsList);

  // ===== EMOJI PICKER =====
  let currentEmojiCategory = 'Nova';
  function buildEmojiPicker() {
    emojiCategories.innerHTML = '';
    getCategories().forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'emoji-cat-btn' + (cat === currentEmojiCategory ? ' active' : '');
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        currentEmojiCategory = cat;
        emojiCategories.querySelectorAll('.emoji-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderEmojiGrid(cat);
      });
      emojiCategories.appendChild(btn);
    });
    renderEmojiGrid(currentEmojiCategory);
  }

  function renderEmojiGrid(category) {
    emojiGrid.innerHTML = '';
    const emojis = getEmojiByCategory(category);
    if (!emojis || emojis.length === 0) {
      emojiGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted)">Нет эмодзи</div>';
      return;
    }
    emojis.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'emoji-item';
      btn.innerHTML = item.svg;
      btn.title = item.name;
      btn.addEventListener('click', () => { messageInput.value += ':' + item.id + ':'; messageInput.focus(); });
      emojiGrid.appendChild(btn);
    });
  }

  emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('hidden');
    if (!emojiPicker.classList.contains('hidden')) buildEmojiPicker();
  });
  document.addEventListener('click', (e) => {
    if (!emojiPicker.classList.contains('hidden') && !emojiPicker.contains(e.target) && e.target !== emojiBtn) emojiPicker.classList.add('hidden');
  });

  // ===== SETTINGS =====
  const ACCENT_COLORS = ['#7c5cfc','#f472b6','#34d399','#fbbf24','#60a5fa','#f97316','#ef4444','#06b6d4','#a78bfa','#22c55e'];
  const AVATAR_COLORS = ['#7c5cfc','#f472b6','#34d399','#fbbf24','#60a5fa','#f97316','#ef4444','#06b6d4'];

  function initSettings() {
    const accentPicker = $('accent-color-picker');
    ACCENT_COLORS.forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.background = c;
      if (c === '#7c5cfc') swatch.classList.add('active');
      swatch.addEventListener('click', () => {
        accentPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        document.documentElement.style.setProperty('--accent', c);
        document.documentElement.style.setProperty('--accent-hover', c + 'dd');
        document.documentElement.style.setProperty('--accent-light', c + '26');
        localStorage.setItem('novachat_accent', c);
      });
      accentPicker.appendChild(swatch);
    });

    const avatarPicker = $('avatar-color-picker');
    AVATAR_COLORS.forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.background = c;
      swatch.addEventListener('click', () => {
        avatarPicker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        settingsAvatarPreview.style.background = c;
      });
      avatarPicker.appendChild(swatch);
    });

    const savedAccent = localStorage.getItem('novachat_accent');
    if (savedAccent) {
      document.documentElement.style.setProperty('--accent', savedAccent);
      document.documentElement.style.setProperty('--accent-hover', savedAccent + 'dd');
      document.documentElement.style.setProperty('--accent-light', savedAccent + '26');
      accentPicker.querySelectorAll('.color-swatch').forEach(s => { s.classList.toggle('active', s.style.background === savedAccent); });
    }

    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('s-' + tab.dataset.stab).classList.add('active');
      });
    });

    settingsSaveBtn.addEventListener('click', () => {
      const newName = settingsName.value.trim();
      if (newName && newName !== currentUser.name) {
        currentUser.name = newName;
        currentUser.avatar = newName.charAt(0).toUpperCase();
        sidebarUsername.textContent = newName;
        myAvatar.textContent = currentUser.avatar;
        settingsAvatarPreview.textContent = currentUser.avatar;
        showToast('Профиль обновлён', 'success');
      }
    });

    document.querySelectorAll('.toggle-switch').forEach(toggle => {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        if (toggle.id === 'sound-toggle') soundEnabled = toggle.classList.contains('active');
        if (toggle.id === 'compact-mode') { compactMode = toggle.classList.contains('active'); document.body.classList.toggle('compact-mode', compactMode); }
        if (toggle.id === 'dark-theme-toggle') {
          const isDark = toggle.classList.contains('active');
          ['--bg-primary', '--bg-secondary', '--bg-tertiary', '--text-primary', '--text-secondary', '--border', '--bg-hover', '--shadow'].forEach((prop, i) => {
            const vals = isDark
              ? ['#0d1117','#161b22','#21262d','#e6edf3','#8b949e','#30363d','#30363d','rgba(0,0,0,0.4)']
              : ['#ffffff','#f3f4f6','#e5e7eb','#1f2937','#6b7280','#d1d5db','#d1d5db','rgba(0,0,0,0.1)'];
            document.documentElement.style.setProperty(prop, vals[i]);
          });
        }
      });
    });

    settingsBtn.addEventListener('click', () => { settingsPanel.classList.remove('hidden'); settingsOverlay.classList.remove('hidden'); });
    function closeSettings() { settingsPanel.classList.add('hidden'); settingsOverlay.classList.add('hidden'); }
    settingsCloseBtn.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', closeSettings);
  }

  // ===== VOICE =====
  voiceMsgBtn.addEventListener('click', async () => {
    if (voiceRecordingBar.classList.contains('hidden')) {
      try {
        voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(voiceStream);
        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRecorder.onstop = () => { if (voiceStream) { voiceStream.getTracks().forEach(t => t.stop()); voiceStream = null; } };
        mediaRecorder.start();
        recordingStartTime = Date.now();
        voiceRecordingBar.classList.remove('hidden');
        voiceMsgBtn.classList.add('recording');
        voiceMsgBtn.innerHTML = '';
        voiceMsgBtn.appendChild(Icons.create('micOff', 20));
        recordingTimer = setInterval(() => {
          const sec = Math.floor((Date.now() - recordingStartTime) / 1000);
          voiceTimer.textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
          if (sec >= 120) stopRecordingAndSend();
        }, 200);
      } catch (err) { showToast('Ошибка доступа к микрофону', 'error'); }
    } else { stopRecordingAndSend(); }
  });

  function stopRecordingAndSend() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.addEventListener('stop', () => {
        clearInterval(recordingTimer);
        voiceRecordingBar.classList.add('hidden');
        voiceMsgBtn.classList.remove('recording');
        voiceMsgBtn.innerHTML = '';
        voiceMsgBtn.appendChild(Icons.create('mic', 20));
        const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
        if (duration < 1) { showToast('Слишком короткая запись', 'error'); return; }
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const durStr = String(Math.floor(duration / 60)).padStart(2, '0') + ':' + String(duration % 60).padStart(2, '0');
          DB.sendMessage(currentChat, '🎤 Голосовое сообщение', 'voice', reader.result, durStr);
          setTimeout(() => { renderMessages(currentChat); scrollToBottom(); loadChatsList(); }, 300);
        };
        reader.readAsDataURL(blob);
      }, { once: true });
    }
  }

  voiceCancelBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    clearInterval(recordingTimer);
    voiceRecordingBar.classList.add('hidden');
    voiceMsgBtn.classList.remove('recording');
    voiceMsgBtn.innerHTML = '';
    voiceMsgBtn.appendChild(Icons.create('mic', 20));
  });
  voiceSendBtn.addEventListener('click', stopRecordingAndSend);

  // ===== CALLS =====
  Calls.init(
    (from, fromName, isVideo) => {
      incomingCallIsVideo = isVideo;
      incomingCallFrom = from;
      incomingCallAvatar.textContent = fromName?.charAt(0).toUpperCase() || '?';
      incomingCallName.textContent = fromName || from;
      incomingCallStatus.textContent = isVideo ? '📹 Входящий видеозвонок...' : '📞 Входящий звонок...';
      incomingCallOverlay.classList.remove('hidden');
    },
    (reason) => {
      callOverlay.classList.add('hidden');
      incomingCallOverlay.classList.add('hidden');
      localVideo.srcObject = null;
      remoteVideo.srcObject = null;
      showToast(reason === 'declined' ? 'Звонок отклонён' : 'Звонок завершён', 'info');
    }
  );

  callAcceptBtn.addEventListener('click', async () => {
    incomingCallOverlay.classList.add('hidden');
    callOverlay.classList.remove('hidden');
    callAvatar.textContent = incomingCallName.textContent?.charAt(0) || '?';
    callName.textContent = incomingCallName.textContent;
    callStatus.textContent = 'Соединение...';
    callDuration.textContent = '00:00';
    callError.classList.add('hidden');
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    const result = await Calls.acceptCall(incomingCallIsVideo);
    if (!result.success) { callOverlay.classList.add('hidden'); showToast(result.error || 'Ошибка', 'error'); }
  });

  callDeclineBtn.addEventListener('click', () => { Calls.declineCall(); incomingCallOverlay.classList.add('hidden'); });
  voiceCallBtn.addEventListener('click', async () => {
    if (!currentChat) { showToast('Выберите чат', 'error'); return; }
    callOverlay.classList.remove('hidden');
    callAvatar.textContent = chatUsername.textContent?.charAt(0) || '?';
    callName.textContent = chatUsername.textContent;
    callStatus.textContent = 'Звонок...';
    callDuration.textContent = '00:00';
    callError.classList.add('hidden');
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    const result = await Calls.startCall(currentChat, chatUsername.textContent, false);
    if (!result.success) { callOverlay.classList.add('hidden'); showToast(result.error || 'Ошибка', 'error'); }
  });
  videoCallBtn.addEventListener('click', async () => {
    if (!currentChat) { showToast('Выберите чат', 'error'); return; }
    callOverlay.classList.remove('hidden');
    callAvatar.textContent = chatUsername.textContent?.charAt(0) || '?';
    callName.textContent = chatUsername.textContent;
    callStatus.textContent = 'Видеозвонок...';
    callDuration.textContent = '00:00';
    callError.classList.add('hidden');
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    const result = await Calls.startCall(currentChat, chatUsername.textContent, true);
    if (result.success) { if (Calls.getLocalStream()) localVideo.srcObject = Calls.getLocalStream(); }
    else { callOverlay.classList.add('hidden'); showToast(result.error || 'Ошибка', 'error'); }
  });
  callEndBtn.addEventListener('click', () => { Calls.endCall(); });
  callMuteBtn.addEventListener('click', () => {
    const muted = Calls.toggleMute();
    callMuteBtn.classList.toggle('active-muted', muted);
    const icon = muted ? 'micOff' : 'mic';
    callMuteBtn.dataset.icon = icon;
    callMuteBtn.innerHTML = ''; callMuteBtn.appendChild(Icons.create(icon, 24));
  });
  callVideoToggleBtn.addEventListener('click', () => {
    const off = Calls.toggleVideo();
    callVideoToggleBtn.style.opacity = off ? '0.5' : '1';
    const icon = off ? 'videoOff' : 'video';
    callVideoToggleBtn.dataset.icon = icon;
    callVideoToggleBtn.innerHTML = ''; callVideoToggleBtn.appendChild(Icons.create(icon, 24));
  });

  // ===== SERVER STATUS =====
  function setServerStatus(state) {
    if (!serverDot) return;
    serverDot.className = 'server-dot ' + state;
    if (serverStatusText) {
      const labels = { connected: 'Подключено', disconnected: 'Нет соединения', connecting: 'Подключение...' };
      serverStatusText.textContent = 'Статус: ' + (labels[state] || state);
    }
  }

  setServerStatus('connecting');

  if (serverUrlInput) serverUrlInput.value = DB._serverUrl;

  if (serverUrlBtn) {
    serverUrlBtn.addEventListener('click', () => {
      const url = serverUrlInput.value.trim();
      if (url) {
        DB.disconnect();
        DB.setServerUrl(url);
        setServerStatus('connecting');
        DB.connect();
        showToast('Подключение к ' + url, 'info');
      }
    });
  }

  // ===== INIT =====
  Icons.apply();

  // Restore session on page load
  const sessionData = Auth.init();
  if (sessionData && sessionData.login && sessionData.password) {
    showToast('Восстановление сессии...', 'info');
    Auth.login(sessionData.login, sessionData.password, !!sessionData.expires).then(result => {
      if (result.success) {
        currentUser = Auth.getCurrentUser();
        enterApp();
      } else {
        showToast('Сессия истекла, войдите заново', 'error');
        DB.clearSession();
      }
    });
  }

  initSettings();
  Calls.init(() => {}, () => {});

  // Connection status indicator
  DB.onMessage((data) => {
    if (data.type === '_connected') { setServerStatus('connected'); showToast('Подключено к серверу', 'success'); }
    if (data.type === '_disconnected') { setServerStatus('disconnected'); showToast('Потеряно соединение с сервером', 'error'); }
  });

  console.log('✦ NovaChat v2.0 — Server mode ✦');
  console.log('Server: ' + DB._serverUrl);
})();
