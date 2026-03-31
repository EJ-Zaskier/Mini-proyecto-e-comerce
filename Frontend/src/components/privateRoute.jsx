import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext';

const PrivateRoute = ({ role, children }) => {
  const location = useLocation();
  const { isAuthenticated, loadingUser, user } = useAuth();

  if (loadingUser) {
    return (
      <section className="card">
        <p className="muted">Validando sesion...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role && user?.role !== role) {
    return <Navigate to="/catalogo" replace />;
  }

  return children || <Outlet />;
};

export default PrivateRoute;
