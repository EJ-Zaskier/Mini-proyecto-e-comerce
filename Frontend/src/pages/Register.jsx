import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { registerRequest } from '../services/authService';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await registerRequest(form);
      login({ token: data.token, user: data.user });
      navigate('/catalogo', { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h2>Crear cuenta</h2>
        <p className="muted">Las cuentas nuevas nacen como usuario normal por seguridad.</p>

        <label htmlFor="nombre">Nombre</label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          value={form.nombre}
          onChange={handleChange}
          placeholder="Tu nombre"
          autoComplete="name"
          minLength={2}
          maxLength={80}
          required
        />

        <label htmlFor="email">Correo</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="correo@ejemplo.com"
          autoComplete="email"
          required
        />

        <label htmlFor="password">Contrasena</label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Minimo 8 caracteres"
          autoComplete="new-password"
          minLength={8}
          maxLength={64}
          required
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Creando...' : 'Crear cuenta'}
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
          Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
        </p>
      </form>
    </section>
  );
};

export default Register;
