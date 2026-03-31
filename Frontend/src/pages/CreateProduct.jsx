import { useMemo, useState } from 'react';
import { createProduct } from '../services/productsService';

const CreateProduct = () => {
  const categories = useMemo(() => ([
    'playeras',
    'pantalones',
    'calzado',
    'accesorios',
    'servicios',
    'otros'
  ]), []);

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '0',
    tipo: 'producto',
    categoria: 'playeras',
    imagenUrl: ''
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value
    }));
  };

  const resetForm = () => {
    setForm({
      nombre: '',
      descripcion: '',
      precio: '',
      stock: '0',
      tipo: 'producto',
      categoria: 'playeras',
      imagenUrl: ''
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      await createProduct({
        ...form,
        precio: Number(form.precio),
        stock: Number(form.stock)
      });
      setSuccess('Producto/servicio creado correctamente');
      resetForm();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'No se pudo crear el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <h2>Nuevo producto o servicio</h2>
      <p className="muted">Completa la informacion y publica al catalogo.</p>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label htmlFor="nombre">Nombre</label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          value={form.nombre}
          onChange={handleChange}
          minLength={2}
          maxLength={120}
          required
        />

        <label htmlFor="descripcion">Descripcion</label>
        <textarea
          id="descripcion"
          name="descripcion"
          value={form.descripcion}
          onChange={handleChange}
          minLength={10}
          maxLength={500}
          rows={4}
          required
        />

        <label htmlFor="precio">Precio (MXN)</label>
        <input
          id="precio"
          name="precio"
          type="number"
          value={form.precio}
          onChange={handleChange}
          min="0"
          step="0.01"
          required
        />

        <label htmlFor="stock">Stock</label>
        <input
          id="stock"
          name="stock"
          type="number"
          value={form.stock}
          onChange={handleChange}
          min="0"
          step="1"
        />

        <label htmlFor="tipo">Tipo</label>
        <select id="tipo" name="tipo" value={form.tipo} onChange={handleChange}>
          <option value="producto">Producto</option>
          <option value="servicio">Servicio</option>
        </select>

        <label htmlFor="categoria">Categoria</label>
        <select id="categoria" name="categoria" value={form.categoria} onChange={handleChange}>
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <label htmlFor="imagenUrl">URL de imagen (opcional)</label>
        <input
          id="imagenUrl"
          name="imagenUrl"
          type="url"
          value={form.imagenUrl}
          onChange={handleChange}
          placeholder="https://..."
        />

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </form>
    </section>
  );
};

export default CreateProduct;
