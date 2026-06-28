const WS_URL = (() => {
  const loc = window.location;
  if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
    return `ws://${loc.hostname}:3001`;
  }
  return `wss://${loc.hostname}`;
})();

const state = {
  user: null, chats: [], messages: {},
  currentChat: null,
  isRecording: false, mediaRecorder: null, audioChunks: [],
  recordingTimer: null, recordingSeconds: 0,
  onlineUsers: new Set(),
  settings: {},
  ws: null, reconnectTimer: null, connected: false, wsReady: false
};

const SETTINGS_DEFAULTS = {
  darkTheme: true, particles: true, glow: true, accentColor: '#00f3ff', animations: true,
  msgNotif: true, soundNotif: true, previewNotif: true, dnd: false,
  enterSend: true, msgTime: true, fontSize: 14, compact: false,
  onlineStatus: true, readStatus: true,
  soundIncoming: true, soundOutgoing: true, soundCall: true, volume: 80,
  sidebar: true, language: 'ru', autoStart: true
};

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
    'toastContainer', 'emptyStartChat'
  ];
  ids.forEach(id => { dom[id] = $(id); });
}

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const COLORS = ['#00f3ff','#ff00e4','#7b2ff7','#00ff88','#ff6600','#ffdd00','#ff3355','#00ccff','#aa66ff'];
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name) { return name.charAt(0).toUpperCase(); }

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, '0')}`;
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  dom.toastContainer.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 3000);
}

// ======================== ХРАНИЛИЩЕ (localStorage) ========================
function saveAll() {
  try {
    localStorage.setItem('neonchat_data', JSON.stringify({
      user: state.user, chats: state.chats, messages: state.messages
    }));
  } catch (e) {
    console.warn('localStorage quota exceeded');
    for (const key of Object.keys(state.messages)) {
      state.messages[key] = state.messages[key].filter(m => m.type !== 'voice');
    }
    try {
      localStorage.setItem('neonchat_data', JSON.stringify({
        user: state.user, chats: state.chats, messages: state.messages
      }));
    } catch { toast('Ошибка сохранения', 'error'); }
  }
}

function loadAll() {
  try {
    const d = JSON.parse(localStorage.getItem('neonchat_data'));
    if (d) { state.user = d.user; state.chats = d.chats || []; state.messages = d.messages || {}; return true; }
  } catch {}
  return false;
}

function saveSession(u, remember) {
  const data = { login: u.login, name: u.name, email: u.email, _pw: u._pw };
  if (remember) {
    localStorage.setItem('neonchat_session', JSON.stringify(data));
  } else {
    sessionStorage.setItem('neonchat_session', JSON.stringify(data));
  }
}

function getSession() {
  try {
    let s = sessionStorage.getItem('neonchat_session');
    if (s) return JSON.parse(s);
    s = localStorage.getItem('neonchat_session');
    if (s) return JSON.parse(s);
  } catch {}
  return null;
}

function clearSession() {
  localStorage.removeItem('neonchat_session');
  sessionStorage.removeItem('neonchat_session');
}

// ======================== WEBSOCKET ========================
function connectWS() {
  if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) return;
  try {
    state.ws = new WebSocket(WS_URL);
  } catch { return; }
  state.ws.onopen = () => {
    state.connected = true;
    state.wsReady = true;
    clearTimeout(state.reconnectTimer);
    if (state.user) {
      sendWS({ type: 'login', loginOrEmail: state.user.login, password: state.user._pw });
    }
  };
  state.ws.onclose = () => {
    state.connected = false;
    state.wsReady = false;
    scheduleReconnect();
  };
  state.ws.onerror = () => {};
  state.ws.onmessage = (event) => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }
    handleWSMessage(data);
  };
}

function scheduleReconnect() {
  clearTimeout(state.reconnectTimer);
  state.reconnectTimer = setTimeout(connectWS, 5000);
}

function sendWS(data) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(data));
  }
}

function handleWSMessage(data) {
  switch (data.type) {
    case 'new-msg': {
      const msg = data.msg;
      const other = msg.from === state.user.login ? msg.to : msg.from;
      if (!state.messages[other]) state.messages[other] = [];
      state.messages[other].push(msg);
      saveAll();
      if (state.currentChat === other) renderMessages(other);
      updateChatListFromMsg(msg, other);
      if (msg.from !== state.user.login && state.currentChat !== other) {
        if (state.settings.msgNotif !== false && state.settings.dnd !== true) {
          toast(`✉ ${msg.from}: ${msg.text?.replace(/<[^>]+>/g, '').slice(0, 50) || '🎤 Голосовое'}`, 'info');
        }
      }
      break;
    }
    case 'user-status':
      if (data.online) {
        state.onlineUsers.add(data.login);
      } else {
        state.onlineUsers.delete(data.login);
      }
      renderChats(dom.searchInput.value);
      if (state.currentChat === data.login) {
        dom.chatUserStatus.textContent = data.online ? 'онлайн' : 'офлайн';
        dom.chatUserStatus.style.color = data.online ? 'var(--neon-green)' : 'var(--text-muted)';
      }
      break;
    case 'online-list':
      state.onlineUsers = new Set(data.users || []);
      renderChats(dom.searchInput.value);
      break;
  }
}

// ======================== АВТОРИЗАЦИЯ ========================
function showLoginForm() { dom.loginForm.style.display = 'block'; dom.registerForm.style.display = 'none'; }
function showRegisterForm() { dom.loginForm.style.display = 'none'; dom.registerForm.style.display = 'block'; }

function handleLogin(e) {
  e.preventDefault();
  const username = dom.loginUsername.value.trim();
  const password = btoa(dom.loginPassword.value.trim());
  if (!username || !password) { toast('Заполните поля', 'error'); return; }

  const saved = loadAll();
  if (!saved || !state.user || state.user.name !== username) {
    toast('Пользователь не найден', 'error');
    return;
  }
  if (state.user._pw !== password) {
    toast('Неверный пароль', 'error');
    return;
  }
  saveSession(state.user, dom.rememberMe.checked);
  toast('Добро пожаловать!', 'success');
  enterApp();
}

function handleRegister(e) {
  e.preventDefault();
  const name = dom.regName.value.trim();
  const login = dom.regLogin.value.trim();
  const email = dom.regEmail.value.trim();
  const password = dom.regPassword.value.trim();
  if (!name || !login || !email || !password) { toast('Заполните поля', 'error'); return; }
  if (password.length < 4) { toast('Пароль минимум 4 символа', 'error'); return; }

  if (loadAll() && state.user) {
    toast('Аккаунт уже существует. Войдите.', 'error');
    return;
  }

  state.user = { name, login, email, _pw: btoa(password), created: Date.now() };
  state.chats = [];
  state.messages = {};
  saveAll();
  saveSession(state.user, true);
  toast('Аккаунт создан! Теперь найдите собеседника через Новый чат', 'success');
  enterApp();
}

function enterApp() {
  dom.loginScreen.style.display = 'none';
  dom.appScreen.style.display = 'flex';
  if (state.ws && state.ws.readyState === WebSocket.OPEN && state.user) {
    sendWS({ type: 'login', loginOrEmail: state.user.login, password: state.user._pw });
  }
  initApp();
}

function handleLogout() {
  clearSession();
  state.user = null; state.chats = []; state.messages = {}; state.currentChat = null;
  dom.appScreen.style.display = 'none';
  dom.loginScreen.style.display = 'flex';
  showLoginForm();
  dom.serverStatus.textContent = 'Войдите в аккаунт';
  dom.serverStatus.style.color = '';
  if (dom.setDisplayName) dom.setDisplayName.value = '';
}

// ======================== НАСТРОЙКИ ========================
function loadSettings() {
  try {
    const s = localStorage.getItem('neonchat_settings');
    state.settings = s ? { ...SETTINGS_DEFAULTS, ...JSON.parse(s) } : { ...SETTINGS_DEFAULTS };
  } catch { state.settings = { ...SETTINGS_DEFAULTS }; }
}

function saveSettings() {
  localStorage.setItem('neonchat_settings', JSON.stringify(state.settings));
}

function applySettings() {
  const s = state.settings;
  document.documentElement.style.setProperty('--neon-cyan', s.accentColor);
  document.documentElement.style.setProperty('--shadow-glow', s.glow ? `0 0 30px ${s.accentColor}20` : 'none');
  document.documentElement.style.setProperty('--msg-padding-y', s.compact ? '6px' : '12px');
  document.documentElement.style.setProperty('--msg-padding-x', s.compact ? '10px' : '16px');
  dom.particles.style.display = s.particles ? 'block' : 'none';
  dom.messagesList.style.fontSize = s.fontSize + 'px';
  dom.sidebar.style.display = s.sidebar ? '' : 'none';
  syncSettingsUI();
}

function syncSettingsUI() {
  const s = state.settings;
  const toggle = (id, key) => { if (dom[id]) dom[id].checked = s[key]; };
  toggle('setDarkTheme','darkTheme'); toggle('setParticles','particles');
  toggle('setGlow','glow'); toggle('setAnimations','animations');
  toggle('setMsgNotif','msgNotif'); toggle('setSoundNotif','soundNotif');
  toggle('setPreviewNotif','previewNotif'); toggle('setDnd','dnd');
  toggle('setEnterSend','enterSend'); toggle('setMsgTime','msgTime');
  toggle('setCompact','compact'); toggle('setOnlineStatus','onlineStatus');
  toggle('setReadStatus','readStatus'); toggle('setSoundIncoming','soundIncoming');
  toggle('setSoundOutgoing','soundOutgoing'); toggle('setSoundCall','soundCall');
  toggle('setSidebar','sidebar'); toggle('setAutoStart','autoStart');
  if (dom.setFontSize) { dom.setFontSize.value = s.fontSize; dom.fontSizeVal.textContent = s.fontSize; }
  if (dom.setVolume) { dom.setVolume.value = s.volume; dom.volumeVal.textContent = s.volume + '%'; }
  if (dom.setLanguage) dom.setLanguage.value = s.language;
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
  dom.settingsCategories?.addEventListener('click', e => {
    const h = e.target.closest('.settings-cat-header');
    if (h) h.closest('.settings-cat')?.classList.toggle('open');
  });

  const onToggle = (id, key) => {
    dom[id]?.addEventListener('change', () => {
      state.settings[key] = dom[id].checked;
      saveSettings(); applySettings();
    });
  };
  onToggle('setDarkTheme','darkTheme'); onToggle('setParticles','particles');
  onToggle('setGlow','glow'); onToggle('setAnimations','animations');
  onToggle('setMsgNotif','msgNotif'); onToggle('setSoundNotif','soundNotif');
  onToggle('setPreviewNotif','previewNotif'); onToggle('setDnd','dnd');
  onToggle('setEnterSend','enterSend'); onToggle('setMsgTime','msgTime');
  onToggle('setCompact','compact'); onToggle('setOnlineStatus','onlineStatus');
  onToggle('setReadStatus','readStatus'); onToggle('setSoundIncoming','soundIncoming');
  onToggle('setSoundOutgoing','soundOutgoing'); onToggle('setSoundCall','soundCall');
  onToggle('setSidebar','sidebar'); onToggle('setAutoStart','autoStart');

  dom.setFontSize?.addEventListener('input', () => {
    state.settings.fontSize = parseInt(dom.setFontSize.value);
    dom.fontSizeVal.textContent = dom.setFontSize.value;
    saveSettings(); applySettings();
  });
  dom.setVolume?.addEventListener('input', () => {
    state.settings.volume = parseInt(dom.setVolume.value);
    dom.volumeVal.textContent = dom.setVolume.value + '%';
    saveSettings();
  });
  dom.accentColors?.addEventListener('click', e => {
    const opt = e.target.closest('.color-opt');
    if (!opt) return;
    document.querySelectorAll('.color-opt').forEach(el => el.classList.remove('active'));
    opt.classList.add('active');
    state.settings.accentColor = opt.dataset.color;
    saveSettings(); applySettings();
  });
  dom.setLanguage?.addEventListener('change', () => {
    state.settings.language = dom.setLanguage.value;
    saveSettings();
  });

  dom.closeSettings?.addEventListener('click', () => { dom.settingsModal.style.display = 'none'; });
  dom.settingsModal?.addEventListener('click', e => {
    if (e.target === dom.settingsModal) dom.settingsModal.style.display = 'none';
  });
  dom.saveProfileName?.addEventListener('click', () => {
    const n = dom.setDisplayName?.value.trim();
    if (n && state.user) { state.user.name = n; saveAll(); toast('Имя обновлено', 'success'); }
  });
  dom.resetProfileName?.addEventListener('click', () => {
    if (dom.setDisplayName && state.user) dom.setDisplayName.value = state.user.name;
  });
  dom.savePassBtn?.addEventListener('click', () => {
    const old = dom.setOldPass?.value;
    const nw = dom.setNewPass?.value;
    if (!old || !nw) { toast('Заполните оба поля', 'error'); return; }
    if (btoa(old) !== state.user?._pw) { toast('Старый пароль неверен', 'error'); return; }
    if (nw.length < 4) { toast('Новый пароль минимум 4 символа', 'error'); return; }
    state.user._pw = btoa(nw);
    saveAll();
    toast('Пароль изменён', 'success');
    dom.setOldPass.value = ''; dom.setNewPass.value = '';
  });
  dom.deleteAccountBtn?.addEventListener('click', () => {
    if (confirm('Удалить аккаунт? Все данные будут потеряны.')) {
      clearSession(); localStorage.removeItem('neonchat_data');
      location.reload();
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

// ======================== ЭМОДЗИ ========================
function buildEmojiPanel() {
  const cats = {};
  if (typeof NOVA_EMOJI !== 'undefined') {
    for (const [cat, emojis] of Object.entries(NOVA_EMOJI)) {
      cats[cat] = emojis;
    }
  }
  let html = '';
  for (const [cat, emojis] of Object.entries(cats)) {
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
      for (const emojis of Object.values(cats)) {
        const e = emojis.find(x => x.id === id);
        if (e) { insertEmoji(e); return; }
      }
    });
  });
}

function insertEmoji(emoji) {
  const img = document.createElement('img');
  const blob = new Blob([emoji.svg], { type: 'image/svg+xml;charset=utf-8' });
  img.src = URL.createObjectURL(blob);
  img.className = 'emoji-inline'; img.alt = emoji.name; img.draggable = false;
  const s = window.getSelection();
  if (s.getRangeAt && s.rangeCount) {
    const r = s.getRangeAt(0);
    if (dom.chatInput.contains(r.commonAncestorContainer)) {
      r.deleteContents(); r.insertNode(img); r.collapse(false);
      s.removeAllRanges(); s.addRange(r);
    } else { dom.chatInput.appendChild(img); dom.chatInput.appendChild(document.createTextNode('\u00A0')); }
  } else { dom.chatInput.appendChild(img); dom.chatInput.appendChild(document.createTextNode('\u00A0')); }
  dom.chatInput.dispatchEvent(new Event('input'));
}

// ======================== ГОЛОСОВЫЕ ========================
const IDB_NAME = 'neonchat_audio';
const IDB_VERSION = 1;

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('blobs')) {
        db.createObjectStore('blobs', { keyPath: 'id' });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

function idbPut(id, data) {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').put({ id, data });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = e => { db.close(); reject(e.target.error); };
  }));
}

function idbGet(id) {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction('blobs', 'readonly');
    const req = tx.objectStore('blobs').get(id);
    req.onsuccess = e => { db.close(); resolve(e.target.result?.data); };
    req.onerror = e => { db.close(); reject(e.target.error); };
  }));
}

function idbDelete(id) {
  return idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = e => { db.close(); reject(e.target.error); };
  }));
}

let _audioIdCounter = 0;
function nextAudioId() { return 'audio_' + Date.now() + '_' + (++_audioIdCounter); }

async function startVoiceRecording() {
  if (state.isRecording) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mt = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
    state.mediaRecorder = new MediaRecorder(stream, { mimeType: mt, audioBitsPerSecond: 16000 });
    state.audioChunks = []; state.recordingSeconds = 0; state.isRecording = true;
    dom.voiceBtn.classList.add('recording');
    dom.voiceIcon.style.display = 'none';
    dom.voiceTimer.style.display = 'block';
    dom.voiceTimer.textContent = '0:00';
    state.recordingTimer = setInterval(() => {
      state.recordingSeconds++;
      dom.voiceTimer.textContent = formatDuration(state.recordingSeconds);
    }, 1000);
    state.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) state.audioChunks.push(e.data); };
    state.mediaRecorder.onstop = async () => {
      clearInterval(state.recordingTimer);
      dom.voiceBtn.classList.remove('recording');
      dom.voiceIcon.style.display = '';
      dom.voiceTimer.style.display = 'none';
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(state.audioChunks, { type: 'audio/webm' });
      const dur = state.recordingSeconds;
      if (dur < 1) { toast('Слишком короткая запись', 'error'); return; }
      const audioId = nextAudioId();
      try {
        await idbPut(audioId, blob);
        dom.recordBtn.style.display = 'flex';
        dom.sendBtn.style.display = 'none';
        dom.chatInput.textContent = '';
        dom.chatInput.style.display = 'none';
        dom.recordBtn.dataset.audioId = audioId;
        dom.recordBtn.dataset.dur = dur;
        toast(`Запись ${formatDuration(dur)} готова к отправке`, 'success');
      } catch (e) {
        toast('Ошибка сохранения аудио', 'error');
        console.error(e);
      }
    };
    state.mediaRecorder.start();
  } catch { toast('Нет доступа к микрофону', 'error'); }
}

function stopVoiceRecording() {
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') state.mediaRecorder.stop();
  state.isRecording = false;
}

function cancelVoiceMode() {
  dom.recordBtn.style.display = 'none';
  dom.sendBtn.style.display = 'flex';
  dom.chatInput.style.display = 'block';
}

async function sendVoiceMessage() {
  const audioId = dom.recordBtn.dataset.audioId;
  const dur = parseInt(dom.recordBtn.dataset.dur) || 0;
  if (!audioId || dur < 1 || !state.currentChat) return;
  addMessage({
    type: 'voice', audioId, duration: dur,
    from: state.user.login, to: state.currentChat, time: Date.now(),
    formattedTime: formatTime(Date.now())
  });
  cancelVoiceMode();
}

// ======================== СООБЩЕНИЯ ========================
function addMessage(msg) {
  const other = msg.from === state.user.login ? msg.to : msg.from;
  if (!state.messages[other]) state.messages[other] = [];
  state.messages[other].push(msg);
  saveAll();
  if (state.currentChat === other) renderMessages(other);
  if (state.wsReady && state.connected) {
    sendWS({ type: 'send-msg', to: other, text: msg.text || '', type: msg.type || 'text', audioData: null, duration: msg.duration || 0 });
  }
  const chat = state.chats.find(c => c.with === other);
  if (chat) {
    chat.lastMessage = msg.type === 'voice' ? '🎤 Голосовое' : (msg.text?.replace(/<[^>]+>/g, '')?.slice(0, 30) || '');
    chat.lastTime = msg.formattedTime || formatTime(msg.time);
    renderChats(dom.searchInput.value);
  }
}

function renderMessages(chatWith) {
  const msgs = state.messages[chatWith] || [];
  dom.messagesList.innerHTML = '';
  if (msgs.length === 0) { dom.messagesEmpty.style.display = 'block'; return; }
  dom.messagesEmpty.style.display = 'none';
  msgs.forEach(msg => {
    const isOut = msg.from === state.user.login;
    let el;
    if (msg.type === 'voice') {
      el = document.createElement('div');
      el.className = `message ${isOut ? 'outgoing' : 'incoming'} voice-message`;
      const pb = document.createElement('button');
      pb.className = 'voice-play-btn';
      pb.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><polygon points="8,5 19,12 8,19" fill="currentColor"/></svg>';
      let playing = false; let audio = null; let loading = false;
      pb.addEventListener('click', async () => {
        if (playing && audio) { audio.pause(); audio.currentTime = 0; playing = false; return; }
        if (loading) return;
        if (!audio) {
          loading = true; pb.style.opacity = '0.5';
          try {
            const blob = await idbGet(msg.audioId);
            if (!blob) { toast('Аудио не найдено', 'error'); loading = false; pb.style.opacity = '1'; return; }
            audio = new Audio(URL.createObjectURL(blob));
          } catch { toast('Ошибка загрузки аудио', 'error'); loading = false; pb.style.opacity = '1'; return; }
          loading = false; pb.style.opacity = '1';
        }
        playing = true; audio.play();
        audio.onended = () => { playing = false; };
      });
      const wave = document.createElement('div'); wave.className = 'voice-wave';
      for (let i = 0; i < 8; i++) { const b = document.createElement('span'); b.style.height = `${6 + Math.random() * 18}px`; wave.appendChild(b); }
      const d = document.createElement('span'); d.className = 'voice-dur'; d.textContent = formatDuration(msg.duration || 0);
      el.appendChild(pb); el.appendChild(wave); el.appendChild(d);
    } else {
      el = document.createElement('div');
      el.className = `message ${isOut ? 'outgoing' : 'incoming'}`;
      const parsed = document.createElement('span');
      parsed.innerHTML = msg.text;
      el.appendChild(parsed);
    }
    if (state.settings.msgTime !== false) {
      const t = document.createElement('div'); t.className = 'msg-time'; t.textContent = msg.formattedTime || formatTime(msg.time);
      el.appendChild(t);
    }
    dom.messagesList.appendChild(el);
  });
  dom.messagesList.scrollTop = dom.messagesList.scrollHeight;
}

function sendTextMessage() {
  const text = dom.chatInput.innerHTML.trim();
  if (!text || text === '<br>' || !state.currentChat) return;
  addMessage({
    type: 'text', text,
    from: state.user.login, to: state.currentChat, time: Date.now(),
    formattedTime: formatTime(Date.now())
  });
  dom.chatInput.innerHTML = '';
}

// ======================== ЧАТЫ ========================
function renderChats(filter = '') {
  dom.contactsList.innerHTML = '';
  let chats = state.chats;
  if (filter) {
    const f = filter.toLowerCase();
    chats = chats.filter(c => c.name.toLowerCase().includes(f) || c.with.toLowerCase().includes(f));
  }
  if (chats.length === 0) {
    const isFilter = !!filter;
    dom.contactsList.innerHTML = `
      <div style="text-align:center;padding:30px;">
        <div style="font-size:40px;margin-bottom:12px;opacity:0.3;">💬</div>
        <div style="color:var(--text-muted);font-size:13px;margin-bottom:16px;">
          ${isFilter ? 'Ничего не найдено' : 'У вас пока нет чатов'}
        </div>
        ${!isFilter ? '<button class="settings-btn" onclick="showNewChatModal()" style="font-size:13px;padding:10px 24px;cursor:pointer;"><span style="display:flex;align-items:center;gap:6px;justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Новый чат</span></button>' : ''}
      </div>`;
    return;
  }
  chats.forEach((chat, i) => {
    const div = document.createElement('div');
    div.className = `contact-item ${chat.with === state.currentChat ? 'active' : ''}`;
    div.dataset.login = chat.with;
    div.style.animationDelay = `${i * 0.05}s`;
    const color = getColor(chat.name);
    const online = chat.online || state.onlineUsers.has(chat.with);
    div.innerHTML = `
      <div class="contact-avatar ${online ? 'online' : ''}" style="background:${color}20;color:${color};border:2px solid ${color}40;">${chat.avatar || getInitials(chat.name)}</div>
      <div class="contact-info">
        <div class="contact-name">${chat.name}</div>
        <div class="contact-id">@${chat.with}</div>
        <div class="contact-preview">${chat.lastMessage || ''}</div>
      </div>
      <div class="contact-time">${chat.lastTime || ''}</div>`;
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
  const online = state.onlineUsers.has(chatWith);
  dom.chatUserStatus.textContent = online ? 'онлайн' : 'офлайн';
  dom.chatUserStatus.style.color = online ? 'var(--neon-green)' : 'var(--text-muted)';
  dom.chatHeader.style.display = 'flex';
  dom.chatInputArea.style.display = 'flex';
  if (!state.messages[chatWith]) state.messages[chatWith] = [];
  renderMessages(chatWith);
  renderChats(dom.searchInput.value);
  if (window.innerWidth <= 820) dom.sidebar.classList.remove('open');
}

// ======================== ПОИСК / НОВЫЙ ЧАТ ========================
function showNewChatModal() {
  dom.newChatModal.style.display = 'flex';
  dom.newChatSearch.value = '';
  dom.searchResults.innerHTML = '';
  dom.newChatSearch.focus();
}

function closeNewChatModal() { dom.newChatModal.style.display = 'none'; }

function handleSearchInput() {
  const q = dom.newChatSearch.value.trim();
  if (q.length < 1) { dom.searchResults.innerHTML = ''; return; }
  const results = searchUsers(q);
  if (results.length === 0) {
    dom.searchResults.innerHTML = '<div style="color:var(--text-muted);padding:16px;text-align:center;font-size:13px;">Ничего не найдено</div>';
    return;
  }
  dom.searchResults.innerHTML = '';
  results.forEach(u => {
    const div = document.createElement('div');
    div.className = 'contact-item';
    const color = getColor(u.name);
    div.innerHTML = `
      <div class="contact-avatar" style="background:${color}20;color:${color};border:2px solid ${color}40;">${getInitials(u.name)}</div>
      <div class="contact-info">
        <div class="contact-name">${u.name}</div>
        <div class="contact-id">@${u.login}</div>
      </div>`;
    div.addEventListener('click', () => {
      startChatWith(u.login, u.name);
      closeNewChatModal();
    });
    dom.searchResults.appendChild(div);
  });
}

function searchUsers(query) {
  const q = query.toLowerCase();
  const all = [];
  if (state.chats) {
    state.chats.forEach(c => {
      if (c.with !== state.user?.login && !all.find(x => x.login === c.with)) {
        all.push({ name: c.name, login: c.with });
      }
    });
  }
  const DATA = [
    { name: 'Алиса', login: 'alisa_star' },
    { name: 'Максим', login: 'max_dev' },
    { name: 'София', login: 'sofi_light' },
    { name: 'Дмитрий', login: 'dmitry_codes' },
    { name: 'Елена', login: 'elena_design' },
    { name: 'Артём', login: 'artem_music' },
    { name: 'Полина', login: 'polina_art' },
    { name: 'Иван', login: 'ivan_wave' },
    { name: 'Кира', login: 'kira_neo' },
    { name: 'Тимур', login: 'timur_dev' },
    { name: 'Вера', login: 'vera_codes' },
    { name: 'Олег', login: 'oleg_art' }
  ];
  DATA.forEach(u => {
    if (u.login !== state.user?.login && !all.find(x => x.login === u.login)) {
      all.push(u);
    }
  });
  return all.filter(u => u.name.toLowerCase().includes(q) || u.login.toLowerCase().includes(q));
}

function startChatWith(login, name) {
  const existing = state.chats.find(c => c.with === login);
  if (!existing) {
    state.chats.unshift({ with: login, name, avatar: getInitials(name), lastMessage: '', lastTime: '', online: false });
    saveAll();
  }
  selectChat(login);
}

// ======================== ПАНЕЛИ И МЕНЮ ========================
function toggleRightPanel(type = 'emoji') {
  const open = dom.rightPanel.style.display !== 'none';
  if (open) { dom.rightPanel.style.display = 'none'; return; }
  dom.rightPanel.style.display = 'flex';
  if (type === 'emoji') { dom.panelTitle.textContent = 'Эмодзи'; buildEmojiPanel(); }
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
  dom.profileName.textContent = state.user.name;
  dom.profileLogin.textContent = state.user.login;
  dom.profileEmail.textContent = state.user.email || '—';
  dom.profileStatus.textContent = 'онлайн';
  dom.profileModal.style.display = 'flex';
}

// ======================== ИНИЦИАЛИЗАЦИЯ ========================
function initApp() {
  if (dom.setDisplayName) dom.setDisplayName.value = state.user?.name || '';
  buildEmojiPanel();
  renderChats();
  if (state.chats.length > 0 && !state.currentChat) {
    selectChat(state.chats[0].with);
  } else if (state.currentChat) {
    selectChat(state.currentChat);
    renderMessages(state.currentChat);
  }
  dom.serverStatus.textContent = state.connected ? 'Подключено ✓' : 'Локальный режим';
  dom.serverStatus.style.color = state.connected ? '#00ff88' : '#ffdd00';
}

function setupEvents() {
  dom.loginForm.addEventListener('submit', handleLogin);
  dom.registerForm.addEventListener('submit', handleRegister);
  dom.showRegister.addEventListener('click', showRegisterForm);
  dom.showLogin.addEventListener('click', showLoginForm);

  dom.sendBtn.addEventListener('click', sendTextMessage);
  dom.chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && state.settings.enterSend !== false) { e.preventDefault(); sendTextMessage(); }
  });

  let pressTimer;
  dom.voiceBtn.addEventListener('mousedown', () => { pressTimer = setTimeout(startVoiceRecording, 200); });
  dom.voiceBtn.addEventListener('mouseup', () => { clearTimeout(pressTimer); if (state.isRecording) stopVoiceRecording(); });
  dom.voiceBtn.addEventListener('mouseleave', () => { clearTimeout(pressTimer); });
  dom.voiceBtn.addEventListener('touchstart', e => { e.preventDefault(); pressTimer = setTimeout(startVoiceRecording, 200); });
  dom.voiceBtn.addEventListener('touchend', e => { e.preventDefault(); clearTimeout(pressTimer); if (state.isRecording) stopVoiceRecording(); });
  dom.recordBtn.addEventListener('click', sendVoiceMessage);

  dom.emojiBtn.addEventListener('click', () => toggleRightPanel('emoji'));
  dom.toggleEmojiPanel.addEventListener('click', () => toggleRightPanel('emoji'));
  dom.closePanel.addEventListener('click', () => { dom.rightPanel.style.display = 'none'; });
  dom.searchInput.addEventListener('input', e => renderChats(e.target.value));

  dom.menuBtn.addEventListener('click', e => {
    const r = e.currentTarget.getBoundingClientRect();
    toggleMenu(r.left - 80, r.bottom + 4);
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

  dom.closeProfileModal.addEventListener('click', () => { dom.profileModal.style.display = 'none'; });
  dom.profileModal.addEventListener('click', e => { if (e.target === dom.profileModal) dom.profileModal.style.display = 'none'; });
  dom.closeNewChat.addEventListener('click', closeNewChatModal);
  dom.newChatModal.addEventListener('click', e => { if (e.target === dom.newChatModal) closeNewChatModal(); });
  dom.newChatSearch.addEventListener('input', handleSearchInput);
  dom.messagesArea?.addEventListener('click', e => {
    if (e.target.closest('#emptyStartChat')) showNewChatModal();
  });

  dom.callBtn.addEventListener('click', () => {
    if (!state.currentChat) { toast('Выберите чат', 'info'); return; }
    if (state.wsReady) {
      toast('Звонок отправлен', 'info');
      sendWS({ type: 'call-offer', to: state.currentChat });
    } else {
      toast('WebRTC звонки требуют сервер', 'info');
    }
  });
}

async function cleanupAudioBlobs() {
  try {
    const usedIds = new Set();
    for (const msgs of Object.values(state.messages)) {
      for (const m of msgs) { if (m.type === 'voice' && m.audioId) usedIds.add(m.audioId); }
    }
    const db = await idbOpen();
    const tx = db.transaction('blobs', 'readonly');
    const req = tx.objectStore('blobs').getAllKeys();
    req.onsuccess = async () => {
      const keys = req.result || [];
      for (const key of keys) {
        if (!usedIds.has(key)) { try { await idbDelete(key); } catch {} }
      }
      db.close();
    };
    req.onerror = () => db.close();
  } catch {}
}

function init() {
  initDom();
  loadSettings();
  createParticles();
  applySettings();
  setupEvents();
  setupSettingsEvents();

  dom.loginScreen.style.display = 'flex';
  dom.serverStatus.textContent = 'Загрузка...';
  dom.serverStatus.style.color = '#ffdd00';

  const session = getSession();
  const dataLoaded = loadAll();

  connectWS();

  if (session && dataLoaded && state.user && session._pw === state.user._pw) {
    dom.serverStatus.textContent = 'Автовход...';
    setTimeout(() => { toast('С возвращением!', 'success'); enterApp(); }, 400);
  } else if (dataLoaded && state.user) {
    dom.serverStatus.textContent = 'Войдите в аккаунт';
  } else {
    dom.serverStatus.textContent = 'Создайте аккаунт';
    showRegisterForm();
  }
}

document.addEventListener('DOMContentLoaded', init);
