import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { loginRequest } from '../services/authService';
import { addItemToCart } from '../services/cartService';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handlePendingAction = async (pendingAction) => {
    if (!pendingAction?.type) return false;

    if (pendingAction.type === 'add_to_cart' && pendingAction.productId) {
      await addItemToCart({
        productId: pendingAction.productId,
        quantity: pendingAction.quantity || 1,
        talla: pendingAction.talla
      });

      navigate('/carrito', {
        replace: true,
        state: {
          flashMessage: `"${pendingAction.productName}" (${pendingAction.talla || 'UNITALLA'}) se agrego al carrito`
        }
      });
      return true;
    }

    return false;
  };

  const getPostLoginPath = (loggedUser) => {
    const fromPath = location.state?.from?.pathname || '/catalogo';
    if (loggedUser.role === 'admin') {
      return '/admin';
    }

    if (fromPath.startsWith('/admin')) {
      return '/catalogo';
    }

    return fromPath;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginRequest(form);
      login({ token: data.token, user: data.user });

      const pendingAction = location.state?.pendingAction;
      if (pendingAction) {
        try {
          const handled = await handlePendingAction(pendingAction);
          if (handled) return;
        } catch (pendingError) {
          navigate('/catalogo', {
            replace: true,
            state: {
              flashError: pendingError?.response?.data?.message || 'No se pudo completar la accion pendiente'
            }
          });
          return;
        }
      }

      navigate(getPostLoginPath(data.user), { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h2>Iniciar sesion</h2>
        <p className="muted">Solo se solicita sesion al comprar o gestionar el panel admin.</p>

        <label htmlFor="email">Correo</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="correo@ejemplo.com"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />

        <label htmlFor="password">Contrasena</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="********"
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
          minLength={8}
          required
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/catalogo', { replace: true })}
          disabled={loading}
        >
          Cancelar
        </button>

        <p className="muted">
          No tienes cuenta? <Link to="/registro">Registrate aqui</Link>
        </p>
      </form>
    </section>
  );
};

export default Login;
