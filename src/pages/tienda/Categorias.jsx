import { useState } from 'react'
import ProductCard from '../../components/ProductCard.jsx'
import EstadoCarga from '../../components/EstadoCarga.jsx'
import { useApi } from '../../hooks/useApi.js'
import { useCarrito } from '../../context/CarritoContext.jsx'

function Categorias() {
  const { datos, cargando, error } = useApi('/productos')
  const [seleccionada, setSeleccionada] = useState('Todas')
  const { agregar } = useCarrito()

  const productos = datos || []
  const categorias = ['Todas', ...new Set(productos.map((producto) => producto.categoria))]

  const visibles =
    seleccionada === 'Todas'
      ? productos
      : productos.filter((producto) => producto.categoria === seleccionada)

  return (
    <section className="container py-4">
      <h1 className="h3 mb-3">Categorías</h1>

      <EstadoCarga cargando={cargando} error={error} />

      <div className="d-flex flex-wrap gap-2 mb-4">
        {categorias.map((categoria) => (
          <button
            key={categoria}
            type="button"
            className={
              'btn btn-sm ' + (categoria === seleccionada ? 'btn-primary' : 'btn-outline-primary')
            }
            onClick={() => setSeleccionada(categoria)}
          >
            {categoria}
          </button>
        ))}
      </div>

      <h2 className="h5 mb-3">{seleccionada}</h2>

      <div className="row g-4">
        {visibles.map((producto) => (
          <div key={producto.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
            <ProductCard producto={producto} onAgregar={(item) => agregar(item, 1)} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default Categorias