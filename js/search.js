const Search = {
  async search(query) {
    if (!query || query.length < 1) return [];
    return await DB.searchUsers(query);
  }
};
