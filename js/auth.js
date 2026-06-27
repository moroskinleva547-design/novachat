const Auth = {
  _currentUser: null,
  _rememberMe: false,

  init() {
    // Try session storage first
    let saved = sessionStorage.getItem('novachat_session');
    if (saved) {
      const user = DB.getUser(saved);
      if (user) {
        this._currentUser = user;
        this._rememberMe = false;
        return user;
      }
    }
    // Try persistent storage (remember me)
    saved = localStorage.getItem('novachat_session');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.expires > Date.now()) {
          const user = DB.getUser(data.login);
          if (user) {
            this._currentUser = user;
            this._rememberMe = true;
            return user;
          }
        } else {
          localStorage.removeItem('novachat_session');
        }
      } catch {}
    }
    return null;
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

  register(name, login, email, password) {
    if (!name || !login || !email || !password) {
      return { success: false, error: 'Заполните все поля' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Пароль должен быть минимум 6 символов' };
    }
    if (DB.getUser(login)) {
      return { success: false, error: 'Пользователь с таким логином уже существует' };
    }
    if (DB.getUserByEmail(email)) {
      return { success: false, error: 'Пользователь с таким email уже существует' };
    }

    const user = {
      name,
      email,
      password,
      avatar: name.charAt(0).toUpperCase(),
      online: true,
      registered: Date.now()
    };

    DB.saveUser(login, user);
    return { success: true };
  },

  login(loginOrEmail, password, rememberMe) {
    if (!loginOrEmail || !password) {
      return { success: false, error: 'Заполните все поля' };
    }

    let user = DB.getUser(loginOrEmail);

    if (!user) {
      user = DB.getUserByEmail(loginOrEmail);
    }

    if (!user) {
      return { success: false, error: 'Пользователь не найден' };
    }

    if (user.password !== password) {
      return { success: false, error: 'Неверный пароль' };
    }

    this._currentUser = user;
    this._rememberMe = !!rememberMe;

    // Save session
    if (rememberMe) {
      // Persistent: save to localStorage with 30-day expiry
      const sessionData = {
        login: user.login,
        expires: Date.now() + 30 * 24 * 60 * 60 * 1000
      };
      localStorage.setItem('novachat_session', JSON.stringify(sessionData));
      sessionStorage.removeItem('novachat_session');
    } else {
      // Session-only
      sessionStorage.setItem('novachat_session', user.login);
      localStorage.removeItem('novachat_session');
    }

    DB.saveUser(user.login, { ...user, online: true });
    return { success: true, user };
  },

  logout() {
    if (this._currentUser) {
      DB.saveUser(this._currentUser.login, { ...this._currentUser, online: false });
    }
    this._currentUser = null;
    this._rememberMe = false;
    sessionStorage.removeItem('novachat_session');
    localStorage.removeItem('novachat_session');
  }
};
