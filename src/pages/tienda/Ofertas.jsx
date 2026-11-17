import ProductCard from '../../components/ProductCard.jsx'
import EstadoCarga from '../../components/EstadoCarga.jsx'
import { useApi } from '../../hooks/useApi.js'
import { useCarrito } from '../../context/CarritoContext.jsx'

function Ofertas() {
  const { datos, cargando, error } = useApi('/productos')
  const { agregar } = useCarrito()

  const ofertas = (datos || []).filter((producto) => producto.descuento > 0)

  return (
    <section className="container py-4">
      <h1 className="h3 mb-4">Ofertas</h1>

      <EstadoCarga cargando={cargando} error={error} />

      {!cargando && !error && ofertas.length === 0 ? (
        <p className="text-muted">No hay productos en oferta por ahora.</p>
      ) : (
        <div className="row g-4">
          {ofertas.map((producto) => (
            <div key={producto.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
              <ProductCard producto={producto} onAgregar={(item) => agregar(item, 1)} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default Ofertas