const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;

// ===== In-memory storage =====
const users = {};
const messages = {};
const onlineUsers = new Set();

// ===== HTTP server (serves static files) =====
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const wwwRoot = path.join(__dirname, '..');

const httpServer = http.createServer((req, res) => {
  let filePath = path.join(wwwRoot, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
      res.end(content);
    }
  });
});

// ===== WebSocket server =====
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  let currentUser = null;

  const send = (data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  };

  const broadcast = (data, except) => {
    const msg = JSON.stringify(data);
    wss.clients.forEach(client => {
      if (client.readyState === client.OPEN && client !== except) {
        client.send(msg);
      }
    });
  };

  const sendToUser = (login, data) => {
    const msg = JSON.stringify(data);
    wss.clients.forEach(client => {
      if (client.readyState === client.OPEN && client._login === login) {
        client.send(msg);
      }
    });
  };

  ws.on('message', (raw) => {
    let data;
    try { data = JSON.parse(raw); } catch { return; }
    if (!data || !data.type) return;

    switch (data.type) {

      case 'register': {
        const { name, login, email, password } = data;
        if (!name || !login || !email || !password) {
          return send({ type: 'register-res', success: false, error: 'Заполните все поля' });
        }
        if (password.length < 6) {
          return send({ type: 'register-res', success: false, error: 'Пароль должен быть минимум 6 символов' });
        }
        if (users[login]) {
          return send({ type: 'register-res', success: false, error: 'Этот логин уже занят' });
        }
        for (const u of Object.values(users)) {
          if (u.email === email) {
            return send({ type: 'register-res', success: false, error: 'Этот email уже зарегистрирован' });
          }
        }
        users[login] = {
          name, email, password,
          avatar: name.charAt(0).toUpperCase(),
          login,
          registered: Date.now(),
          online: false
        };
        send({ type: 'register-res', success: true });
        break;
      }

      case 'login': {
        const { loginOrEmail, password } = data;
        let user = users[loginOrEmail];
        if (!user) {
          user = Object.values(users).find(u => u.email === loginOrEmail);
        }
        if (!user) {
          return send({ type: 'login-res', success: false, error: 'Пользователь не найден' });
        }
        if (user.password !== password) {
          return send({ type: 'login-res', success: false, error: 'Неверный пароль' });
        }
        user.online = true;
        currentUser = user.login;
        ws._login = user.login;
        onlineUsers.add(user.login);
        send({ type: 'login-res', success: true, user: { ...user, password: undefined } });
        // Notify others
        broadcast({ type: 'user-status', login: user.login, online: true }, ws);
        // Send online users
        send({ type: 'online-list', users: [...onlineUsers] });
        // Send all users for search
        const allUsers = Object.values(users).map(u => ({ login: u.login, name: u.name, email: u.email, avatar: u.avatar, online: u.online }));
        send({ type: 'users-list', users: allUsers });
        break;
      }

      case 'search': {
        const q = (data.query || '').toLowerCase();
        const allUsers = Object.values(users).filter(u => {
          if (currentUser && u.login === currentUser) return false;
          return u.name.toLowerCase().includes(q) || u.login.toLowerCase().includes(q);
        }).map(u => ({ login: u.login, name: u.name, avatar: u.avatar, online: u.online }));
        send({ type: 'search-res', results: allUsers });
        break;
      }

      case 'send-msg': {
        const { to, text, type: msgType, audioData, duration } = data;
        if (!currentUser || !to || !text) return;
        const msg = {
          id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          from: currentUser,
          to,
          text,
          type: msgType || 'text',
          audioData: audioData || null,
          duration: duration || null,
          time: Date.now(),
          formattedTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        };
        const chatKey = [currentUser, to].sort().join('_');
        if (!messages[chatKey]) messages[chatKey] = [];
        messages[chatKey].push(msg);
        // Send to sender
        send({ type: 'new-msg', msg });
        // Send to recipient
        sendToUser(to, { type: 'new-msg', msg });
        // Update chat lists for both
        const fromUser = users[currentUser];
        send({ type: 'chat-update', with: to, name: users[to]?.name || to, avatar: users[to]?.avatar || to.charAt(0).toUpperCase(), lastMessage: text, lastTime: msg.formattedTime, online: users[to]?.online || false });
        sendToUser(to, { type: 'chat-update', with: currentUser, name: fromUser?.name || currentUser, avatar: fromUser?.avatar || currentUser.charAt(0).toUpperCase(), lastMessage: text, lastTime: msg.formattedTime, online: true });
        break;
      }

      case 'get-chats': {
        if (!currentUser) return;
        const chatList = [];
        for (const key of Object.keys(messages)) {
          const parts = key.split('_');
          if (parts.includes(currentUser)) {
            const other = parts[0] === currentUser ? parts[1] : parts[0];
            const msgs = messages[key];
            const last = msgs[msgs.length - 1];
            chatList.push({
              with: other,
              name: users[other]?.name || other,
              avatar: users[other]?.avatar || other.charAt(0).toUpperCase(),
              lastMessage: last?.text || '',
              lastTime: last?.formattedTime || '',
              online: users[other]?.online || false
            });
          }
        }
        // Also add chats where we have no messages but initiated
        // (chats are created when first message is sent)
        chatList.sort((a, b) => {
          const tA = messages[[currentUser, a.with].sort().join('_')];
          const tB = messages[[currentUser, b.with].sort().join('_')];
          const lA = tA?.[tA.length - 1]?.time || 0;
          const lB = tB?.[tB.length - 1]?.time || 0;
          return lB - lA;
        });
        send({ type: 'chats-list', chats: chatList });
        break;
      }

      case 'get-msgs': {
        const { with: withLogin } = data;
        if (!currentUser || !withLogin) return;
        const chatKey = [currentUser, withLogin].sort().join('_');
        const msgs = messages[chatKey] || [];
        send({ type: 'msgs-list', with: withLogin, messages: msgs });
        break;
      }

      // Call signaling
      case 'call-offer':
      case 'call-answer':
      case 'call-ice-candidate':
      case 'call-end':
      case 'call-decline':
      case 'call-accept': {
        if (!currentUser) return;
        data.from = currentUser;
        data.fromName = users[currentUser]?.name || currentUser;
        sendToUser(data.to, data);
        break;
      }

      case 'ping': {
        send({ type: 'pong' });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (currentUser) {
      const user = users[currentUser];
      if (user) user.online = false;
      onlineUsers.delete(currentUser);
      broadcast({ type: 'user-status', login: currentUser, online: false }, ws);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`NovaChat server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
