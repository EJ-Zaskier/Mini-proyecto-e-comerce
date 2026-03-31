import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import PrivateRoute from './components/privateRoute.jsx';
import AdminDashboard from './pages/AdminDashboard';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Products from './pages/Products';
import Register from './pages/Register';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/catalogo" replace />} />
          <Route path="/catalogo" element={<Products />} />

          <Route element={<PrivateRoute />}>
            <Route path="/carrito" element={<Cart />} />
          </Route>

          <Route element={<PrivateRoute role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/catalogo" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
