/* ============================================================
   NeonChat — Main App (Integrates with NovaChat server)
   ============================================================ */

// ======================== СОСТОЯНИЕ ========================
const state = {
  user: null, chats: [], currentChat: null, messages: {},
  isRecording: false, mediaRecorder: null, audioChunks: [],
  recordingTimer: null, recordingSeconds: 0,
  onlineUsers: new Set(),
  settings: {}
};

const SETTINGS_DEFAULTS = {
  darkTheme: true, particles: true, glow: true, accentColor: '#00f3ff', animations: true,
  msgNotif: true, soundNotif: true, previewNotif: true, dnd: false,
  enterSend: true, msgTime: true, fontSize: 14, compact: false,
  onlineStatus: true, readStatus: true,
  soundIncoming: true, soundOutgoing: true, soundCall: true, volume: 80,
  sidebar: true, language: 'ru', autoStart: true
};

// DOM refs
const $ = id => document.getElementById(id);
const dom = {};

function initDom() {
  const ids = [
    'loginScreen', 'appScreen', 'loginForm', 'registerForm', 'showRegister', 'showLogin',
    'loginUsername', 'loginPassword', 'regName', 'regLogin', 'regEmail', 'regPassword', 'rememberMe',
    'serverStatus',
    'sidebar', 'contactsList', 'searchInput', 'settingsBtn',
    'messagesList', 'messagesArea', 'messagesEmpty',
    'chatHeader', 'chatUserName', 'chatUserStatus', 'chatUserId', 'chatAvatar',
    'chatInput', 'chatInputArea', 'sendBtn', 'voiceBtn', 'voiceIcon', 'voiceTimer',
    'recordBtn', 'emojiBtn', 'toggleEmojiPanel', 'menuBtn', 'menuToggle', 'callBtn',
    'rightPanel', 'panelContent', 'panelTitle', 'closePanel',
    'contextMenu', 'ctxProfile', 'ctxEmoji', 'ctxNewChat', 'ctxSettings', 'ctxLogout',
    'profileModal', 'profileName', 'profileLogin', 'profileEmail', 'profileStatus', 'profileAvatar',
    'closeProfileModal',
    'newChatModal', 'newChatSearch', 'searchResults', 'closeNewChat',
    'settingsModal', 'closeSettings', 'settingsBody', 'settingsCategories', 'particles',
    'setDarkTheme', 'setParticles', 'setGlow', 'setAnimations', 'accentColors',
    'setMsgNotif', 'setSoundNotif', 'setPreviewNotif', 'setDnd',
    'setEnterSend', 'setMsgTime', 'setFontSize', 'fontSizeVal', 'setCompact',
    'setOnlineStatus', 'setReadStatus', 'setBlockedUsers',
    'setSoundIncoming', 'setSoundOutgoing', 'setSoundCall', 'setVolume', 'volumeVal',
    'setSidebar', 'setLanguage', 'setAutoStart',
    'setDisplayName', 'saveProfileName', 'resetProfileName',
    'setOldPass', 'setNewPass', 'savePassBtn', 'deleteAccountBtn',
    'toastContainer'
  ];
  ids.forEach(id => { dom[id] = $(id); });
}

// ======================== УТИЛИТЫ ========================
function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const COLORS = ['#00f3ff','#ff00e4','#7b2ff7','#00ff88','#ff6600','#ffdd00','#ff3355','#00ccff','#aa66ff'];
  return COLORS[Math.abs(hash) % COLORS.length];
}

// ======================== НАСТРОЙКИ ========================
function loadSettings() {
  try {
    const saved = localStorage.getItem('neonchat_settings');
    if (saved) state.settings = { ...SETTINGS_DEFAULTS, ...JSON.parse(saved) };
    else state.settings = { ...SETTINGS_DEFAULTS };
  } catch { state.settings = { ...SETTINGS_DEFAULTS }; }
}

function saveSettings() {
  localStorage.setItem('neonchat_settings', JSON.stringify(state.settings));
}

function applySettings() {
  const s = state.settings;

  // Theme
  document.documentElement.style.setProperty('--neon-cyan', s.accentColor);

  // Animations
  document.querySelectorAll('.message, .contact-item, .emoji-item, .toast').forEach(el => {
    el.style.animation = s.animations ? '' : 'none !important';
  });

  // Particles
  dom.particles.style.display = s.particles ? 'block' : 'none';

  // Glow
  document.documentElement.style.setProperty('--shadow-glow', s.glow ? `0 0 30px ${s.accentColor}20` : 'none');

  // Font size
  dom.messagesList.style.fontSize = s.fontSize + 'px';

  // Compact
  document.documentElement.style.setProperty('--msg-padding-y', s.compact ? '6px' : '12px');
  document.documentElement.style.setProperty('--msg-padding-x', s.compact ? '10px' : '16px');

  // Sidebar
  dom.sidebar.style.display = s.sidebar ? '' : 'none';

  // Enter to send
  // Handled in event listener

  // Sync toggle UI
  syncSettingsUI();
}

