import api from './api';

const listProducts = async (params = {}) => {
  const { data } = await api.get('/products', { params });
  return data.products || [];
};

const createProduct = async (payload) => {
  const { data } = await api.post('/products', payload);
  return data;
};

const updateProduct = async (productId, payload) => {
  const { data } = await api.put(`/products/${productId}`, payload);
  return data;
};

const deleteProduct = async (productId) => {
  const { data } = await api.delete(`/products/${productId}`);
  return data;
};

export {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct
};
