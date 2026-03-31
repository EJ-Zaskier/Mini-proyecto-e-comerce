const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const removeInvalidUser = () => {
  sessionStorage.removeItem(USER_KEY);
};

const readSessionToken = () => sessionStorage.getItem(TOKEN_KEY);

const readSessionUser = () => {
  const rawUser = sessionStorage.getItem(USER_KEY);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch {
    removeInvalidUser();
    return null;
  }
};

const persistSession = ({ token, user }) => {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
};

const clearSessionStorage = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
};

export {
  readSessionToken,
  readSessionUser,
  persistSession,
  clearSessionStorage
};