function syncSettingsUI() {
  const s = state.settings;
  if (dom.setDarkTheme) dom.setDarkTheme.checked = s.darkTheme;
  if (dom.setParticles) dom.setParticles.checked = s.particles;
  if (dom.setGlow) dom.setGlow.checked = s.glow;
  if (dom.setAnimations) dom.setAnimations.checked = s.animations;
  if (dom.setMsgNotif) dom.setMsgNotif.checked = s.msgNotif;
  if (dom.setSoundNotif) dom.setSoundNotif.checked = s.soundNotif;
  if (dom.setPreviewNotif) dom.setPreviewNotif.checked = s.previewNotif;
  if (dom.setDnd) dom.setDnd.checked = s.dnd;
  if (dom.setEnterSend) dom.setEnterSend.checked = s.enterSend;
  if (dom.setMsgTime) dom.setMsgTime.checked = s.msgTime;
  if (dom.setFontSize) dom.setFontSize.value = s.fontSize;
  if (dom.fontSizeVal) dom.fontSizeVal.textContent = s.fontSize;
  if (dom.setCompact) dom.setCompact.checked = s.compact;
  if (dom.setOnlineStatus) dom.setOnlineStatus.checked = s.onlineStatus;
  if (dom.setReadStatus) dom.setReadStatus.checked = s.readStatus;
  if (dom.setSoundIncoming) dom.setSoundIncoming.checked = s.soundIncoming;
  if (dom.setSoundOutgoing) dom.setSoundOutgoing.checked = s.soundOutgoing;
  if (dom.setSoundCall) dom.setSoundCall.checked = s.soundCall;
  if (dom.setVolume) dom.setVolume.value = s.volume;
  if (dom.volumeVal) dom.volumeVal.textContent = s.volume + '%';
  if (dom.setSidebar) dom.setSidebar.checked = s.sidebar;
  if (dom.setLanguage) dom.setLanguage.value = s.language;
  if (dom.setAutoStart) dom.setAutoStart.checked = s.autoStart;

  // Accent color
  dom.accentColors?.querySelectorAll('.color-opt').forEach(el => {
    el.classList.toggle('active', el.dataset.color === s.accentColor);
  });
}

function toggleSettings() {
  const open = dom.settingsModal.style.display === 'flex';
  dom.settingsModal.style.display = open ? 'none' : 'flex';
  if (!open) syncSettingsUI();
}

