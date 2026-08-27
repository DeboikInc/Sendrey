export const authStorage = {
  async setTokens() {
    // desktop: tokens live in httpOnly cookies
  },

  async getTokens() {
    return { accessToken: null, refreshToken: null };
  },

  async clearTokens() {

  },
};