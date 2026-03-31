# Mini Proyecto E Comer (Node.js + MongoDB + React + Vite)

Proyecto full stack con catalogo publico, carrito para usuarios autenticados y dashboard de administracion con control por roles reales en backend.

## Requisitos

- Node.js 18+
- MongoDB local (o URI remota segura)

## Ejecutar

### 1) Backend

```bash
cd Backend
npm install
npm run dev
```

### 2) Frontend

```bash
cd Frontend
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000/api`

## Pruebas y build

### Backend

```bash
cd Backend
npm test
```

### Frontend

```bash
cd Frontend
npm test
npm run build
```

## Produccion (manual)

### Backend

```bash
cd Backend
npm install --omit=dev
set NODE_ENV=production&& npm start
```

### Frontend (build estatico)

```bash
cd Frontend
npm install
npm run build
npx serve -s dist -l 3000
```

## Flujo funcional implementado

- Registro: todas las cuentas nuevas se crean como `user`.
- Admin: se define directamente en base de datos (no hay auto-asignacion por correo en codigo).
- Catalogo publico: accesible sin iniciar sesion.
- Compra/carrito: se pide inicio de sesion solo al intentar comprar/agregar al carrito.
- Carrito: permite varias compras en una sola operacion simulada.
- Compra por talla exacta: cada producto puede tener inventario por talla y el checkout descuenta la talla seleccionada.
- Sobreventa: checkout con decremento atomico de stock para evitar comprar mas existencias de las disponibles.
- Dashboard admin:
  - CRUD de productos/servicios
  - Segmento por producto (`hombre`, `mujer`, `nino`, `nina`, `bebe`, `unisex`)
  - Gestion de tallas y stock por talla
  - Generacion de productos demo aleatorios por segmentos
  - Asignar rol `admin` o `user` a otros usuarios
  - Eliminar cuentas y su historial principal (sesiones, logs y comentarios)
  - Ver sesiones de login con hora e IP
  - Ver bitacora de acciones (audit logs)

## Seguridad aplicada (OWASP)

- Validacion estricta de entrada con `express-validator`.
- Hash de contrasenas con `bcryptjs`.
- JWT con expiracion y verificacion.
- Autorizacion por roles en backend (no se confia en rol del frontend).
- Endurecimiento HTTP con `helmet`.
- CORS con lista de origenes permitidos.
- Rate limiting global y en auth.
- Payload JSON limitado.
- Manejo centralizado de errores sin exponer internals.
- Trazabilidad de eventos criticos con auditoria y sesiones.