function setupSettingsEvents() {
  // Accordion
  dom.settingsCategories.addEventListener('click', e => {
    const header = e.target.closest('.settings-cat-header');
    if (!header) return;
    const cat = header.closest('.settings-cat');
    if (!cat) return;
    cat.classList.toggle('open');
  });

  // Toggle handler helper
  const onToggle = (id, key) => {
    const el = dom[id];
    if (!el) return;
    el.addEventListener('change', () => {
      state.settings[key] = el.checked;
      saveSettings();
      applySettings();
    });
  };

  onToggle('setDarkTheme', 'darkTheme');
  onToggle('setParticles', 'particles');
  onToggle('setGlow', 'glow');
  onToggle('setAnimations', 'animations');
  onToggle('setMsgNotif', 'msgNotif');
  onToggle('setSoundNotif', 'soundNotif');
  onToggle('setPreviewNotif', 'previewNotif');
  onToggle('setDnd', 'dnd');
  onToggle('setEnterSend', 'enterSend');
  onToggle('setMsgTime', 'msgTime');
  onToggle('setCompact', 'compact');
  onToggle('setOnlineStatus', 'onlineStatus');
  onToggle('setReadStatus', 'readStatus');
  onToggle('setSoundIncoming', 'soundIncoming');
  onToggle('setSoundOutgoing', 'soundOutgoing');
  onToggle('setSoundCall', 'soundCall');
  onToggle('setSidebar', 'sidebar');
  onToggle('setAutoStart', 'autoStart');

  // Sliders
  if (dom.setFontSize) {
    dom.setFontSize.addEventListener('input', () => {
      state.settings.fontSize = parseInt(dom.setFontSize.value);
      dom.fontSizeVal.textContent = dom.setFontSize.value;
      saveSettings();
      applySettings();
    });
  }
  if (dom.setVolume) {
    dom.setVolume.addEventListener('input', () => {
      state.settings.volume = parseInt(dom.setVolume.value);
      dom.volumeVal.textContent = dom.setVolume.value + '%';
      saveSettings();
    });
  }

  // Accent color
  dom.accentColors?.addEventListener('click', e => {
    const opt = e.target.closest('.color-opt');
    if (!opt) return;
    document.querySelectorAll('.color-opt').forEach(el => el.classList.remove('active'));
    opt.classList.add('active');
    state.settings.accentColor = opt.dataset.color;
    saveSettings();
    applySettings();
  });

  // Language
  if (dom.setLanguage) {
    dom.setLanguage.addEventListener('change', () => {
      state.settings.language = dom.setLanguage.value;
      saveSettings();
    });
  }

  // Empty state new chat button (via delegation)
  dom.messagesArea?.addEventListener('click', e => {
    if (e.target.closest('#emptyStartChat')) showNewChatModal();
  });

  // Close
  dom.closeSettings?.addEventListener('click', () => { dom.settingsModal.style.display = 'none'; });
  dom.settingsModal?.addEventListener('click', e => {
    if (e.target === dom.settingsModal) dom.settingsModal.style.display = 'none';
  });

  // Profile name
  dom.saveProfileName?.addEventListener('click', () => {
    const name = dom.setDisplayName?.value.trim();
    if (name) { toast('Имя обновлено', 'success'); }
  });
  dom.resetProfileName?.addEventListener('click', () => {
    if (dom.setDisplayName) dom.setDisplayName.value = state.user?.name || '';
  });

  // Password
  dom.savePassBtn?.addEventListener('click', () => {
    toast('Смена пароля (требуется сервер)', 'info');
  });

  // Delete account
  dom.deleteAccountBtn?.addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите удалить аккаунт?')) {
      toast('Аккаунт удалён', 'info');
    }
  });
}

// ======================== ЧАСТИЦЫ ========================
function createParticles() {
  dom.particles.innerHTML = '';
  const colors = ['#00f3ff', '#ff00e4', '#7b2ff7', '#00ff88', '#ffdd00', '#ff6600'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 2 + Math.random() * 6;
    const x = Math.random() * 100;
    const dur = 15 + Math.random() * 25;
    const delay = Math.random() * 20;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `left:${x}%;width:${size}px;height:${size}px;background:${color};--p-op:${0.05 + Math.random() * 0.12};animation-duration:${dur}s;animation-delay:${delay}s;`;
    dom.particles.appendChild(p);
  }
}

function getInitials(name) {
  return name.charAt(0).toUpperCase();
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  dom.toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ======================== ЭМОДЗИ ========================
function buildEmojiPanel() {
  let html = '';
  for (const [cat, emojis] of Object.entries(NOVA_EMOJI)) {
    html += `<div class="emoji-category-title">${cat}</div><div class="emoji-grid">`;
    emojis.forEach(e => {
      html += `<button class="emoji-item" data-emoji-id="${e.id}" title="${e.name}">${e.svg}</button>`;
    });
    html += '</div>';
  }
  dom.panelContent.innerHTML = html;

  dom.panelContent.querySelectorAll('.emoji-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.emojiId;
      for (const emojis of Object.values(NOVA_EMOJI)) {
        const emoji = emojis.find(e => e.id === id);
        if (emoji) { insertEmoji(emoji); return; }
      }
    });
  });
}

function insertEmoji(emoji) {
  const img = document.createElement('img');
  const svgBlob = new Blob([emoji.svg], { type: 'image/svg+xml;charset=utf-8' });
  img.src = URL.createObjectURL(svgBlob);
  img.className = 'emoji-inline';
  img.alt = emoji.name;
  img.draggable = false;

  const sel = window.getSelection();
  if (sel.getRangeAt && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    if (dom.chatInput.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(img);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      dom.chatInput.appendChild(img);
      dom.chatInput.appendChild(document.createTextNode('\u00A0'));
    }
  } else {
    dom.chatInput.appendChild(img);
    dom.chatInput.appendChild(document.createTextNode('\u00A0'));
  }
  dom.chatInput.dispatchEvent(new Event('input'));
}

