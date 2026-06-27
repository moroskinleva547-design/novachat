const DB = {
  _prefix: 'novachat_',

  _get(key) {
    try {
      const raw = localStorage.getItem(this._prefix + key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  _set(key, val) {
    localStorage.setItem(this._prefix + key, JSON.stringify(val));
  },

  _remove(key) {
    localStorage.removeItem(this._prefix + key);
  },

  _allKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(this._prefix)) {
        keys.push(k.slice(this._prefix.length));
      }
    }
    return keys;
  },

  // Users
  getUsers() {
    return this._get('users') || {};
  },

  saveUser(login, data) {
    const users = this.getUsers();
    users[login] = { ...data, login };
    this._set('users', users);
  },

  getUser(login) {
    const users = this.getUsers();
    return users[login] || null;
  },

  getUserByEmail(email) {
    const users = this.getUsers();
    return Object.values(users).find(u => u.email === email) || null;
  },

  getAllUsers() {
    return Object.values(this.getUsers());
  },

  // Messages
  getMessages(chatId) {
    return this._get(`msgs_${chatId}`) || [];
  },

  saveMessage(chatId, msg) {
    const msgs = this.getMessages(chatId);
    msgs.push(msg);
    this._set(`msgs_${chatId}`, msgs);
  },

  // Chats
  getChats(userLogin) {
    return this._get(`chats_${userLogin}`) || [];
  },

  saveChats(userLogin, chats) {
    this._set(`chats_${userLogin}`, chats);
  },

  addChat(userLogin, chatData) {
    const chats = this.getChats(userLogin);
    const existing = chats.find(c => c.with === chatData.with);
    if (!existing) {
      chats.unshift(chatData);
      this.saveChats(userLogin, chats);
    }
    return chats;
  },

  updateChatLastMessage(userLogin, withLogin, msg, time) {
    const chats = this.getChats(userLogin);
    const idx = chats.findIndex(c => c.with === withLogin);
    if (idx !== -1) {
      const chat = chats.splice(idx, 1)[0];
      chat.lastMessage = msg;
      chat.lastTime = time;
      chats.unshift(chat);
      this.saveChats(userLogin, chats);
    }
  },

  _signalListeners: [],

  // Call signaling via BroadcastChannel
  initBroadcast() {
    if (!this._channel) {
      this._channel = new BroadcastChannel('novachat_signaling');
      this._channel.onmessage = (e) => {
        for (const cb of this._signalListeners) {
          try { cb(e.data); } catch {}
        }
      };
    }
    return this._channel;
  },

  sendSignal(data) {
    const ch = this.initBroadcast();
    ch.postMessage(data);
  },

  onSignal(callback) {
    this._signalListeners.push(callback);
    this.initBroadcast();
  }
};
