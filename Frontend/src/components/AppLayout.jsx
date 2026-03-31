import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

const navClass = ({ isActive }) => `nav-pill ${isActive ? 'nav-pill-active' : ''}`;
const THEME_KEY = 'mini-ecom-theme';

const AppLayout = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [theme, setTheme] = useState(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY);
    return savedTheme === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate('/catalogo', { replace: true });
  };

  const handleToggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-headline">
          <h1>Mini Proyecto E Comer</h1>
          <p>Ropa, calzado y accesorios</p>
        </div>

        <nav className="header-nav">
          <NavLink className={navClass} to="/catalogo">Catalogo</NavLink>
          {isAuthenticated && <NavLink className={navClass} to="/carrito">Carrito</NavLink>}
          {isAdmin && <NavLink className={navClass} to="/admin">Admin</NavLink>}
        </nav>

        <div className="session-panel">
          <button type="button" className="theme-toggle-btn" onClick={handleToggleTheme}>
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </button>

          {isAuthenticated ? (
            <>
              <div className="session-chip">
                <strong>{user.nombre}</strong>
              </div>
              <button type="button" className="btn btn-secondary" onClick={handleLogout}>
                Cerrar sesion
              </button>
            </>
          ) : (
            <>
              <NavLink className={navClass} to="/login">Entrar</NavLink>
              <NavLink className={navClass} to="/registro">Crear cuenta</NavLink>
            </>
          )}
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