// ======================== ГОЛОСОВЫЕ ========================
async function startVoiceRecording() {
  if (state.isRecording) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    });
    state.audioChunks = [];
    state.recordingSeconds = 0;
    state.isRecording = true;

    dom.voiceBtn.classList.add('recording');
    dom.voiceIcon.style.display = 'none';
    dom.voiceTimer.style.display = 'block';
    updateVoiceTimer();
    state.recordingTimer = setInterval(() => {
      state.recordingSeconds++;
      updateVoiceTimer();
    }, 1000);

    state.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) state.audioChunks.push(e.data); };
    state.mediaRecorder.onstop = () => {
      clearInterval(state.recordingTimer);
      dom.voiceBtn.classList.remove('recording');
      dom.voiceIcon.style.display = '';
      dom.voiceTimer.style.display = 'none';
      stream.getTracks().forEach(t => t.stop());

      const blob = new Blob(state.audioChunks, { type: 'audio/webm' });
      const dur = state.recordingSeconds;
      if (dur < 1) { toast('Слишком короткая запись', 'error'); return; }

      const reader = new FileReader();
      reader.onload = e => {
        dom.recordBtn.style.display = 'flex';
        dom.sendBtn.style.display = 'none';
        dom.chatInput.textContent = '';
        dom.chatInput.style.display = 'none';
        dom.recordBtn.dataset.blob = e.target.result;
        dom.recordBtn.dataset.dur = dur;
        toast(`Запись ${formatDuration(dur)} готова к отправке`, 'info');
      };
      reader.readAsDataURL(blob);
    };
    state.mediaRecorder.start();
  } catch (err) {
    toast('Нет доступа к микрофону', 'error');
  }
}

function updateVoiceTimer() {
  dom.voiceTimer.textContent = formatDuration(state.recordingSeconds);
}

function stopVoiceRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.stop();
  }
  state.isRecording = false;
}

function cancelVoiceMode() {
  dom.recordBtn.style.display = 'none';
  dom.sendBtn.style.display = 'flex';
  dom.chatInput.style.display = 'block';
}

function sendVoiceMessage() {
  const b64 = dom.recordBtn.dataset.blob;
  const dur = parseInt(dom.recordBtn.dataset.dur) || 0;
  if (!b64 || dur < 1 || !state.currentChat) return;

  DB.sendMessage(state.currentChat, '[Голосовое сообщение]', 'voice', b64, dur);
  cancelVoiceMode();
}

// ======================== СООБЩЕНИЯ ========================
function renderMessages(chatWith) {
  const msgs = state.messages[chatWith] || [];
  dom.messagesList.innerHTML = '';

  if (msgs.length === 0) {
    dom.messagesEmpty.style.display = 'block';
    return;
  }
  dom.messagesEmpty.style.display = 'none';

  msgs.forEach(msg => {
    const isOutgoing = msg.from === state.user.login;
    let el;

    if (msg.type === 'voice') {
      el = document.createElement('div');
      el.className = `message ${isOutgoing ? 'outgoing' : 'incoming'} voice-message`;

      const playBtn = document.createElement('button');
      playBtn.className = 'voice-play-btn';
      playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><polygon points="8,5 19,12 8,19" fill="currentColor"/></svg>';
      let isPlaying = false;
      let audio = null;
      playBtn.addEventListener('click', () => {
        if (isPlaying && audio) { audio.pause(); audio.currentTime = 0; isPlaying = false; return; }
        isPlaying = true;
        audio = new Audio(msg.audioData);
        audio.onended = () => { isPlaying = false; };
        audio.play();
      });

      const wave = document.createElement('div');
      wave.className = 'voice-wave';
      for (let i = 0; i < 8; i++) {
        const bar = document.createElement('span');
        bar.style.height = `${6 + Math.random() * 18}px`;
        wave.appendChild(bar);
      }

      const durEl = document.createElement('span');
      durEl.className = 'voice-dur';
      durEl.textContent = formatDuration(msg.duration || 0);

      el.appendChild(playBtn);
      el.appendChild(wave);
      el.appendChild(durEl);
    } else {
      el = document.createElement('div');
      el.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
      el.innerHTML = msg.text;
    }

    const time = document.createElement('div');
    time.className = 'msg-time';
    time.textContent = msg.formattedTime || formatTime(msg.time);
    el.appendChild(time);

    dom.messagesList.appendChild(el);
  });

  dom.messagesList.scrollTop = dom.messagesList.scrollHeight;
}

function sendTextMessage() {
  const text = dom.chatInput.innerHTML.trim();
  if (!text || text === '<br>' || !state.currentChat) return;
  DB.sendMessage(state.currentChat, text, 'text');
  dom.chatInput.innerHTML = '';
}

