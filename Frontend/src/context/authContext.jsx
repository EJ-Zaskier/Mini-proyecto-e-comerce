import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { fetchAuthenticatedUser } from '../services/authService';
import {
  clearSessionStorage,
  persistSession,
  readSessionToken,
  readSessionUser
} from '../services/sessionStore';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(readSessionToken);
  const [user, setUser] = useState(readSessionUser);
  const [loadingUser, setLoadingUser] = useState(Boolean(readSessionToken()));

  const clearSession = useCallback(() => {
    clearSessionStorage();
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(({ token: newToken, user: newUser }) => {
    persistSession({ token: newToken, user: newUser });
    setToken(newToken);
    setUser(newUser);
    setLoadingUser(false);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const storedToken = readSessionToken();
    if (!storedToken) {
      clearSession();
      return null;
    }

    try {
      const refreshedUser = await fetchAuthenticatedUser();
      persistSession({ token: storedToken, user: refreshedUser });
      setToken(storedToken);
      setUser(refreshedUser);
      return refreshedUser;
    } catch {
      clearSession();
      return null;
    }
  }, [clearSession]);

  useEffect(() => {
    let mounted = true;

    const bootstrapAuth = async () => {
      const storedToken = readSessionToken();
      if (!storedToken) {
        if (mounted) setLoadingUser(false);
        return;
      }

      if (mounted) setLoadingUser(true);
      const refreshedUser = await refreshUser();
      if (mounted) {
        setLoadingUser(false);
        if (!refreshedUser) {
          clearSession();
        }
      }
    };

    bootstrapAuth();

    return () => {
      mounted = false;
    };
  }, [clearSession, refreshUser]);

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: Boolean(token && user),
    isAdmin: user?.role === 'admin',
    loadingUser,
    login,
    logout,
    refreshUser
  }), [token, user, loadingUser, login, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
