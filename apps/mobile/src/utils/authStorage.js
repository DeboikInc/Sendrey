import { Preferences } from '@capacitor/preferences';

const isCapacitor = window.Capacitor?.isNativePlatform?.();

export const authStorage = {
  async setTokens(accessToken, refreshToken, userType) {
    if (isCapacitor) {
      await Preferences.set({ key: 'accessToken', value: accessToken });
      await Preferences.set({ key: 'refreshToken', value: refreshToken });
      if (userType) await Preferences.set({ key: 'userType', value: userType });
    } else {
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      if (userType) localStorage.setItem('userType', userType);
    }
  },

  async getTokens() {
    if (isCapacitor) {
      const { value: accessToken } = await Preferences.get({ key: 'accessToken' });
      const { value: refreshToken } = await Preferences.get({ key: 'refreshToken' });
      const { value: userType } = await Preferences.get({ key: 'userType' });
      return { accessToken, refreshToken, userType };
    }
    return {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
      userType: localStorage.getItem('userType'),
    };
  },

  async clearTokens() {
    if (isCapacitor) {
      await Preferences.remove({ key: 'accessToken' });
      await Preferences.remove({ key: 'refreshToken' });
      await Preferences.remove({ key: 'userType' });
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userType');
    }
  },
};