// ======================== ЧАТЫ / КОНТАКТЫ ========================
function renderChats(filter = '') {
  dom.contactsList.innerHTML = '';

  let chats = state.chats;
  if (filter) {
    const f = filter.toLowerCase();
    chats = chats.filter(c => c.name.toLowerCase().includes(f) || c.with.toLowerCase().includes(f));
  }

  if (chats.length === 0) {
    dom.contactsList.innerHTML = `
      <div style="text-align:center;padding:30px;">
        <div style="font-size:40px;margin-bottom:12px;opacity:0.3;">💬</div>
        <div style="color:var(--text-muted);font-size:13px;margin-bottom:16px;">
          ${filter ? 'Ничего не найдено' : 'У вас пока нет чатов'}
        </div>
        <button class="settings-btn" id="emptyNewChatBtn" style="font-size:13px;padding:10px 24px;">
          <span style="display:flex;align-items:center;gap:6px;justify-content:center;">
            <svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            Новый чат
          </span>
        </button>
      </div>`;
    setTimeout(() => document.getElementById('emptyNewChatBtn')?.addEventListener('click', showNewChatModal), 100);
    return;
  }

  chats.forEach(chat => {
    const div = document.createElement('div');
    div.className = `contact-item ${chat.with === state.currentChat ? 'active' : ''}`;
    div.dataset.login = chat.with;

    const color = getColor(chat.name);
    const online = state.onlineUsers.has(chat.with);
    div.innerHTML = `
      <div class="contact-avatar ${online ? 'online' : ''}" style="background:${color}20;color:${color};border:2px solid ${color}40;">
        ${chat.avatar || getInitials(chat.name)}
      </div>
      <div class="contact-info">
        <div class="contact-name">${chat.name}</div>
        <div class="contact-id">@${chat.with}</div>
        <div class="contact-preview">${chat.lastMessage || ''}</div>
      </div>
      <div class="contact-time">${chat.lastTime || ''}</div>
    `;

    div.addEventListener('click', () => selectChat(chat.with));
    dom.contactsList.appendChild(div);
  });
}

function selectChat(chatWith) {
  state.currentChat = chatWith;
  const chat = state.chats.find(c => c.with === chatWith);
  if (!chat) return;

  const color = getColor(chat.name);
  dom.chatAvatar.style.background = `${color}20`;
  dom.chatAvatar.style.color = color;
  dom.chatAvatar.style.border = `2px solid ${color}40`;
  dom.chatAvatar.textContent = chat.avatar || getInitials(chat.name);
  dom.chatUserName.textContent = chat.name;
  dom.chatUserId.textContent = `@${chatWith}`;
  dom.chatUserStatus.textContent = state.onlineUsers.has(chatWith) ? 'онлайн' : 'офлайн';
  dom.chatUserStatus.style.color = state.onlineUsers.has(chatWith) ? 'var(--neon-green)' : 'var(--text-muted)';

  dom.chatHeader.style.display = 'flex';
  dom.chatInputArea.style.display = 'flex';

  if (!state.messages[chatWith]) state.messages[chatWith] = [];
  renderMessages(chatWith);

  // Load messages from server
  DB.getMessages(chatWith).then(msgs => {
    if (msgs.length > 0) {
      state.messages[chatWith] = msgs;
      renderMessages(chatWith);
    }
  });

  renderChats(dom.searchInput.value);
  if (window.innerWidth <= 820) dom.sidebar.classList.remove('open');
}

function addChatToList(chatInfo) {
  const idx = state.chats.findIndex(c => c.with === chatInfo.with);
  if (idx >= 0) {
    state.chats[idx] = { ...state.chats[idx], ...chatInfo };
  } else {
    state.chats.unshift(chatInfo);
  }
  renderChats(dom.searchInput.value);
}

// ======================== АВТОРИЗАЦИЯ ========================
function showLoginForm() { dom.loginForm.style.display = 'block'; dom.registerForm.style.display = 'none'; }
function showRegisterForm() { dom.loginForm.style.display = 'none'; dom.registerForm.style.display = 'block'; }

