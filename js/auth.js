const Auth = {
  _currentUser: null,
  _rememberMe: false,
  _onChange: null,

  onChange(callback) {
    this._onChange = callback;
  },

  init() {
    const saved = DB.getSession();
    if (saved) {
      // We'll need server to confirm session, but for now just try
      return saved;
    }
    return null;
  },

  setUser(user, rememberMe) {
    this._currentUser = user;
    this._rememberMe = !!rememberMe;
    if (user) {
      DB.saveSession(user.login, !!rememberMe);
    }
    if (this._onChange) this._onChange(user);
  },

  getCurrentUser() {
    return this._currentUser;
  },

  isLoggedIn() {
    return !!this._currentUser;
  },

  isRemembered() {
    return this._rememberMe;
  },

  async register(name, login, email, password) {
    const result = await DB.register(name, login, email, password);
    return result;
  },

  async login(loginOrEmail, password, rememberMe) {
    const result = await DB.login(loginOrEmail, password);
    if (result.success) {
      this._currentUser = result.user;
      this._rememberMe = !!rememberMe;
      DB.saveSession(result.user.login, !!rememberMe);
    }
    return result;
  },

  logout() {
    this._currentUser = null;
    this._rememberMe = false;
    DB.clearSession();
    if (this._onChange) this._onChange(null);
  }
};
