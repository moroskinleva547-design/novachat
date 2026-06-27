const Search = {
  search(query) {
    if (!query || query.length < 1) return [];

    const q = query.toLowerCase();
    const users = DB.getAllUsers();
    const currentUser = Auth.getCurrentUser();

    return users.filter(u => {
      if (currentUser && u.login === currentUser.login) return false;
      return u.name.toLowerCase().includes(q) ||
             u.login.toLowerCase().includes(q) ||
             u.email.toLowerCase().includes(q);
    });
  }
};
