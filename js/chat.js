const Chat = {
  _currentChat: null,
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

  formatDate(timestamp) {
    const d = new Date(timestamp);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Сегодня';
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  },

  _formatTime(date) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
};
