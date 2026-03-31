import api from './api';

const getCart = async () => {
  const { data } = await api.get('/cart');
  return data.cart;
};

const addItemToCart = async (payload) => {
  const { data } = await api.post('/cart/items', payload);
  return data;
};

const updateCartItemQuantity = async (itemId, quantity) => {
  const { data } = await api.put(`/cart/items/${itemId}`, { quantity });
  return data.cart;
};

const removeCartItem = async (itemId) => {
  const { data } = await api.delete(`/cart/items/${itemId}`);
  return data.cart;
};

const checkoutCart = async () => {
  const { data } = await api.post('/cart/checkout');
  return data;
};

export {
  getCart,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  checkoutCart
};
