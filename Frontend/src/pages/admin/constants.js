const initialProductForm = {
  nombre: '',
  descripcion: '',
  precio: '',
  stock: '0',
  tipo: 'producto',
  categoria: 'ropa',
  segmento: 'hombre',
  tallasTexto: 'S:8, M:10, L:7',
  imagenUrl: ''
};

const initialUserForm = {
  nombre: '',
  email: '',
  password: '',
  role: 'user'
};

const segmentLabels = {
  hombre: 'Hombre',
  mujer: 'Mujer',
  nino: 'Niño',
  nina: 'Niña',
  bebe: 'Bebe',
  unisex: 'Unisex'
};

const adminTabs = [
  { id: 'productos', label: 'Productos' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'sesiones', label: 'Sesiones' },
  { id: 'auditoria', label: 'Auditoria' }
];

const categories = [
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

const segments = [
  'hombre',
  'mujer',
  'nino',
  'nina',
  'bebe',
  'unisex'
];

const ACTION_LABELS = Object.freeze({
  'auth.register': 'Registro de cuenta',
  'auth.login': 'Inicio de sesion',
  'auth.login_failed': 'Inicio de sesion fallido',
  'product.created': 'Producto creado',
  'product.updated': 'Producto actualizado',
  'product.deleted': 'Producto eliminado',
  'product.quick_purchase': 'Compra directa',
  'cart.item_added': 'Carrito: producto agregado',
  'cart.item_quantity_updated': 'Carrito: cantidad actualizada',
  'cart.item_removed': 'Carrito: producto eliminado',
  'cart.checkout_completed': 'Compra finalizada',
  'admin.user.created': 'Usuario creado por admin',
  'admin.user.role_updated': 'Rol de usuario actualizado',
  'admin.user.deleted': 'Usuario eliminado por admin',
  'admin.products.seeded': 'Catalogo demo generado'
});

const defaultOverview = {
  totalUsers: 0,
  totalAdmins: 0,
  totalSessions: 0,
  totalLogs: 0,
  totalProducts: 0
};

export {
  initialProductForm,
  initialUserForm,
  segmentLabels,
  adminTabs,
  categories,
  segments,
  ACTION_LABELS,
  defaultOverview
};
