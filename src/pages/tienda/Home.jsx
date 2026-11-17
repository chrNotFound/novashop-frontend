import { Link } from 'react-router-dom'
import ProductCard from '../../components/ProductCard.jsx'
import EstadoCarga from '../../components/EstadoCarga.jsx'
import { useApi } from '../../hooks/useApi.js'
import { useCarrito } from '../../context/CarritoContext.jsx'

function Home() {
  const { datos, cargando, error } = useApi('/productos')
  const { agregar } = useCarrito()
  const destacados = datos ? datos.slice(0, 4) : []

  return (
    <>
      <img
        src="/Imagen/Principal.png"
        alt="Tecnología y accesorios gamer en NovaShop"
        className="img-fluid w-100"
      />

      <section className="container py-5">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
          <h1 className="h3 mb-0">Productos destacados</h1>
          <Link className="btn btn-outline-primary" to="/productos">
            Ver todos los productos
          </Link>
        </div>

        <EstadoCarga cargando={cargando} error={error} />

        <div className="row g-4">
          {destacados.map((producto) => (
            <div key={producto.id} className="col-12 col-sm-6 col-lg-3">
              <ProductCard producto={producto} onAgregar={(item) => agregar(item, 1)} />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

export default Home