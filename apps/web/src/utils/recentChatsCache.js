const CACHE_KEY = 'sendrey_recent_chats';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export const getCachedRecentChats = (runnerId) => {
  try {
    const data = localStorage.getItem(`${CACHE_KEY}_${runnerId}`);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    // Check if cache is expired
    if (parsed.expiry && Date.now() > parsed.expiry) {
      localStorage.removeItem(`${CACHE_KEY}_${runnerId}`);
      return null;
    }
    
    return parsed.chats || [];
  } catch (error) {
    console.warn('[recentChatsCache] Failed to get cache:', error);
    return null;
  }
};

export const setCachedRecentChats = (runnerId, chats) => {
  try {
    const data = {
      chats,
      expiry: Date.now() + CACHE_EXPIRY,
    };
    localStorage.setItem(`${CACHE_KEY}_${runnerId}`, JSON.stringify(data));
  } catch (error) {
    console.warn('[recentChatsCache] Failed to set cache:', error);
  }
};

export const clearCachedRecentChats = (runnerId) => {
  try {
    localStorage.removeItem(`${CACHE_KEY}_${runnerId}`);
  } catch (error) {
    console.warn('[recentChatsCache] Failed to clear cache:', error);
  }
};