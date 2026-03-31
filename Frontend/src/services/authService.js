import api from './api';

const loginRequest = async (credentials) => {
  const { data } = await api.post('/auth/login', credentials);
  return data;
};

const registerRequest = async (payload) => {
  const { data } = await api.post('/auth/register', payload);
  return data;
};

const fetchAuthenticatedUser = async () => {
  const { data } = await api.get('/auth/me');
  return data.user;
};

export {
  loginRequest,
  registerRequest,
  fetchAuthenticatedUser
};
