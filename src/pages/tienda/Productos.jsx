import { useState } from 'react'
import ProductCard from '../../components/ProductCard.jsx'
import EstadoCarga from '../../components/EstadoCarga.jsx'
import { useApi } from '../../hooks/useApi.js'
import { useCarrito } from '../../context/CarritoContext.jsx'

function Productos() {
  const { datos, cargando, error } = useApi('/productos')
  const [busqueda, setBusqueda] = useState('')
  const { agregar } = useCarrito()

  const productos = datos || []
  const productosFiltrados = productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <section className="container py-4">
      <h1 className="h3 mb-3">Productos</h1>

      <input
        type="search"
        className="form-control mb-4"
        placeholder="Buscar producto por nombre"
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
      />

      <EstadoCarga cargando={cargando} error={error} />

      {!cargando && !error && productosFiltrados.length === 0 ? (
        <p className="text-muted">No se encontraron productos.</p>
      ) : (
        <div className="row g-4">
          {productosFiltrados.map((producto) => (
            <div key={producto.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
              <ProductCard producto={producto} onAgregar={(item) => agregar(item, 1)} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default Productos