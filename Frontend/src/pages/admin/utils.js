import { ACTION_LABELS } from './constants';

const formatDate = (value) => new Date(value).toLocaleString('es-MX', {
  dateStyle: 'short',
  timeStyle: 'medium'
});

const getActionLabel = (action = '') => ACTION_LABELS[action] || 'Actividad registrada';

const formatAuditDetail = (log) => {
  const details = log?.details && typeof log.details === 'object' ? log.details : {};

  switch (log?.action) {
    case 'auth.register':
      return 'Registro de cuenta correcto';
    case 'auth.login':
      return 'Inicio de sesion correcto';
    case 'auth.login_failed':
      return details.reason === 'user_not_found'
        ? 'Intento fallido: usuario no encontrado'
        : 'Intento fallido: contrasena incorrecta';
    case 'product.created':
      return `Se creo el producto ${details.nombre || ''}`.trim();
    case 'product.updated':
      return `Se actualizo el producto ${details.nombre || ''}`.trim();
    case 'product.deleted':
      return `Se elimino el producto ${details.nombre || ''}`.trim();
    case 'product.quick_purchase':
      return `Compro ${details.quantity || 1} pieza(s) en talla ${details.talla || 'UNITALLA'}`;
    case 'cart.item_added':
      return `Agrego ${details.quantity || 1} pieza(s) al carrito en talla ${details.talla || 'UNITALLA'}`;
    case 'cart.item_quantity_updated':
      return `Actualizo carrito a ${details.quantity || 1} pieza(s) en talla ${details.talla || 'UNITALLA'}`;
    case 'cart.item_removed':
      return 'Elimino un producto del carrito';
    case 'cart.checkout_completed': {
      const itemCount = Array.isArray(details.items) ? details.items.length : 0;
      return `Compra completada con ${itemCount} producto(s)`;
    }
    case 'admin.user.created':
      return `Creo la cuenta ${details.targetEmail || ''} con rol ${details.assignedRole || 'user'}`.trim();
    case 'admin.user.role_updated':
      return `Cambio el rol de ${details.targetEmail || ''} a ${details.assignedRole || ''}`.trim();
    case 'admin.user.deleted':
      return `Elimino la cuenta ${details.email || ''} y su historial`.trim();
    case 'admin.products.seeded':
      return `Genero ${details.inserted || 0} productos demo`;
    default:
      return 'Accion registrada correctamente';
  }
};

const parseSizeStock = (rawText) => {
  const raw = String(rawText || '').trim();
  if (!raw) return [];

  const items = raw.split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return items.map((item) => {
    const [sizeRaw, stockRaw] = item.split(':').map((part) => part?.trim());
    const parsedStock = Number.parseInt(stockRaw, 10);

    if (!sizeRaw || Number.isNaN(parsedStock) || parsedStock < 0) {
      throw new Error('Formato de tallas invalido. Usa: S:10, M:8, L:6');
    }

    return {
      talla: sizeRaw.toUpperCase(),
      stock: parsedStock
    };
  });
};

const sizesToText = (sizes) => {
  if (!Array.isArray(sizes) || sizes.length === 0) {
    return '';
  }

  return sizes.map((size) => `${size.talla}:${size.stock}`).join(', ');
};

export {
  formatDate,
  getActionLabel,
  formatAuditDetail,
  parseSizeStock,
  sizesToText
};
