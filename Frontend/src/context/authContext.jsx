import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const readStoredToken = () => sessionStorage.getItem('token');

const readStoredUser = () => {
  const rawUser = sessionStorage.getItem('user');
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch {
    sessionStorage.removeItem('user');
    return null;
  }
};

const persistSession = ({ token, user }) => {
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('user', JSON.stringify(user));
};

const clearPersistedSession = () => {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(readStoredToken);
  const [user, setUser] = useState(readStoredUser);
  const [loadingUser, setLoadingUser] = useState(Boolean(readStoredToken()));

  const clearSession = useCallback(() => {
    clearPersistedSession();
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
    const storedToken = readStoredToken();
    if (!storedToken) {
      clearSession();
      return null;
    }

    try {
      const { data } = await api.get('/auth/me');
      const refreshedUser = data.user;
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
      const storedToken = readStoredToken();
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
