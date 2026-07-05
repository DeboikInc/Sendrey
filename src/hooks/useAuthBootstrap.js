// hooks/useAuthBootstrap.js - mobile
import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { authStorage } from '../utils/authStorage';
import { clearCredentials, fetchRunnerMe, fetchUserMe, wipeRunnerLocalStorage } from '../Redux/authSlice';
import { setActiveChat } from '../Redux/orderSlice';
import chatStorage from '../utils/chatStorage';
import { persistor } from '../store/store';
import useOrderStore from '../store/orderStore';

const RETRY_DELAYS = [4000, 8000, 12000];

const fetchWithRetry = async (fetchFn, type, retryDelays = RETRY_DELAYS) => {
  for (let i = 0; i <= retryDelays.length; i++) {
    try {
      const result = await fetchFn();
      return { status: 'ok', data: result };
    } catch (error) {
      const status = error?.response?.status ?? error?.status;
      const isAuthError = status === 401;

      if (isAuthError) {
        return { status: 'auth_failed', data: error };
      }

      if (i < retryDelays.length) {
        console.log(`[Bootstrap] ${type} request failed (non-401), retrying in ${retryDelays[i]}ms...`, error?.message);
        await new Promise(resolve => setTimeout(resolve, retryDelays[i]));
        continue;
      }

      return { status: 'network_error', data: error };
    }
  }

  return { status: 'network_error' };
};

export const useAuthBootstrap = () => {
  const dispatch = useDispatch();
  const [isReady, setIsReady] = useState(false);
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    const bootstrap = async () => {
      if (hasBootstrapped.current) {
        setIsReady(true);
        return;
      }
      hasBootstrapped.current = true;

      try {
        const storedUser = (() => {
          try {
            const persisted = JSON.parse(localStorage.getItem('persist:auth') || '{}');
            const runner = JSON.parse(persisted.runner || 'null');
            const user = JSON.parse(persisted.user || 'null');
            return runner || user;
          } catch {
            return null;
          }
        })();

        const isRunnerPath = window.location.pathname.startsWith('/raw') ||
          window.location.pathname.startsWith('/profile') ||
          window.location.pathname.startsWith('/wallet') ||
          window.location.pathname.startsWith('/disputes') ||
          window.location.pathname.startsWith('/payout') ||
          window.location.pathname.startsWith('/all-orders');

        const userType = isRunnerPath || storedUser?.userType === 'runner' || storedUser?.role === 'runner'
          ? 'runner'
          : 'user';

        const { accessToken, refreshToken } = await authStorage.getTokens();
        if (!accessToken && !refreshToken) {
          const runnerId = (() => {
            try {
              const persisted = JSON.parse(localStorage.getItem('persist:auth') || '{}');
              return JSON.parse(persisted.runner || 'null')?._id;
            } catch {
              return undefined;
            }
          })();

          if (runnerId) {
            wipeRunnerLocalStorage(runnerId);
            localStorage.removeItem(`bot_messages_${runnerId}`);
          }

          dispatch(clearCredentials());
          await persistor.purge();
          setIsReady(true);
          return;
        }

        let fetchResult;

        if (userType === 'runner') {
          fetchResult = await fetchWithRetry(() => dispatch(fetchRunnerMe()).unwrap(), 'runner');
        } else {
          fetchResult = await fetchWithRetry(() => dispatch(fetchUserMe()).unwrap(), 'user');
        }

        if (fetchResult.status === 'network_error') {
          console.warn('[Bootstrap] server unreachable after retries — proceeding anyway');
          setIsReady(true);
          return;
        }

        if (fetchResult.status === 'auth_failed') {
          const id = userType === 'runner'
            ? fetchResult.data?.payload?.runner?._id
            : fetchResult.data?.payload?.user?._id;

          if (userType === 'runner' && id) {
            wipeRunnerLocalStorage(id);
            localStorage.removeItem(`bot_messages_${id}`);
          }

          useOrderStore.getState()._reset();
          dispatch(clearCredentials());
          await persistor.purge();
          await authStorage.clearTokens();

          // No navigation — ProtectedRoute renders the logged-out state
          // reactively once user/runner is null in Redux.
          setIsReady(true);
          return;
        }

        // Restore active chat
        const { chatId, orderId } = await chatStorage.getActiveChat();
        if (chatId) dispatch(setActiveChat({ chatId, orderId }));

      } catch (err) {
        console.error('[AuthBootstrap:App] Unexpected bootstrap error:', err);
      } finally {
        setIsReady(true);
      }
    };

    bootstrap();
  }, [dispatch]);

  return isReady;
};