async function handleLogin(e) {
  e.preventDefault();
  const loginOrEmail = dom.loginUsername.value.trim();
  const password = dom.loginPassword.value.trim();
  if (!loginOrEmail || !password) { toast('Заполните все поля', 'error'); return; }

  setServerStatus('Вход...', '#ffdd00');
  const res = await Auth.login(loginOrEmail, password, dom.rememberMe.checked);
  if (res.success) {
    state.user = res.user;
    toast('Добро пожаловать!', 'success');
    enterApp();
  } else {
    setServerStatus(res.error || 'Ошибка входа', '#ff3355');
    toast(res.error || 'Ошибка входа', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = dom.regName.value.trim();
  const login = dom.regLogin.value.trim();
  const email = dom.regEmail.value.trim();
  const password = dom.regPassword.value.trim();

  if (!name || !login || !email || !password) { toast('Заполните все поля', 'error'); return; }
  if (password.length < 6) { toast('Пароль минимум 6 символов', 'error'); return; }

  setServerStatus('Регистрация...', '#ffdd00');
  const res = await Auth.register(name, login, email, password);
  if (res.success) {
    toast('Аккаунт создан! Войдите.', 'success');
    setServerStatus('Аккаунт создан', '#00ff88');
    showLoginForm();
    dom.loginUsername.value = login;
  } else {
    setServerStatus(res.error || 'Ошибка', '#ff3355');
    toast(res.error || 'Ошибка регистрации', 'error');
  }
}

function setServerStatus(text, color) {
  dom.serverStatus.textContent = text;
  dom.serverStatus.style.color = color || 'var(--text-muted)';
}

function enterApp() {
  dom.loginScreen.style.display = 'none';
  dom.appScreen.style.display = 'flex';
  initApp();
}

function handleLogout() {
  DB.clearSession();
  Auth.setUser(null);
  state.user = null;
  state.chats = [];
  state.messages = {};
  state.currentChat = null;
  dom.appScreen.style.display = 'none';
  dom.loginScreen.style.display = 'flex';
  dom.loginUsername.value = '';
  dom.loginPassword.value = '';
  setServerStatus('Войдите в аккаунт', 'var(--text-muted)');
  showLoginForm();
}

// ======================== ПОИСК / НОВЫЙ ЧАТ ========================
function showNewChatModal() {
  dom.newChatModal.style.display = 'flex';
  dom.newChatSearch.value = '';
  dom.searchResults.innerHTML = '';
  dom.newChatSearch.focus();
}

function closeNewChatModal() {
  dom.newChatModal.style.display = 'none';
}

let searchTimeout;

function handleSearchInput() {
  clearTimeout(searchTimeout);
  const q = dom.newChatSearch.value.trim();
  if (q.length < 1) { dom.searchResults.innerHTML = ''; return; }
  searchTimeout = setTimeout(async () => {
    const results = await DB.searchUsers(q);
    if (!results || results.length === 0) {
      dom.searchResults.innerHTML = '<div style="color:var(--text-muted);padding:16px;text-align:center;font-size:13px;">Ничего не найдено</div>';
      return;
    }
    dom.searchResults.innerHTML = '';
    results.forEach(u => {
      if (u.login === state.user.login) return;
      const div = document.createElement('div');
      div.className = 'contact-item';
      const color = getColor(u.name);
      const online = state.onlineUsers.has(u.login);
      div.innerHTML = `
        <div class="contact-avatar ${online ? 'online' : ''}" style="background:${color}20;color:${color};border:2px solid ${color}40;">${u.avatar || getInitials(u.name)}</div>
        <div class="contact-info">
          <div class="contact-name">${u.name}</div>
          <div class="contact-id">@${u.login}</div>
          <div class="contact-preview">${online ? 'онлайн' : 'офлайн'}</div>
        </div>
      `;
      div.addEventListener('click', () => {
        // Create or select chat
        const existing = state.chats.find(c => c.with === u.login);
        if (existing) {
          selectChat(u.login);
        } else {
          const newChat = {
            with: u.login,
            name: u.name,
            avatar: u.avatar || getInitials(u.name),
            lastMessage: '',
            lastTime: '',
            online
          };
          state.chats.unshift(newChat);
          renderChats();
          selectChat(u.login);
        }
        closeNewChatModal();
      });
      dom.searchResults.appendChild(div);
    });
  }, 300);
}

// ======================== ПАНЕЛИ И МЕНЮ ========================
function toggleRightPanel(type = 'emoji') {
  const isOpen = dom.rightPanel.style.display !== 'none';
  if (isOpen) { dom.rightPanel.style.display = 'none'; return; }
  dom.rightPanel.style.display = 'flex';
  if (type === 'emoji') {
    dom.panelTitle.textContent = 'Эмодзи';
    buildEmojiPanel();
  }
}

function toggleMenu(x, y) {
  dom.contextMenu.style.display = 'block';
  dom.contextMenu.style.left = `${x}px`;
  dom.contextMenu.style.top = `${y}px`;
}

function showProfile() {
  if (!state.user) return;
  const color = getColor(state.user.name);
  dom.profileAvatar.style.background = `${color}20`;
  dom.profileAvatar.style.color = color;
  dom.profileAvatar.style.border = `2px solid ${color}40`;
  dom.profileAvatar.textContent = getInitials(state.user.name);
  dom.profileName.textContent = state.user.name || state.user.login;
  dom.profileLogin.textContent = state.user.login;
  dom.profileEmail.textContent = state.user.email || '—';
  dom.profileStatus.textContent = 'онлайн';
  dom.profileModal.style.display = 'flex';
}

// ======================== СЕРВЕРНЫЕ СОБЫТИЯ ========================
function initServerHandlers() {
  DB.onMessage(data => {
    switch (data.type) {

      case '_connected':
        setServerStatus('Подключено ✓', '#00ff88');
        tryAutoLogin().then(ok => {
          if (!ok) setServerStatus('Войдите в аккаунт', 'var(--text-muted)');
        });
        break;

      case '_disconnected':
        setServerStatus('Сервер недоступен', '#ff3355');
        toast('Потеряно соединение с сервером', 'error');
        break;

      case 'login-res':
        // Handled in handleLogin
        break;

      case 'users-list':
        // Cache users
        break;

      case 'online-list':
        state.onlineUsers = new Set(data.users || []);
        renderChats(dom.searchInput.value);
        break;

      case 'user-status':
        if (data.online) state.onlineUsers.add(data.login);
        else state.onlineUsers.delete(data.login);

        // Update current chat status
        if (state.currentChat === data.login) {
          dom.chatUserStatus.textContent = data.online ? 'онлайн' : 'офлайн';
          dom.chatUserStatus.style.color = data.online ? 'var(--neon-green)' : 'var(--text-muted)';
        }
        renderChats(dom.searchInput.value);
        break;

      case 'chats-list':
        state.chats = data.chats || [];
        renderChats(dom.searchInput.value);
        break;

      case 'chat-update':
        addChatToList({
          with: data.with,
          name: data.name,
          avatar: data.avatar,
          lastMessage: data.lastMessage,
          lastTime: data.lastTime,
          online: data.online
        });
        break;

      case 'msgs-list':
        if (data.with) {
          state.messages[data.with] = data.messages || [];
          if (state.currentChat === data.with) renderMessages(data.with);
        }
        break;

      case 'new-msg':
        const msg = data.msg;
        if (!msg) break;
        const chatKey = [msg.from, msg.to].sort().join('_');
        const other = msg.from === state.user.login ? msg.to : msg.from;

        // Add to messages
        if (!state.messages[other]) state.messages[other] = [];
        state.messages[other].push(msg);

        if (state.currentChat === other) renderMessages(other);

        // Update chat list
        const userInfo = DB.getUser(other);
        addChatToList({
          with: other,
          name: userInfo?.name || other,
          avatar: userInfo?.avatar || getInitials(other),
          lastMessage: msg.type === 'voice' ? '🎤 Голосовое сообщение' : (msg.text || ''),
          lastTime: msg.formattedTime || formatTime(msg.time),
          online: state.onlineUsers.has(other)
        });
        break;

      case 'search-res':
        break;

      // Call signaling
      case 'call-offer':
      case 'call-answer':
      case 'call-ice-candidate':
      case 'call-end':
      case 'call-decline':
      case 'call-accept':
        Calls.handleSignal(data);
        break;
    }
  });
}

// ======================== ИНИЦИАЛИЗАЦИЯ ========================
function initApp() {
  if (dom.setDisplayName) dom.setDisplayName.value = state.user?.name || '';
  buildEmojiPanel();

  // Load chats
  DB.getChats().then(chats => {
    state.chats = chats;
    renderChats();

    if (chats.length > 0 && !state.currentChat) {
      selectChat(chats[0].with);
    } else if (state.currentChat) {
      selectChat(state.currentChat);
    }
  });

  // Update header
  if (state.currentChat) {
    dom.chatHeader.style.display = 'flex';
    dom.chatInputArea.style.display = 'flex';
  }
}

function setupEvents() {
  // Auth
  dom.loginForm.addEventListener('submit', handleLogin);
  dom.registerForm.addEventListener('submit', handleRegister);
  dom.showRegister.addEventListener('click', showRegisterForm);
  dom.showLogin.addEventListener('click', showLoginForm);

  // Chat input
  dom.sendBtn.addEventListener('click', sendTextMessage);
  dom.chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && state.settings.enterSend !== false) { e.preventDefault(); sendTextMessage(); }
  });

  // Voice
  let pressTimer;
  dom.voiceBtn.addEventListener('mousedown', () => { pressTimer = setTimeout(startVoiceRecording, 200); });
  dom.voiceBtn.addEventListener('mouseup', () => { clearTimeout(pressTimer); if (state.isRecording) stopVoiceRecording(); });
  dom.voiceBtn.addEventListener('mouseleave', () => { clearTimeout(pressTimer); });
  dom.voiceBtn.addEventListener('touchstart', e => { e.preventDefault(); pressTimer = setTimeout(startVoiceRecording, 200); });
  dom.voiceBtn.addEventListener('touchend', e => { e.preventDefault(); clearTimeout(pressTimer); if (state.isRecording) stopVoiceRecording(); });
  dom.recordBtn.addEventListener('click', sendVoiceMessage);

  // Emoji
  dom.emojiBtn.addEventListener('click', () => toggleRightPanel('emoji'));
  dom.toggleEmojiPanel.addEventListener('click', () => toggleRightPanel('emoji'));
  dom.closePanel.addEventListener('click', () => { dom.rightPanel.style.display = 'none'; });

  // Search contacts sidebar
  dom.searchInput.addEventListener('input', e => renderChats(e.target.value));

  // Menu
  dom.menuBtn.addEventListener('click', e => {
    const rect = e.currentTarget.getBoundingClientRect();
    toggleMenu(rect.left - 80, rect.bottom + 4);
  });
  dom.menuToggle.addEventListener('click', () => dom.sidebar.classList.toggle('open'));
  dom.settingsBtn.addEventListener('click', toggleSettings);
  document.addEventListener('click', e => {
    if (!dom.contextMenu.contains(e.target) && e.target !== dom.menuBtn) dom.contextMenu.style.display = 'none';
  });
  dom.ctxProfile.addEventListener('click', () => { dom.contextMenu.style.display = 'none'; showProfile(); });
  dom.ctxEmoji.addEventListener('click', () => { dom.contextMenu.style.display = 'none'; toggleRightPanel('emoji'); });
  dom.ctxNewChat.addEventListener('click', () => { dom.contextMenu.style.display = 'none'; showNewChatModal(); });
  dom.ctxSettings.addEventListener('click', () => { dom.contextMenu.style.display = 'none'; toggleSettings(); });
  dom.ctxLogout.addEventListener('click', () => { dom.contextMenu.style.display = 'none'; handleLogout(); });

  // Profile modal
  dom.closeProfileModal.addEventListener('click', () => { dom.profileModal.style.display = 'none'; });
  dom.profileModal.addEventListener('click', e => { if (e.target === dom.profileModal) dom.profileModal.style.display = 'none'; });

  // New chat modal
  dom.closeNewChat.addEventListener('click', closeNewChatModal);
  dom.newChatModal.addEventListener('click', e => { if (e.target === dom.newChatModal) closeNewChatModal(); });
  dom.newChatSearch.addEventListener('input', handleSearchInput);

  // Call button
  dom.callBtn.addEventListener('click', () => {
    if (!state.currentChat) { toast('Выберите чат', 'info'); return; }
    const chat = state.chats.find(c => c.with === state.currentChat);
    Calls.startCall(state.currentChat, chat?.name || state.currentChat, false);
  });
}

