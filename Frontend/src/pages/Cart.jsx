import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
}).format(amount);

const Cart = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0, totalItems: 0 });
  const [quantityByItem, setQuantityByItem] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toast, setToast] = useState(null);
  const [checkoutSummary, setCheckoutSummary] = useState(null);

  const syncLocalQuantities = (incomingCart) => {
    const next = {};
    for (const item of incomingCart.items) {
      next[item.itemId] = String(item.quantity);
    }
    setQuantityByItem(next);
  };

  const loadCart = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/cart');
      setCart(data.cart);
      syncLocalQuantities(data.cart);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo cargar el carrito');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (location.state?.flashMessage) {
      setSuccess(location.state.flashMessage);
      setToast({ id: Date.now(), type: 'success', message: location.state.flashMessage });
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (type, message) => {
    const normalized = String(message || '').trim();
    if (!normalized) return;
    setToast({ id: Date.now(), type, message: normalized });
  };

  const handleQuantityChange = (itemId, value) => {
    if (!/^\d*$/.test(value)) return;
    setQuantityByItem((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleUpdateItem = async (itemId) => {
    const quantity = Number.parseInt(quantityByItem[itemId], 10);
    if (!quantity || quantity < 1) {
      const errorMessage = 'La cantidad debe ser mayor o igual a 1';
      setError(errorMessage);
      showToast('error', errorMessage);
      return;
    }

    setError('');
    setSuccess('');
    setSavingItemId(itemId);

    try {
      const { data } = await api.put(`/cart/items/${itemId}`, { quantity });
      setCart(data.cart);
      syncLocalQuantities(data.cart);
      const okMessage = 'Cantidad actualizada';
      setSuccess(okMessage);
      showToast('success', okMessage);
    } catch (requestError) {
      const errorMessage = requestError?.response?.data?.message || 'No se pudo actualizar la cantidad';
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setSavingItemId('');
    }
  };

  const handleRemoveItem = async (itemId) => {
    setError('');
    setSuccess('');
    setSavingItemId(itemId);

    try {
      const { data } = await api.delete(`/cart/items/${itemId}`);
      setCart(data.cart);
      syncLocalQuantities(data.cart);
      const okMessage = 'Producto eliminado del carrito';
      setSuccess(okMessage);
      showToast('success', okMessage);
    } catch (requestError) {
      const errorMessage = requestError?.response?.data?.message || 'No se pudo eliminar el producto';
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setSavingItemId('');
    }
  };

  const handleCheckout = async () => {
    setError('');
    setSuccess('');
    setCheckoutSummary(null);
    setLoading(true);

    try {
      const { data } = await api.post('/cart/checkout');
      setCheckoutSummary(data.checkout);
      const okMessage = data.message || 'Compra simulada completada';
      setSuccess(okMessage);
      showToast('success', okMessage);
      await loadCart();
    } catch (requestError) {
      const errorMessage = requestError?.response?.data?.message || 'No se pudo completar la compra';
      setError(errorMessage);
      showToast('error', errorMessage);
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toast && (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => setToast(null)}
              aria-label="Cerrar alerta"
            >
              x
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Carrito de compras</h2>
        <p className="muted">Aqui puedes acumular varios productos y simular la compra final.</p>
      </div>

      {error && <p className="error card-message">{error}</p>}
      {success && <p className="success card-message">{success}</p>}

      {checkoutSummary && (
        <div className="card">
          <h3>Resumen de compra simulada</h3>
          <ul className="simple-list">
            {checkoutSummary.items.map((item) => (
              <li key={item.productId}>
                {item.nombre} ({item.talla}) x {item.quantity} - {formatCurrency(item.subtotal)}
              </li>
            ))}
          </ul>
          <p className="price">Total: {formatCurrency(checkoutSummary.total)}</p>
        </div>
      )}

      {loading ? (
        <p className="muted">Cargando carrito...</p>
      ) : cart.items.length === 0 ? (
        <div className="card">
          <p className="muted">Tu carrito esta vacio.</p>
        </div>
      ) : (
        <div className="stack">
          {cart.items.map((item) => (
            <article className="card cart-item" key={item.itemId}>
              <div>
                <h3>{item.nombre}</h3>
                <p className="muted">Precio: {formatCurrency(item.precio)}</p>
                <p className="muted">Talla: {item.talla}</p>
                <p className="muted">Stock disponible: {item.stockDisponible}</p>
              </div>

              <div className="cart-actions">
                <label htmlFor={`qty-${item.itemId}`}>Cantidad</label>
                <input
                  id={`qty-${item.itemId}`}
                  type="text"
                  inputMode="numeric"
                  value={quantityByItem[item.itemId] || ''}
                  onChange={(event) => handleQuantityChange(item.itemId, event.target.value)}
                />

                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => handleUpdateItem(item.itemId)}
                  disabled={savingItemId === item.itemId}
                >
                  Actualizar
                </button>

                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  onClick={() => handleRemoveItem(item.itemId)}
                  disabled={savingItemId === item.itemId}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}

          <div className="card cart-summary">
            <p>Total de articulos: {cart.totalItems}</p>
            <p className="price">Total: {formatCurrency(cart.total)}</p>
            <button type="button" className="btn" onClick={handleCheckout} disabled={loading}>
              Confirmar compra simulada
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Cart;
