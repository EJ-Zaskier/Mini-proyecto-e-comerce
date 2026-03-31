import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import useToast from '../hooks/useToast';
import { seedDemoProducts } from '../services/adminService';
import { addItemToCart } from '../services/cartService';
import { listProducts } from '../services/productsService';

const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
}).format(amount);

const segmentOptions = [
  { value: '', label: 'Todos' },
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
  { value: 'nino', label: 'Niño' },
  { value: 'nina', label: 'Niña' },
  { value: 'bebe', label: 'Bebe' }
];

const categoryOptions = [
  '',
  'ropa',
  'calzado',
  'accesorios',
  'deportivo',
  'formal',
  'playeras',
  'pantalones',
  'servicios',
  'otros'
];

const segmentLabelMap = segmentOptions.reduce((acc, option) => {
  if (option.value) acc[option.value] = option.label;
  return acc;
}, {});

const getDefaultTalla = (product) => {
  if (Array.isArray(product.tallas) && product.tallas.length > 0) {
    return product.tallas[0].talla;
  }
  return 'UNITALLA';
};

const Products = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submittingProductId, setSubmittingProductId] = useState('');
  const [selectionByProduct, setSelectionByProduct] = useState({});
  const [query, setQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('producto');
  const [seedingDemo, setSeedingDemo] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const loadProducts = async () => {
    setLoading(true);
    setError('');

    try {
      const nextProducts = await listProducts({
        q: query || undefined,
        categoria: categoryFilter || undefined,
        tipo: typeFilter || undefined,
        segmento: segmentFilter || undefined,
        limit: 100
      });
      setProducts(nextProducts);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo cargar el catalogo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (location.state?.flashMessage) {
      setSuccess(location.state.flashMessage);
      showToast('success', location.state.flashMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }

    if (location.state?.flashError) {
      setError(location.state.flashError);
      showToast('error', location.state.flashError);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate, showToast]);

  useEffect(() => {
    setSelectionByProduct((current) => {
      const next = { ...current };
      let changed = false;

      for (const product of products) {
        if (!next[product._id]) {
          next[product._id] = {
            talla: getDefaultTalla(product),
            quantity: 1
          };
          changed = true;
        } else if (Array.isArray(product.tallas) && product.tallas.length > 0) {
          const hasSelectedSize = product.tallas.some((size) => size.talla === next[product._id].talla);
          if (!hasSelectedSize) {
            next[product._id] = {
              ...next[product._id],
              talla: product.tallas[0].talla
            };
            changed = true;
          }
        }
      }

      return changed ? next : current;
    });
  }, [products]);

  const featuredProduct = products[0] || null;
  const featuredName = featuredProduct?.nombre || 'Coleccion premium';
  const featuredPrice = featuredProduct ? formatCurrency(featuredProduct.precio) : 'Nuevas prendas';

  const handleFilterSubmit = async (event) => {
    event.preventDefault();
    await loadProducts();
  };

  const handleSelectChange = (productId, field, value) => {
    setSelectionByProduct((prev) => ({
      ...prev,
      [productId]: {
        talla: prev[productId]?.talla || 'UNITALLA',
        quantity: prev[productId]?.quantity || 1,
        [field]: field === 'quantity' ? Number(value) : value
      }
    }));
  };

  const handleAddToCart = async (product) => {
    setError('');
    setSuccess('');
    setSubmittingProductId(product._id);

    const selection = selectionByProduct[product._id] || {
      talla: getDefaultTalla(product),
      quantity: 1
    };

    const payload = {
      productId: product._id,
      quantity: Math.max(1, Number(selection.quantity) || 1),
      talla: selection.talla
    };

    if (!isAuthenticated) {
      setSubmittingProductId('');
      navigate('/login', {
        state: {
          from: location,
          pendingAction: {
            type: 'add_to_cart',
            productId: product._id,
            quantity: payload.quantity,
            talla: payload.talla,
            productName: product.nombre
          }
        }
      });
      return;
    }

    try {
      await addItemToCart(payload);
      const okMessage = `"${product.nombre}" (${payload.talla}) se agrego al carrito`;
      setSuccess(okMessage);
      showToast('success', okMessage);
      await loadProducts();
    } catch (requestError) {
      const errorMessage = requestError?.response?.data?.message || 'No se pudo agregar al carrito';
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setSubmittingProductId('');
    }
  };

  const handleSeedDemoProducts = async () => {
    setSeedingDemo(true);
    setError('');
    setSuccess('');

    try {
      const data = await seedDemoProducts(45);
      const okMessage = `${data.inserted} productos demo agregados`;
      setSuccess(okMessage);
      showToast('success', okMessage);
      await loadProducts();
    } catch (requestError) {
      const errorMessage = requestError?.response?.data?.message || 'No se pudieron crear productos demo';
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setSeedingDemo(false);
    }
  };

  return (
    <section className="catalog-root">
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toast && (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={hideToast}
              aria-label="Cerrar alerta"
            >
              x
            </button>
          </div>
        )}
      </div>

      <div className="hero-banner card fade-up">
        <div className="hero-copy">
          <p className="hero-kicker">Coleccion destacada</p>
          <h2>Moda premium para toda la familia</h2>
          <p>Explora ropa, calzado y accesorios por segmento. Compra por talla exacta con stock validado.</p>
          <div className="hero-actions">
            <button type="button" className="btn btn-cta" onClick={loadProducts}>Explorar ahora</button>
            {isAuthenticated ? (
              <Link to="/carrito" className="btn btn-outline">Ir al carrito</Link>
            ) : (
              <Link to="/login" className="btn btn-outline">Iniciar sesion</Link>
            )}
          </div>
        </div>

        <div className="hero-feature">
          <div className="image-placeholder hero-image-placeholder" role="img" aria-label={featuredName}>
            <div className="image-placeholder-icon" />
            <strong>IMG</strong>
            <span>IMAGE NOT AVAILABLE</span>
          </div>
          <div className="hero-feature-info">
            <strong>{featuredName}</strong>
            <span>{featuredPrice}</span>
          </div>
        </div>
      </div>

      <div className="card fade-up">
        <form className="filters filters-luxe" onSubmit={handleFilterSubmit}>
          <input
            type="text"
            placeholder="Buscar por nombre o descripcion"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <select value={segmentFilter} onChange={(event) => setSegmentFilter(event.target.value)}>
            {segmentOptions.map((segment) => (
              <option key={segment.value || 'all'} value={segment.value}>{segment.label}</option>
            ))}
          </select>

          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            {categoryOptions.map((category) => (
              <option key={category || 'all'} value={category}>
                {category ? category : 'Todas las categorias'}
              </option>
            ))}
          </select>

          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="producto">Producto</option>
            <option value="servicio">Servicio</option>
          </select>

          <button type="submit" className="btn">Filtrar</button>
        </form>
      </div>

      {error && <p className="error card-message">{error}</p>}
      {success && <p className="success card-message">{success}</p>}

      {loading ? (
        <p className="muted">Cargando catalogo...</p>
      ) : products.length === 0 ? (
        <div className="card">
          <p className="muted">No hay productos para los filtros actuales.</p>
          {isAdmin && (
            <button
              type="button"
              className="btn btn-cta"
              onClick={handleSeedDemoProducts}
              disabled={seedingDemo}
            >
              {seedingDemo ? 'Generando catalogo...' : 'Generar catalogo demo'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid fade-up">
          {products.map((product) => {
            const selection = selectionByProduct[product._id] || {
              talla: getDefaultTalla(product),
              quantity: 1
            };
            const availableSizes = Array.isArray(product.tallas) && product.tallas.length > 0
              ? product.tallas
              : [{ talla: 'UNITALLA', stock: product.stock }];
            const selectedSizeStock = availableSizes.find((size) => size.talla === selection.talla)?.stock ?? product.stock;

            return (
              <article className="card product-card lift-card" key={product._id}>
                <div className="product-image image-placeholder" role="img" aria-label={product.nombre}>
                  <div className="image-placeholder-icon" />
                  <strong>IMG</strong>
                  <span>IMAGE NOT AVAILABLE</span>
                </div>

                <h4>{product.nombre}</h4>
                <p className="muted product-desc">{product.descripcion}</p>
                <p className="price">{formatCurrency(product.precio)}</p>
                <div className="product-meta">
                  <span className="chip">{product.categoria}</span>
                  <span className="chip chip-dark">{segmentLabelMap[product.segmento] || product.segmento}</span>
                </div>

                <div className="purchase-controls">
                  <label htmlFor={`size-${product._id}`}>Talla</label>
                  <select
                    id={`size-${product._id}`}
                    value={selection.talla}
                    onChange={(event) => handleSelectChange(product._id, 'talla', event.target.value)}
                  >
                    {availableSizes.map((size) => (
                      <option key={`${product._id}-${size.talla}`} value={size.talla}>
                        {size.talla} (stock {size.stock})
                      </option>
                    ))}
                  </select>

                  <label htmlFor={`qty-${product._id}`}>Cantidad</label>
                  <input
                    id={`qty-${product._id}`}
                    type="number"
                    min="1"
                    max={Math.max(1, selectedSizeStock)}
                    value={selection.quantity}
                    onChange={(event) => handleSelectChange(product._id, 'quantity', event.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-cta"
                  onClick={() => handleAddToCart(product)}
                  disabled={selectedSizeStock <= 0 || submittingProductId === product._id}
                >
                  {selectedSizeStock <= 0
                    ? 'Agotado'
                    : submittingProductId === product._id
                      ? 'Procesando...'
                      : isAuthenticated
                        ? 'Agregar al carrito'
                        : 'Iniciar sesion para comprar'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Products;
