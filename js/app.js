(function() {
  'use strict';

  let currentUser = null;
  let currentChat = null;
  let isMobile = window.innerWidth <= 768;
  let soundEnabled = true;
  let compactMode = false;

  // ===== DOM =====
  const $ = (id) => document.getElementById(id);
  const authScreen = $('auth-screen');
  const mainScreen = $('main-screen');
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
  const authNotif = $('auth-notif');
  const authNotifText = $('auth-notif-text');
  const userInfo = $('user-info');
  const sidebar = $('sidebar');
  const mobileBackBtn = $('mobile-back-btn');
  const rememberCheckbox = $('remember-checkbox');
  const rememberLabel = $('remember-label');

  // ===== TOAST =====
  function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.className = 'toast' + (type ? ' ' + type : '');
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
  }

  // ===== AUDIO NOTIFICATION =====
  function playNotification() {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);

      // Second beep
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc2.start(ctx.currentTime + 0.2);
      osc2.stop(ctx.currentTime + 0.35);
    } catch(e) {}
  }

  // ===== AUTH NOTIFICATION =====
  let notifTimer = null;

  function showAuthNotif(msg) {
    if (!authNotif) return;
    clearTimeout(notifTimer);
    authNotif.classList.remove('leaving', 'hidden');
    authNotifText.textContent = msg;
    // Reset animation by reflow
    void authNotif.offsetWidth;
    authNotif.style.animation = 'none';
    void authNotif.offsetWidth;
    authNotif.style.animation = '';
    // Auto-dismiss after 4s with graceful exit
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

  // Close notif on click
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
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('reg-name').value.trim();
    const login = $('reg-login').value.trim();
    const email = $('reg-email').value.trim();
    const password = $('reg-password').value;
    const confirm = $('reg-confirm').value;

    clearAuthNotif();

    if (password !== confirm) {
      showAuthNotif('Пароли не совпадают');
      return;
    }

    const result = Auth.register(name, login, email, password);
    if (result.success) {
      showAuthNotif('Регистрация успешна! Теперь войдите.');
      document.querySelector('[data-tab="login"]').click();
      $('login-email').value = login;
    } else {
      showAuthNotif(result.error);
    }
  });

  // ===== LOGIN =====
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const loginOrEmail = $('login-email').value.trim();
    const password = $('login-password').value;
    const rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;
    const result = Auth.login(loginOrEmail, password, rememberMe);
    if (result.success) {
      loginError.textContent = '';
      currentUser = Auth.getCurrentUser();
      enterApp();
    } else {
      loginError.textContent = result.error;
    }
  });

  // ===== LOGOUT =====
  logoutBtn.addEventListener('click', () => {
    Auth.logout();
    currentUser = null;
    currentChat = null;
    authScreen.style.display = 'flex';
    mainScreen.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
    chatScreen.classList.add('hidden');
    settingsPanel.classList.add('hidden');
    settingsOverlay.classList.add('hidden');
    showToast('Вы вышли из аккаунта', 'info');
  });

  // ===== MOBILE NAVIGATION =====
  let touchStartX = 0;
  let touchEndX = 0;

  function showSidebar() {
    sidebar.classList.remove('sidebar-hidden');
    mobileBackBtn.classList.add('hidden');
  }

  function hideSidebar() {
    if (isMobile) {
      sidebar.classList.add('sidebar-hidden');
      mobileBackBtn.classList.remove('hidden');
    }
  }

  function toggleSidebar() {
    if (sidebar.classList.contains('sidebar-hidden')) {
      showSidebar();
    } else if (isMobile) {
      hideSidebar();
    }
  }

  mobileBackBtn.addEventListener('click', showSidebar);

  // Touch swipe to show sidebar
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    // Swipe right to show sidebar (from left edge)
    if (touchStartX < 30 && touchEndX > touchStartX + 50) {
      showSidebar();
    }
    // Swipe left to hide sidebar (on sidebar)
    if (diff > 60 && isMobile && !sidebar.classList.contains('sidebar-hidden')) {
      hideSidebar();
    }
  }, { passive: true });

  // Click outside sidebar to close it on mobile
  document.addEventListener('click', (e) => {
    if (isMobile && !sidebar.classList.contains('sidebar-hidden') &&
        !sidebar.contains(e.target) && e.target !== mobileBackBtn) {
      hideSidebar();
    }
  });

  // When opening chat on mobile, hide sidebar
  const origOpenChat = openChat;
  openChat = function(withLogin) {
    origOpenChat(withLogin);
    hideSidebar();
  };

  // ===== ENTER APP =====
  function enterApp() {
    authScreen.style.display = 'none';
    mainScreen.classList.remove('hidden');
    sidebarUsername.textContent = currentUser.name;
    myAvatar.textContent = currentUser.avatar;
    settingsName.value = currentUser.name;
    settingsAvatarPreview.textContent = currentUser.avatar;
    chatScreen.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
    loadChatsList();

    // Restore remember me state from Auth
    if (Auth.isRemembered()) {
      if (rememberCheckbox) rememberCheckbox.checked = true;
    }

    // On mobile, start with sidebar visible
    if (isMobile) {
      showSidebar();
    }

    showToast('Добро пожаловать, ' + currentUser.name + '!', 'success');
  }

  // ===== CHATS =====
  function loadChatsList() {
    if (!currentUser) return;
    const chats = DB.getChats(currentUser.login);
    chatsContainer.innerHTML = '';

    if (chats.length === 0) {
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
  function openChat(withLogin) {
    currentChat = withLogin;
    Chat.setCurrentChat(withLogin);
    const user = DB.getUser(withLogin);
    chatUsername.textContent = user ? user.name : withLogin;
    chatAvatar.textContent = user ? user.avatar : withLogin.charAt(0).toUpperCase();
    chatAvatar.style.background = `linear-gradient(135deg, ${getAvatarColor(withLogin)}, ${getAvatarColor2(withLogin)})`;
    chatUserStatus.textContent = user && user.online ? 'в сети' : 'не в сети';
    chatUserStatus.style.color = user && user.online ? 'var(--success)' : 'var(--text-muted)';

    welcomeScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    messageInput.focus();
    loadChatsList();
    renderMessages(withLogin);
    scrollToBottom();
  }

  // ===== MESSAGES =====
  function renderMessages(withLogin) {
    const msgs = Chat.getMessages(currentUser.login, withLogin);
    messagesList.innerHTML = '';

    if (msgs.length === 0) {
      messagesList.innerHTML = '<div class="empty-state" style="padding:40px 20px"><div class="empty-state-icon">👋</div><div class="empty-state-text">Начните общение</div></div>';
      return;
    }

    let lastDate = '';
    msgs.forEach((msg, idx) => {
      const msgDate = Chat.formatDate(msg.time);
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

      if (msg.type === 'voice') {
        div.innerHTML = buildAudioMessage(msg, isSent);
      } else {
        div.innerHTML = `${escapeHtml(msg.text)}<div class="message-time">${msg.formattedTime}</div>`;
      }
      messagesList.appendChild(div);
    });

    // Attach audio player handlers
    messagesList.querySelectorAll('.audio-play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const audioId = btn.dataset.audioId;
        const audio = document.getElementById('audio-' + audioId);
        if (audio) {
          if (audio.paused) {
            audio.play();
            btn.innerHTML = '';
            btn.appendChild(Icons.create('pause', 16));
          } else {
            audio.pause();
            btn.innerHTML = '';
            btn.appendChild(Icons.create('play', 16));
          }
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
    const playSvg = Icons ? Icons.create('play', 16) : document.createElement('span');
    if (!Icons) playSvg.textContent = '▶';
    const playHtml = playSvg.outerHTML || '▶';
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
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 80);
  }

  // ===== SEND MESSAGE =====
  function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;

    const msg = Chat.sendMessage(currentUser.login, currentChat, text);
    messageInput.value = '';
    emojiPicker.classList.add('hidden');

    renderMessages(currentChat);
    scrollToBottom();
    loadChatsList();
  }

  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // ===== SEARCH =====
  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const query = searchInput.value.trim();
      if (query.length < 1) {
        searchResults.classList.add('hidden');
        return;
      }
      performSearch(query);
    }, 250);
  });

  function performSearch(query) {
    const results = Search.search(query);
    searchResults.classList.remove('hidden');
    searchContainer.innerHTML = '';

    if (results.length === 0) {
      searchContainer.innerHTML = '<div class="empty-state"><div class="empty-state-text">Пользователи не найдены</div></div>';
      return;
    }

    const existingChats = DB.getChats(currentUser.login).map(c => c.with);
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
          Chat.getOrCreateChat(currentUser.login, user.login);
          loadChatsList();
          openChat(user.login);
          searchResults.classList.add('hidden');
          searchInput.value = '';
          showToast('Чат с ' + user.name + ' создан', 'success');
        }
      });
      searchContainer.appendChild(div);
    });
  }

  closeSearch.addEventListener('click', () => {
    searchResults.classList.add('hidden');
    searchInput.value = '';
  });

  newChatBtn.addEventListener('click', () => {
    searchInput.focus();
    searchInput.value = '';
    searchResults.classList.remove('hidden');
    performSearch('');
  });

  refreshChats.addEventListener('click', loadChatsList);

  // ===== EMOJI PICKER =====
  let currentEmojiCategory = 'Nova';

  function buildEmojiPicker() {
    emojiCategories.innerHTML = '';
    const cats = getCategories();
    cats.forEach(cat => {
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
    if (emojis.length === 0) {
      emojiGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted)">Нет эмодзи в этой категории</div>';
      return;
    }
    emojis.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'emoji-item';
      btn.innerHTML = item.svg;
      btn.title = item.name;
      btn.addEventListener('click', () => {
        messageInput.value += ':' + item.id + ':';
        messageInput.focus();
      });
      emojiGrid.appendChild(btn);
    });
  }

  emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('hidden');
    if (!emojiPicker.classList.contains('hidden')) {
      buildEmojiPicker();
    }
  });

  document.addEventListener('click', (e) => {
    if (!emojiPicker.classList.contains('hidden') &&
        !emojiPicker.contains(e.target) &&
        e.target !== emojiBtn) {
      emojiPicker.classList.add('hidden');
    }
  });

  // ===== SETTINGS =====
  const ACCENT_COLORS = ['#7c5cfc','#f472b6','#34d399','#fbbf24','#60a5fa','#f97316','#ef4444','#06b6d4','#a78bfa','#22c55e'];
  const AVATAR_COLORS = ['#7c5cfc','#f472b6','#34d399','#fbbf24','#60a5fa','#f97316','#ef4444','#06b6d4'];

  function initSettings() {
    // Accent color picker
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
        showToast('Цвет акцента изменён', 'success');
      });
      accentPicker.appendChild(swatch);
    });

    // Avatar color picker
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

    // Load saved settings
    const savedAccent = localStorage.getItem('novachat_accent');
    if (savedAccent) {
      document.documentElement.style.setProperty('--accent', savedAccent);
      document.documentElement.style.setProperty('--accent-hover', savedAccent + 'dd');
      document.documentElement.style.setProperty('--accent-light', savedAccent + '26');
      accentPicker.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.toggle('active', s.style.background === savedAccent);
      });
    }

    // Settings tabs
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('s-' + tab.dataset.stab).classList.add('active');
      });
    });

    // Save profile
    settingsSaveBtn.addEventListener('click', () => {
      const newName = settingsName.value.trim();
      if (newName && newName !== currentUser.name) {
        currentUser.name = newName;
        currentUser.avatar = newName.charAt(0).toUpperCase();
        DB.saveUser(currentUser.login, currentUser);
        sidebarUsername.textContent = newName;
        myAvatar.textContent = currentUser.avatar;
        settingsAvatarPreview.textContent = currentUser.avatar;
        sessionStorage.setItem('novachat_session', currentUser.login);
        showToast('Профиль обновлён', 'success');
      }
    });

    // Toggle switches
    document.querySelectorAll('.toggle-switch').forEach(toggle => {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        const id = toggle.id;
        if (id === 'sound-toggle') soundEnabled = toggle.classList.contains('active');
        if (id === 'compact-toggle') {
          compactMode = toggle.classList.contains('active');
          document.body.classList.toggle('compact-mode', compactMode);
        }
        if (id === 'dark-theme-toggle') {
          const isDark = toggle.classList.contains('active');
          document.documentElement.style.setProperty('--bg-primary', isDark ? '#0d1117' : '#ffffff');
          document.documentElement.style.setProperty('--bg-secondary', isDark ? '#161b22' : '#f3f4f6');
          document.documentElement.style.setProperty('--bg-tertiary', isDark ? '#21262d' : '#e5e7eb');
          document.documentElement.style.setProperty('--text-primary', isDark ? '#e6edf3' : '#1f2937');
          document.documentElement.style.setProperty('--text-secondary', isDark ? '#8b949e' : '#6b7280');
          document.documentElement.style.setProperty('--border', isDark ? '#30363d' : '#d1d5db');
          document.documentElement.style.setProperty('--bg-hover', isDark ? '#30363d' : '#d1d5db');
          document.documentElement.style.setProperty('--shadow', isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)');
        }
      });
    });

    // Open/close
    settingsBtn.addEventListener('click', () => {
      settingsPanel.classList.remove('hidden');
      settingsOverlay.classList.remove('hidden');
    });

    function closeSettings() {
      settingsPanel.classList.add('hidden');
      settingsOverlay.classList.add('hidden');
    }

    settingsCloseBtn.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', closeSettings);
  }

  // ===== VOICE MESSAGES =====
  let mediaRecorder = null;
  let audioChunks = [];
  let recordingStartTime = null;
  let recordingTimer = null;
  let voiceStream = null;

  voiceMsgBtn.addEventListener('click', async () => {
    if (voiceRecordingBar.classList.contains('hidden')) {
      // Start recording
      try {
        voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(voiceStream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          if (voiceStream) {
            voiceStream.getTracks().forEach(t => t.stop());
            voiceStream = null;
          }
        };

        mediaRecorder.start();
        recordingStartTime = Date.now();
        voiceRecordingBar.classList.remove('hidden');
        voiceMsgBtn.classList.add('recording');
        voiceMsgBtn.innerHTML = '';
        voiceMsgBtn.appendChild(Icons.create('micOff', 20));
        showToast('Запись начата...', 'info');

        recordingTimer = setInterval(() => {
          const sec = Math.floor((Date.now() - recordingStartTime) / 1000);
          const m = String(Math.floor(sec / 60)).padStart(2, '0');
          const s = String(sec % 60).padStart(2, '0');
          voiceTimer.textContent = m + ':' + s;

          // Auto-stop at 2 minutes
          if (sec >= 120) {
            stopRecording();
          }
        }, 200);
      } catch (err) {
        showToast('Ошибка доступа к микрофону', 'error');
      }
    } else {
      // Stop recording and send
      stopRecordingAndSend();
    }
  });

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    clearInterval(recordingTimer);
    voiceRecordingBar.classList.add('hidden');
    voiceMsgBtn.classList.remove('recording');
    voiceMsgBtn.innerHTML = '';
    voiceMsgBtn.appendChild(Icons.create('mic', 20));
  }

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
        if (duration < 1) {
          showToast('Слишком короткая запись', 'error');
          return;
        }

        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result;
          const durStr = String(Math.floor(duration / 60)).padStart(2, '0') + ':' + String(duration % 60).padStart(2, '0');

          const chatId = [currentUser.login, currentChat].sort().join('_');
          const msg = {
            id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            from: currentUser.login,
            to: currentChat,
            text: '🎤 Голосовое сообщение',
            type: 'voice',
            audioData: base64,
            duration: durStr,
            time: Date.now(),
            formattedTime: Chat._formatTime(new Date())
          };

          DB.saveMessage(chatId, msg);
          DB.updateChatLastMessage(currentUser.login, currentChat, '🎤 Голосовое сообщение', msg.formattedTime);

          DB.sendSignal({
            type: 'message',
            from: currentUser.login,
            to: currentChat,
            fromName: currentUser.name,
            msg: msg
          });

          renderMessages(currentChat);
          scrollToBottom();
          loadChatsList();
          showToast('Голосовое сообщение отправлено', 'success');
        };
        reader.readAsDataURL(blob);
      }, { once: true });
    }
  }

  voiceCancelBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    clearInterval(recordingTimer);
    voiceRecordingBar.classList.add('hidden');
    voiceMsgBtn.classList.remove('recording');
    voiceMsgBtn.innerHTML = '';
    voiceMsgBtn.appendChild(Icons.create('mic', 20));
    showToast('Запись отменена', 'info');
  });

  voiceSendBtn.addEventListener('click', stopRecordingAndSend);

  // ===== CALLS =====
  let incomingCallIsVideo = false;
  let incomingCallFrom = null;

  Calls.init(
    (from, fromName, isVideo) => {
      incomingCallIsVideo = isVideo;
      incomingCallFrom = from;
      const user = DB.getUser(from);
      incomingCallAvatar.textContent = user ? user.avatar : from.charAt(0).toUpperCase();
      incomingCallName.textContent = fromName;
      incomingCallStatus.textContent = isVideo ? '📹 Входящий видеозвонок...' : '📞 Входящий звонок...';
      incomingCallOverlay.classList.remove('hidden');
      playNotification();
    },
    (reason) => {
      callOverlay.classList.add('hidden');
      incomingCallOverlay.classList.add('hidden');
      localVideo.srcObject = null;
      remoteVideo.srcObject = null;
      if (reason === 'declined') {
        showToast('Звонок отклонён', 'info');
      } else if (reason === 'ended') {
        showToast('Звонок завершён', 'info');
      }
    }
  );

  callAcceptBtn.addEventListener('click', async () => {
    incomingCallOverlay.classList.add('hidden');
    callOverlay.classList.remove('hidden');
    const user = DB.getUser(incomingCallFrom);
    callAvatar.textContent = user ? user.avatar : incomingCallFrom.charAt(0).toUpperCase();
    callName.textContent = user ? user.name : incomingCallFrom;
    callStatus.textContent = 'Соединение...';
    callDuration.textContent = '00:00';
    callError.classList.add('hidden');
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;

    const result = await Calls.acceptCall(incomingCallIsVideo);
    if (result.success) {
      callStatus.textContent = 'Соединение...';
      if (incomingCallIsVideo && Calls.getLocalStream()) {
        localVideo.srcObject = Calls.getLocalStream();
      }
    } else {
      callOverlay.classList.add('hidden');
      showToast(result.error || 'Ошибка соединения', 'error');
    }
  });

  callDeclineBtn.addEventListener('click', () => {
    Calls.declineCall();
    incomingCallOverlay.classList.add('hidden');
    incomingCallFrom = null;
  });

  voiceCallBtn.addEventListener('click', async () => {
    if (!currentChat) { showToast('Выберите чат', 'error'); return; }
    const user = DB.getUser(currentChat);
    callOverlay.classList.remove('hidden');
    callAvatar.textContent = user ? user.avatar : currentChat.charAt(0).toUpperCase();
    callName.textContent = user ? user.name : currentChat;
    callStatus.textContent = 'Звонок...';
    callDuration.textContent = '00:00';
    callError.classList.add('hidden');
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;

    const result = await Calls.startCall(currentChat, user ? user.name : currentChat, false);
    if (!result.success) {
      callOverlay.classList.add('hidden');
      showToast(result.error || 'Ошибка звонка', 'error');
    }
  });

  videoCallBtn.addEventListener('click', async () => {
    if (!currentChat) { showToast('Выберите чат', 'error'); return; }
    const user = DB.getUser(currentChat);
    callOverlay.classList.remove('hidden');
    callAvatar.textContent = user ? user.avatar : currentChat.charAt(0).toUpperCase();
    callName.textContent = user ? user.name : currentChat;
    callStatus.textContent = 'Видеозвонок...';
    callDuration.textContent = '00:00';
    callError.classList.add('hidden');
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;

    const result = await Calls.startCall(currentChat, user ? user.name : currentChat, true);
    if (result.success) {
      if (Calls.getLocalStream()) localVideo.srcObject = Calls.getLocalStream();
    } else {
      callOverlay.classList.add('hidden');
      showToast(result.error || 'Ошибка видеозвонка', 'error');
    }
  });

  callEndBtn.addEventListener('click', () => { Calls.endCall(); });
  callMuteBtn.addEventListener('click', () => {
    const muted = Calls.toggleMute();
    callMuteBtn.classList.toggle('active-muted', muted);
    callMuteBtn.dataset.icon = muted ? 'micOff' : 'mic';
    callMuteBtn.innerHTML = '';
    callMuteBtn.appendChild(Icons.create(muted ? 'micOff' : 'mic', 24));
  });
  callVideoToggleBtn.addEventListener('click', () => {
    const off = Calls.toggleVideo();
    callVideoToggleBtn.style.opacity = off ? '0.5' : '1';
    callVideoToggleBtn.dataset.icon = off ? 'videoOff' : 'video';
    callVideoToggleBtn.innerHTML = '';
    callVideoToggleBtn.appendChild(Icons.create(off ? 'videoOff' : 'video', 24));
  });

  // ===== BROADCAST SIGNAL HANDLER =====
  DB.onSignal((data) => {
    if (!data || !currentUser) return;

    // Route call signals to Calls module
    if (data.type && data.type.startsWith('call-')) {
      Calls.handleSignal(data);
      return;
    }

    // Handle incoming messages
    if (data.type === 'message' && data.to === currentUser.login) {
      loadChatsList();
      if (currentChat === data.from) {
        renderMessages(currentChat);
        scrollToBottom();
      } else {
        document.title = '🔔 NovaChat - ' + data.fromName;
        setTimeout(() => { document.title = 'NovaChat'; }, 3000);
        playNotification();
        showToast('Новое сообщение от ' + (data.fromName || data.from), 'info');
      }
    }
  });

  // ===== ONLINE STATUS =====
  setInterval(() => {
    if (currentUser) {
      DB.saveUser(currentUser.login, { ...currentUser, online: true });
    }
  }, 15000);

  // ===== RESIZE HANDLER =====
  window.addEventListener('resize', () => {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;
    if (wasMobile !== isMobile && isMobile) {
      showSidebar();
    }
  });

  // ===== HELPERS =====
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== APPLY CUSTOM ICONS =====
  Icons.apply();

  // ===== INIT =====
  const savedUser = Auth.init();
  if (savedUser) {
    currentUser = savedUser;
    enterApp();
  }

  initSettings();
  Chat.init(() => {});

  console.log('✦ NovaChat v2.0 ✦');
  console.log('  ✓ Регистрация/Вход');
  console.log('  ✓ Кастомные SVG-эмодзи');
  console.log('  ✓ Аудио/Видео звонки (WebRTC)');
  console.log('  ✓ Голосовые сообщения');
  console.log('  ✓ Полноценные настройки');
  console.log('  ✓ Анимации и плавность');
})();
