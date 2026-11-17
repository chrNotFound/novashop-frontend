import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/cliente.js'
import EstadoCarga from '../../components/EstadoCarga.jsx'
import { useApi } from '../../hooks/useApi.js'
import { formatearPrecio } from '../../utils/precios.js'
import { esCritico } from '../../utils/stock.js'

function Productos() {
  const { datos, cargando, error, recargar } = useApi('/productos')
  const [soloCriticos, setSoloCriticos] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  const productos = datos || []
  const visibles = soloCriticos ? productos.filter(esCritico) : productos

  const manejarEliminar = async (producto) => {
    if (window.confirm(`¿Eliminar "${producto.nombre}"?`)) {
      setErrorAccion('')
      try {
        await api(`/productos/${producto.id}`, { metodo: 'DELETE' })
        recargar()
      } catch (err) {
        setErrorAccion(err.message)
      }
    }
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h3 mb-0">Productos</h1>
        <Link className="btn btn-primary" to="/admin/productos/nuevo">
          Nuevo producto
        </Link>
      </div>

      <div className="form-check mb-3">
        <input
          id="soloCriticos"
          type="checkbox"
          className="form-check-input"
          checked={soloCriticos}
          onChange={(evento) => setSoloCriticos(evento.target.checked)}
        />
        <label htmlFor="soloCriticos" className="form-check-label">
          Mostrar solo productos con stock crítico
        </label>
      </div>

      <EstadoCarga cargando={cargando} error={error} />
      {errorAccion && (
        <div className="alert alert-danger py-2" role="alert">
          {errorAccion}
        </div>
      )}

      {!cargando && !error && visibles.length === 0 ? (
        <p className="text-muted">No hay productos para mostrar.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle bg-white">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Desc.</th>
                <th>Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((producto) => (
                <tr key={producto.id}>
                  <td>
                    <img
                      src={producto.imagen}
                      alt={producto.nombre}
                      style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                    />
                  </td>
                  <td>{producto.nombre}</td>
                  <td>{producto.categoria}</td>
                  <td>{formatearPrecio(producto.precio)}</td>
                  <td>{producto.descuento > 0 ? `${producto.descuento}%` : '-'}</td>
                  <td>
                    <span className={'badge ' + (esCritico(producto) ? 'text-bg-danger' : 'text-bg-success')}>
                      {producto.stock}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <Link className="btn btn-outline-primary btn-sm" to={`/admin/productos/${producto.id}/editar`}>
                        Editar
                      </Link>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => manejarEliminar(producto)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

export default Productos