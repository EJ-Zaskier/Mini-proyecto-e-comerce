import { useEffect, useState } from 'react';
import { useAuth } from '../context/authContext';
import {
  createAdminUser,
  deleteAdminUser,
  getAdminAuditLogs,
  getAdminOverview,
  getAdminSessions,
  getAdminUsers,
  seedDemoProducts,
  updateAdminUserRole
} from '../services/adminService';
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct
} from '../services/productsService';
import {
  adminTabs,
  categories,
  defaultOverview,
  initialProductForm,
  initialUserForm,
  segmentLabels,
  segments
} from './admin/constants';
import {
  formatAuditDetail,
  formatDate,
  getActionLabel,
  parseSizeStock,
  sizesToText
} from './admin/utils';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('productos');
  const [loadingTab, setLoadingTab] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [overview, setOverview] = useState(defaultOverview);

  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState(initialProductForm);
  const [editingProductId, setEditingProductId] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [seedingProducts, setSeedingProducts] = useState(false);

  const [users, setUsers] = useState([]);
  const [roleDraftByUser, setRoleDraftByUser] = useState({});
  const [savingRoleUserId, setSavingRoleUserId] = useState('');
  const [deletingUserId, setDeletingUserId] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [userForm, setUserForm] = useState(initialUserForm);

  const [sessions, setSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const loadOverview = async () => {
    const nextOverview = await getAdminOverview();
    setOverview(nextOverview);
  };

  const loadProducts = async () => {
    const nextProducts = await listProducts({ limit: 100 });
    setProducts(nextProducts);
  };

  const loadUsers = async () => {
    const incomingUsers = await getAdminUsers();
    setUsers(incomingUsers);
    const nextRoleDraft = {};
    for (const currentUser of incomingUsers) {
      nextRoleDraft[currentUser._id] = currentUser.role;
    }
    setRoleDraftByUser(nextRoleDraft);
  };

  const loadSessions = async () => {
    const nextSessions = await getAdminSessions();
    setSessions(nextSessions);
  };

  const loadAuditLogs = async () => {
    const nextAuditLogs = await getAdminAuditLogs();
    setAuditLogs(nextAuditLogs);
  };

  const refreshCurrentTab = async () => {
    setLoadingTab(true);
    setError('');

    try {
      await loadOverview();

      const tabLoaders = {
        productos: loadProducts,
        usuarios: loadUsers,
        sesiones: loadSessions,
        auditoria: loadAuditLogs
      };
      const loadActiveTab = tabLoaders[activeTab];
      if (loadActiveTab) await loadActiveTab();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo cargar el panel admin');
    } finally {
      setLoadingTab(false);
    }
  };

  useEffect(() => {
    refreshCurrentTab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleProductField = (event) => {
    setProductForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const resetProductForm = () => {
    setProductForm(initialProductForm);
    setEditingProductId('');
  };

  const handleSeedProducts = async () => {
    setSeedingProducts(true);
    setError('');
    setSuccess('');

    try {
      const data = await seedDemoProducts(45);
      setSuccess(`${data.inserted} productos demo agregados al catalogo`);
      await loadProducts();
      await loadOverview();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudieron generar productos demo');
    } finally {
      setSeedingProducts(false);
    }
  };

  const handleSubmitProduct = async (event) => {
    event.preventDefault();
    setSavingProduct(true);
    setError('');
    setSuccess('');

    try {
      const parsedSizes = parseSizeStock(productForm.tallasTexto);
      const payload = {
        nombre: productForm.nombre,
        descripcion: productForm.descripcion,
        precio: Number(productForm.precio),
        stock: Number(productForm.stock),
        tipo: productForm.tipo,
        categoria: productForm.categoria,
        segmento: productForm.segmento,
        tallas: parsedSizes,
        imagenUrl: productForm.imagenUrl
      };

      if (editingProductId) {
        await updateProduct(editingProductId, payload);
        setSuccess('Producto actualizado correctamente');
      } else {
        await createProduct(payload);
        setSuccess('Producto creado correctamente');
      }

      resetProductForm();
      await loadProducts();
      await loadOverview();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'No se pudo guardar el producto');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleEditProduct = (product) => {
    setProductForm({
      nombre: product.nombre,
      descripcion: product.descripcion,
      precio: String(product.precio),
      stock: String(product.stock),
      tipo: product.tipo,
      categoria: product.categoria,
      segmento: product.segmento || 'unisex',
      tallasTexto: sizesToText(product.tallas),
      imagenUrl: product.imagenUrl || ''
    });
    setEditingProductId(product._id);
    setSuccess('');
    setError('');
  };

  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(`Se eliminara "${product.nombre}" del catalogo. Deseas continuar?`);
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      await deleteProduct(product._id);
      setSuccess('Producto eliminado correctamente');
      await loadProducts();
      await loadOverview();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo eliminar el producto');
    }
  };

  const handleRoleDraftChange = (userId, roleValue) => {
    setRoleDraftByUser((prev) => ({ ...prev, [userId]: roleValue }));
  };

  const handleSaveUserRole = async (targetUser) => {
    const nextRole = roleDraftByUser[targetUser._id];
    if (!nextRole || nextRole === targetUser.role) {
      return;
    }

    setSavingRoleUserId(targetUser._id);
    setError('');
    setSuccess('');

    try {
      await updateAdminUserRole(targetUser._id, nextRole);
      setSuccess(`Rol actualizado para ${targetUser.email}`);
      await loadUsers();
      await loadOverview();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo actualizar el rol');
    } finally {
      setSavingRoleUserId('');
    }
  };

  const handleDeleteUser = async (targetUser) => {
    const confirmed = window.confirm(`Se eliminara la cuenta de ${targetUser.email} y su historial. Continuar?`);
    if (!confirmed) return;

    setDeletingUserId(targetUser._id);
    setError('');
    setSuccess('');

    try {
      await deleteAdminUser(targetUser._id);
      setSuccess(`Cuenta eliminada: ${targetUser.email}`);
      await Promise.all([loadUsers(), loadOverview(), loadSessions(), loadAuditLogs()]);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo eliminar la cuenta');
    } finally {
      setDeletingUserId('');
    }
  };

  const handleUserFormField = (event) => {
    setUserForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setCreatingUser(true);
    setError('');
    setSuccess('');

    try {
      await createAdminUser(userForm);
      setSuccess(`Cuenta creada: ${userForm.email}`);
      setUserForm(initialUserForm);
      await Promise.all([loadUsers(), loadOverview(), loadAuditLogs()]);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo crear el usuario');
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <section className="stack">
      <div className="card fade-up admin-header">
        <h2>Dashboard administrador</h2>
        <p className="muted">Control total de catalogo, cuentas, sesiones e historial de actividad.</p>
      </div>

      <div className="overview-grid">
        <article className="card metric fade-up">
          <h3>{overview.totalUsers}</h3>
          <p>Usuarios</p>
        </article>
        <article className="card metric fade-up">
          <h3>{overview.totalAdmins}</h3>
          <p>Admins</p>
        </article>
        <article className="card metric fade-up">
          <h3>{overview.totalProducts}</h3>
          <p>Productos activos</p>
        </article>
        <article className="card metric fade-up">
          <h3>{overview.totalSessions}</h3>
          <p>Sesiones</p>
        </article>
        <article className="card metric fade-up">
          <h3>{overview.totalLogs}</h3>
          <p>Eventos auditados</p>
        </article>
      </div>

      <div className="card tab-switcher fade-up">
        {adminTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-button ${activeTab === tab.id ? 'tab-button-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="error card-message">{error}</p>}
      {success && <p className="success card-message">{success}</p>}
      {loadingTab && <p className="muted">Cargando informacion...</p>}

      {activeTab === 'productos' && (
        <div className="stack">
          <div className="card fade-up">
            <button
              type="button"
              className="btn btn-cta"
              onClick={handleSeedProducts}
              disabled={seedingProducts}
            >
              {seedingProducts ? 'Generando productos...' : 'Generar productos demo (hombre/mujer/nino/nina/bebe)'}
            </button>
          </div>

          <form className="card form-grid fade-up" onSubmit={handleSubmitProduct}>
            <h3>{editingProductId ? 'Editar producto' : 'Nuevo producto/servicio'}</h3>

            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              name="nombre"
              value={productForm.nombre}
              onChange={handleProductField}
              minLength={2}
              maxLength={120}
              required
            />

            <label htmlFor="descripcion">Descripcion</label>
            <textarea
              id="descripcion"
              name="descripcion"
              rows={3}
              value={productForm.descripcion}
              onChange={handleProductField}
              minLength={10}
              maxLength={500}
              required
            />

            <div className="two-columns">
              <div>
                <label htmlFor="precio">Precio</label>
                <input
                  id="precio"
                  name="precio"
                  type="number"
                  value={productForm.precio}
                  onChange={handleProductField}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label htmlFor="stock">Stock base (si no hay tallas)</label>
                <input
                  id="stock"
                  name="stock"
                  type="number"
                  value={productForm.stock}
                  onChange={handleProductField}
                  min="0"
                  step="1"
                />
              </div>
            </div>

            <div className="two-columns">
              <div>
                <label htmlFor="tipo">Tipo</label>
                <select id="tipo" name="tipo" value={productForm.tipo} onChange={handleProductField}>
                  <option value="producto">Producto</option>
                  <option value="servicio">Servicio</option>
                </select>
              </div>

              <div>
                <label htmlFor="categoria">Categoria</label>
                <select id="categoria" name="categoria" value={productForm.categoria} onChange={handleProductField}>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            <label htmlFor="segmento">Segmento</label>
            <select id="segmento" name="segmento" value={productForm.segmento} onChange={handleProductField}>
              {segments.map((segment) => (
                <option key={segment} value={segment}>{segmentLabels[segment] || segment}</option>
              ))}
            </select>

            <label htmlFor="tallasTexto">Tallas y stock (ej: S:10, M:8, L:6)</label>
            <input
              id="tallasTexto"
              name="tallasTexto"
              value={productForm.tallasTexto}
              onChange={handleProductField}
              placeholder="S:10, M:8, L:6"
            />

            <label htmlFor="imagenUrl">URL imagen</label>
            <input
              id="imagenUrl"
              name="imagenUrl"
              type="url"
              value={productForm.imagenUrl}
              onChange={handleProductField}
              placeholder="https://..."
            />

            <div className="inline-buttons">
              <button type="submit" className="btn btn-cta" disabled={savingProduct}>
                {savingProduct ? 'Guardando...' : editingProductId ? 'Actualizar producto' : 'Crear producto'}
              </button>
              {editingProductId && (
                <button type="button" className="btn btn-secondary" onClick={resetProductForm}>
                  Cancelar edicion
                </button>
              )}
            </div>
          </form>

          <div className="card table-wrapper fade-up">
            <h3>Productos activos</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Segmento</th>
                  <th>Categoria</th>
                  <th>Precio</th>
                  <th>Tallas</th>
                  <th>Stock</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id}>
                    <td>{product.nombre}</td>
                    <td>{segmentLabels[product.segmento] || product.segmento || 'Unisex'}</td>
                    <td>{product.categoria}</td>
                    <td>{product.precio}</td>
                    <td>{sizesToText(product.tallas) || 'UNITALLA'}</td>
                    <td>{product.stock}</td>
                    <td className="table-actions">
                      <button type="button" className="btn btn-small" onClick={() => handleEditProduct(product)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-danger btn-small" onClick={() => handleDeleteProduct(product)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'usuarios' && (
        <div className="stack">
          <form className="card form-grid fade-up" onSubmit={handleCreateUser}>
            <h3>Agregar usuario</h3>

            <div className="two-columns">
              <div>
                <label htmlFor="user-nombre">Nombre</label>
                <input
                  id="user-nombre"
                  name="nombre"
                  value={userForm.nombre}
                  onChange={handleUserFormField}
                  minLength={2}
                  maxLength={80}
                  required
                />
              </div>

              <div>
                <label htmlFor="user-email">Email</label>
                <input
                  id="user-email"
                  name="email"
                  type="email"
                  value={userForm.email}
                  onChange={handleUserFormField}
                  required
                />
              </div>
            </div>

            <div className="two-columns">
              <div>
                <label htmlFor="user-password">Contrasena</label>
                <input
                  id="user-password"
                  name="password"
                  type="password"
                  value={userForm.password}
                  onChange={handleUserFormField}
                  minLength={8}
                  maxLength={64}
                  required
                />
              </div>
              <div>
                <label htmlFor="user-role">Rol</label>
                <select id="user-role" name="role" value={userForm.role} onChange={handleUserFormField}>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-cta" disabled={creatingUser}>
              {creatingUser ? 'Creando...' : 'Crear usuario'}
            </button>
          </form>

          <div className="card table-wrapper fade-up">
            <h3>Gestion de roles y cuentas</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol actual</th>
                  <th>Nuevo rol</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((currentUser) => {
                  const isCurrentAdmin = currentUser.email === user?.email;
                  const isDeleting = deletingUserId === currentUser._id;
                  return (
                    <tr key={currentUser._id}>
                      <td>{currentUser.nombre}</td>
                      <td>{currentUser.email}</td>
                      <td>{currentUser.role}</td>
                      <td>
                        <select
                          value={roleDraftByUser[currentUser._id] || currentUser.role}
                          onChange={(event) => handleRoleDraftChange(currentUser._id, event.target.value)}
                          disabled={isCurrentAdmin}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="table-actions">
                        <button
                          type="button"
                          className="btn btn-small"
                          onClick={() => handleSaveUserRole(currentUser)}
                          disabled={isCurrentAdmin || savingRoleUserId === currentUser._id}
                        >
                          Guardar rol
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-small"
                          onClick={() => handleDeleteUser(currentUser)}
                          disabled={isCurrentAdmin || isDeleting}
                        >
                          {isDeleting ? 'Eliminando...' : 'Eliminar cuenta'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="muted">No puedes editar ni eliminar tu propia cuenta desde esta pantalla.</p>
          </div>
        </div>
      )}

      {activeTab === 'sesiones' && (
        <div className="card table-wrapper fade-up">
          <h3>Inicios de sesion (hora e IP)</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>IP</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session._id}>
                  <td>{session.user?.nombre || 'N/A'}</td>
                  <td>{session.email}</td>
                  <td>{session.user?.role || 'N/A'}</td>
                  <td>
                    <span className={`badge ${session.isActive ? 'badge-active' : 'badge-off'}`}>
                      {session.isActive ? 'Activa' : 'Expirada'}
                    </span>
                  </td>
                  <td>{session.ip}</td>
                  <td>{formatDate(session.loggedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'auditoria' && (
        <div className="card table-wrapper fade-up">
          <h3>Actividad registrada</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Accion</th>
                <th>Email</th>
                <th>IP</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log._id}>
                  <td>{formatDate(log.createdAt)}</td>
                  <td>{log.user?.nombre || 'Sistema'}</td>
                  <td>{getActionLabel(log.action)}</td>
                  <td>{log.user?.email || log.userEmail || 'N/A'}</td>
                  <td>{log.ip}</td>
                  <td>{formatAuditDetail(log)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AdminDashboard;
