import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { friendlyError, restoreGuest } from './pocketbase';
import type { Guest } from './types';

const Session = createContext<{
  guest: Guest | null;
  loading: boolean;
  error: string;
  retry: () => void;
  setGuest: (guest: Guest | null) => void;
}>({
  guest: null,
  loading: true,
  error: '',
  retry: () => {},
  setGuest: () => {},
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const retry = useCallback(() => {
    setLoading(true);
    setError('');
    restoreGuest()
      .then(setGuest)
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    void restoreGuest()
      .then(setGuest)
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);
  return (
    <Session.Provider value={{ guest, loading, error, retry, setGuest }}>
      {children}
    </Session.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export const useSession = () => useContext(Session);
