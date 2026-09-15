const TOKEN_KEY = 'recruitx_auth_token';

export const tokenStorage = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.error('Error reading token from localStorage', e);
      return null;
    }
  },

  setToken: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('Error saving token to localStorage', e);
    }
  },

  removeToken: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error('Error removing token from localStorage', e);
    }
  },
};
