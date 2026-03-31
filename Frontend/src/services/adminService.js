import api from './api';

const DEFAULT_LIMIT = 100;

const getAdminOverview = async () => {
  const { data } = await api.get('/admin/overview');
  return data.overview;
};

const getAdminUsers = async (limit = DEFAULT_LIMIT) => {
  const { data } = await api.get('/admin/users', { params: { limit } });
  return data.users || [];
};

const getAdminSessions = async (limit = DEFAULT_LIMIT) => {
  const { data } = await api.get('/admin/sessions', { params: { limit } });
  return data.sessions || [];
};

const getAdminAuditLogs = async (limit = DEFAULT_LIMIT) => {
  const { data } = await api.get('/admin/audit-logs', { params: { limit } });
  return data.logs || [];
};

const seedDemoProducts = async (count = 45) => {
  const { data } = await api.post('/admin/seed-products', { count });
  return data;
};

const createAdminUser = async (payload) => {
  const { data } = await api.post('/admin/users', payload);
  return data;
};

const updateAdminUserRole = async (userId, role) => {
  const { data } = await api.patch(`/admin/users/${userId}/role`, { role });
  return data;
};

const deleteAdminUser = async (userId) => {
  const { data } = await api.delete(`/admin/users/${userId}`);
  return data;
};

export {
  getAdminOverview,
  getAdminUsers,
  getAdminSessions,
  getAdminAuditLogs,
  seedDemoProducts,
  createAdminUser,
  updateAdminUserRole,
  deleteAdminUser
};
