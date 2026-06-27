const Chat = {
  _currentChat: null,
  _pollInterval: null,
  _onNewMessage: null,

  init(onNewMessage) {
    this._onNewMessage = onNewMessage;
  },

  getCurrentChat() {
    return this._currentChat;
  },

  setCurrentChat(chatWith) {
    this._currentChat = chatWith;
  },

  loadChats(userLogin) {
    return DB.getChats(userLogin) || [];
  },

  getOrCreateChat(myLogin, withLogin) {
    const chats = DB.getChats(myLogin);
    let chat = chats.find(c => c.with === withLogin);
    if (!chat) {
      const otherUser = DB.getUser(withLogin);
      chat = {
        with: withLogin,
        name: otherUser ? otherUser.name : withLogin,
        avatar: otherUser ? otherUser.avatar : withLogin.charAt(0).toUpperCase(),
        lastMessage: '',
        lastTime: '',
        online: otherUser ? otherUser.online : false
      };
      DB.addChat(myLogin, chat);
    }
    return chat;
  },

  sendMessage(fromLogin, toLogin, text) {
    const chatId = this._getChatId(fromLogin, toLogin);
    const msg = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      from: fromLogin,
      to: toLogin,
      text,
      time: Date.now(),
      formattedTime: this._formatTime(new Date())
    };

    DB.saveMessage(chatId, msg);

    const user = Auth.getCurrentUser();
    DB.updateChatLastMessage(fromLogin, toLogin, text, msg.formattedTime);

    // Save also in recipient's chat list if exists
    const recipientChats = DB.getChats(toLogin);
    if (recipientChats && recipientChats.some(c => c.with === fromLogin)) {
      DB.updateChatLastMessage(toLogin, fromLogin, text, msg.formattedTime);
    }

    // Signal via broadcast
    DB.sendSignal({
      type: 'message',
      from: fromLogin,
      to: toLogin,
      fromName: user ? user.name : fromLogin,
      msg: msg
    });

    return msg;
  },

  getMessages(login1, login2) {
    const chatId = this._getChatId(login1, login2);
    return DB.getMessages(chatId);
  },

  _getChatId(a, b) {
    return [a, b].sort().join('_');
  },

  _formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  },

  formatDate(timestamp) {
    const d = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === now.toDateString()) return 'Сегодня';
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';

    const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
};
