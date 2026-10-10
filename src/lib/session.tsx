import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
  clearGuestIdentity,
  friendlyError,
  GuestIdentityUnavailableError,
  restoreGuest,
} from './pocketbase';
import type { Guest } from './types';

const Session = createContext<{
  guest: Guest | null;
  loading: boolean;
  error: string;
  unavailable: boolean;
  retry: () => void;
  reset: () => void;
  setGuest: (guest: Guest | null) => void;
}>({
  guest: null,
  loading: true,
  error: '',
  unavailable: false,
  retry: () => {},
  reset: () => {},
  setGuest: () => {},
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const { pathname } = useLocation();
  const generation = useRef(0);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  const check = useCallback((blocking: boolean) => {
    const request = ++generation.current;
    if (blocking) setLoading(true);
    restoreGuest()
      .then((restored) => {
        if (request !== generation.current) return;
        setGuest(restored);
        setError('');
        setUnavailable(false);
      })
      .catch((e) => {
        if (request !== generation.current) return;
        const missing = e instanceof GuestIdentityUnavailableError;
        if (missing) setGuest(null);
        setUnavailable(missing);
        setError(friendlyError(e));
      })
      .finally(() => {
        if (request === generation.current) setLoading(false);
      });
  }, []);
  const retry = useCallback(() => check(true), [check]);
  function reset() {
    clearGuestIdentity();
    invalidate();
    setGuest(null);
    setError('');
    setUnavailable(false);
    setLoading(false);
  }
  // Route changes verify the stored identity before presenting a returning guest.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    check(true);
    return invalidate;
  }, [pathname, check, invalidate]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (pathname !== '/join') return;
    const focus = () => check(false);
    const visible = () => {
      if (document.visibilityState === 'visible') focus();
    };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [pathname, check]);
  return (
    <Session.Provider value={{ guest, loading, error, unavailable, retry, reset, setGuest }}>
      {children}
    </Session.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export const useSession = () => useContext(Session);