async function tryAutoLogin() {
  const saved = DB.getSession();
  if (!saved || !saved.login || !saved.password) return false;

  setServerStatus('Восстановление сессии...', '#ffdd00');
  const res = await DB.login(saved.login, saved.password);
  if (res.success) {
    state.user = res.user;
    Auth.setUser(res.user, true);
    toast('С возвращением!', 'success');
    enterApp();
    return true;
  }
  return false;
}

function init() {
  initDom();
  loadSettings();
  createParticles();
  applySettings();
  setupEvents();
  setupSettingsEvents();
  initServerHandlers();

  // Pre-fill display name if available
  if (dom.setDisplayName) dom.setDisplayName.value = state.user?.name || '';

  Calls.init(
    (from, fromName, isVideo) => toast(`Входящий звонок от ${fromName}`, 'info'),
    () => {}
  );

  // Show login screen with connection status
  dom.loginScreen.style.display = 'flex';

  if (DB.connected) {
    setServerStatus('Подключено', '#00ff88');
    tryAutoLogin().then(ok => {
      if (!ok) {
        dom.loginScreen.style.display = 'flex';
        setServerStatus('Войдите в аккаунт', 'var(--text-muted)');
      }
    });
  } else {
    setServerStatus('Подключение к серверу...', '#ffdd00');
  }
}

document.addEventListener('DOMContentLoaded', init);
