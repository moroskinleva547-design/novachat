const DB = {
  ws: null,
  connected: false,
  _listeners: [],
  _pending: [],
  _reconnectTimer: null,
  _reconnectAttempts: 0,
  _sessionId: null,
  _users: {},

  // Auto-detect server URL or use localStorage override
  _serverUrl: (function() {
    const saved = localStorage.getItem('novachat_server');
    if (saved) return saved;
    // If loaded from same origin as server (e.g., http://localhost:3001)
    const loc = window.location;
    if (loc.port === '3001' || loc.port === '3000') {
      return 'ws://' + loc.hostname + ':' + loc.port;
    }
    return 'ws://localhost:3001';
  })(),

  setServerUrl(url) {
    this._serverUrl = url;
    localStorage.setItem('novachat_server', url);
  },

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    try {
      this.ws = new WebSocket(this._serverUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this._reconnectAttempts = 0;
        // Flush pending messages
        while (this._pending.length) {
          this.ws.send(JSON.stringify(this._pending.shift()));
        }
        // Notify listeners
        this._fire({ type: '_connected' });
      };

      this.ws.onmessage = (e) => {
        let data;
        try { data = JSON.parse(e.data); } catch { return; }
        // Cache user data from users-list responses
        if (data.type === 'users-list' && data.users) {
          data.users.forEach(u => { this._users[u.login] = u; });
        }
        if (data.type === 'search-res' && data.results) {
          data.results.forEach(u => { this._users[u.login] = u; });
        }
        if (data.type === 'chats-list' && data.chats) {
          data.chats.forEach(c => { this._users[c.with] = { login: c.with, name: c.name, avatar: c.avatar, online: c.online }; });
        }
        if (data.type === 'chat-update') {
          this._users[data.with] = { login: data.with, name: data.name, avatar: data.avatar, online: data.online };
        }
        this._fire(data);
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.ws = null;
        this._fire({ type: '_disconnected' });
        this._reconnect();
      };

      this.ws.onerror = () => {
        // onclose will fire after this
      };
    } catch (e) {
      this._reconnect();
    }
  },

  _reconnect() {
    clearTimeout(this._reconnectTimer);
    if (this._reconnectAttempts > 10) return;
    this._reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this._reconnectAttempts), 15000);
    this._reconnectTimer = setTimeout(() => this.connect(), delay);
  },

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this._pending.push(data);
      this.connect();
    }
  },

  onMessage(callback) {
    this._listeners.push(callback);
  },

  _fire(data) {
    for (const cb of this._listeners) {
      try { cb(data); } catch {}
    }
  },

  disconnect() {
    clearTimeout(this._reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  },

  // Promise-based request/response
  _request(data, timeout) {
    return new Promise((resolve, reject) => {
      const reqId = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      data._reqId = reqId;

      const handler = (msg) => {
        if (msg._reqId === reqId) {
          cleanup();
          resolve(msg);
        }
      };

      // Also resolve on error responses
      const errorHandler = (msg) => {
        if (msg._reqId === reqId && msg.error) {
          cleanup();
          reject(msg);
        }
      };

      const cleanup = () => {
        const idx = this._listeners.indexOf(handler);
        if (idx !== -1) this._listeners.splice(idx, 1);
        const idx2 = this._listeners.indexOf(errorHandler);
        if (idx2 !== -1) this._listeners.splice(idx2, 1);
        clearTimeout(timer);
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Request timeout'));
      }, timeout || 10000);

      this._listeners.push(handler);
      this.send(data);
    });
  },

  // ===== STORAGE METHODS (local fallback) =====
  _lsPrefix: 'novachat_',

  _lsGet(key) {
    try { return JSON.parse(localStorage.getItem(this._lsPrefix + key)); } catch { return null; }
  },

  _lsSet(key, val) {
    localStorage.setItem(this._lsPrefix + key, JSON.stringify(val));
  },

  _lsRemove(key) {
    localStorage.removeItem(this._lsPrefix + key);
  },

  // ===== SESSION =====
  _savedPasswords: {},

  saveSession(login, remember, password) {
    if (remember) {
      this._lsSet('session', { login, password, expires: Date.now() + 30 * 24 * 60 * 60 * 1000 });
      sessionStorage.removeItem(this._lsPrefix + 'session');
    } else {
      const data = JSON.stringify({ login, password });
      sessionStorage.setItem(this._lsPrefix + 'session', data);
      this._lsRemove('session');
    }
  },

  getSession() {
    // Try session first
    let s = sessionStorage.getItem(this._lsPrefix + 'session');
    if (s) {
      try {
        const parsed = JSON.parse(s);
        if (parsed.login && parsed.password) return parsed;
      } catch { return s; } // old format fallback
    }
    // Try persistent (remember me)
    s = this._lsGet('session');
    if (s && s.expires > Date.now() && s.password) return s;
    return null;
  },

  clearSession() {
    sessionStorage.removeItem(this._lsPrefix + 'session');
    this._lsRemove('session');
  },

  // ===== USERS =====
  register(name, login, email, password) {
    return new Promise((resolve) => {
      const handler = (data) => {
        if (data.type === 'register-res') {
          const idx = DB._listeners.indexOf(handler);
          if (idx !== -1) DB._listeners.splice(idx, 1);
          resolve(data);
        }
      };
      DB._listeners.push(handler);
      DB.send({ type: 'register', name, login, email, password });
      setTimeout(() => {
        const idx = DB._listeners.indexOf(handler);
        if (idx !== -1) DB._listeners.splice(idx, 1);
        resolve({ success: false, error: 'Сервер недоступен' });
      }, 8000);
    });
  },

  login(loginOrEmail, password) {
    return new Promise((resolve) => {
      const handler = (data) => {
        if (data.type === 'login-res') {
          const idx = DB._listeners.indexOf(handler);
          if (idx !== -1) DB._listeners.splice(idx, 1);
          resolve(data);
        }
      };
      DB._listeners.push(handler);
      DB.send({ type: 'login', loginOrEmail, password });
      setTimeout(() => {
        const idx = DB._listeners.indexOf(handler);
        if (idx !== -1) DB._listeners.splice(idx, 1);
        resolve({ success: false, error: 'Сервер недоступен. Перезапустите сервер: node server/index.js' });
      }, 8000);
    });
  },

  searchUsers(query) {
    return new Promise((resolve) => {
      const handler = (data) => {
        if (data.type === 'search-res') {
          const idx = DB._listeners.indexOf(handler);
          if (idx !== -1) DB._listeners.splice(idx, 1);
          resolve(data.results || []);
        }
      };
      DB._listeners.push(handler);
      DB.send({ type: 'search', query });
      setTimeout(() => {
        const idx = DB._listeners.indexOf(handler);
        if (idx !== -1) DB._listeners.splice(idx, 1);
        resolve([]);
      }, 5000);
    });
  },

  // ===== CHATS =====
  getChats() {
    return new Promise((resolve) => {
      const handler = (data) => {
        if (data.type === 'chats-list') {
          const idx = DB._listeners.indexOf(handler);
          if (idx !== -1) DB._listeners.splice(idx, 1);
          resolve(data.chats || []);
        }
      };
      DB._listeners.push(handler);
      DB.send({ type: 'get-chats' });
      setTimeout(() => {
        const idx = DB._listeners.indexOf(handler);
        if (idx !== -1) DB._listeners.splice(idx, 1);
        resolve([]);
      }, 5000);
    });
  },

  getMessages(withLogin) {
    return new Promise((resolve) => {
      const handler = (data) => {
        if (data.type === 'msgs-list' && data.with === withLogin) {
          const idx = DB._listeners.indexOf(handler);
          if (idx !== -1) DB._listeners.splice(idx, 1);
          resolve(data.messages || []);
        }
      };
      DB._listeners.push(handler);
      DB.send({ type: 'get-msgs', with: withLogin });
      setTimeout(() => {
        const idx = DB._listeners.indexOf(handler);
        if (idx !== -1) DB._listeners.splice(idx, 1);
        resolve([]);
      }, 5000);
    });
  },

  sendMessage(to, text, type, audioData, duration) {
    DB.send({ type: 'send-msg', to, text, type, audioData, duration });
  },

  // ===== USER CACHE =====
  getUser(login) {
    return this._users[login] || null;
  },

  // ===== CALL SIGNALING =====
  sendSignal(data) {
    DB.send(data);
  }
};

// Ping every 25s to keep connection alive
setInterval(() => {
  if (DB.ws && DB.ws.readyState === WebSocket.OPEN) {
    DB.ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 25000);

// Auto-connect on load
DB.connect();
