import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/cliente.js'
import EstadoCarga from '../../components/EstadoCarga.jsx'
import { useApi } from '../../hooks/useApi.js'
import { formatearPrecio } from '../../utils/precios.js'
import { ESTADOS, claseEstado } from '../../utils/estados.js'

function Boleta() {
  const { id } = useParams()
  const { datos: orden, cargando, error, estado } = useApi(`/ordenes/${id}`)

  if (cargando || (error && estado !== 404)) {
    return <EstadoCarga cargando={cargando} error={error} />
  }

  if (!orden) {
    return (
      <>
        <h1 className="h3 mb-3">Orden no encontrada</h1>
        <Link className="btn btn-primary" to="/admin/ordenes">
          Volver a órdenes
        </Link>
      </>
    )
  }

  return <DetalleBoleta orden={orden} />
}

function DetalleBoleta({ orden }) {
  const [estado, setEstado] = useState(orden.estado)
  const [actual, setActual] = useState(orden.estado)
  const [guardado, setGuardado] = useState(false)
  const [errorServidor, setErrorServidor] = useState('')
  const [guardando, setGuardando] = useState(false)

  const { cliente, direccion, items, total } = orden

  const manejarGuardar = async () => {
    setErrorServidor('')
    setGuardado(false)
    setGuardando(true)
    try {
      const actualizada = await api(`/ordenes/${orden.id}/estado`, {
        metodo: 'PATCH',
        cuerpo: { estado },
      })
      setActual(actualizada.estado)
      setEstado(actualizada.estado)
      setGuardado(true)
    } catch (err) {
      setErrorServidor(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h3 mb-0">Boleta #{orden.id}</h1>
        <div className="d-flex gap-2 d-print-none">
          <Link className="btn btn-secondary" to="/admin/ordenes">
            Volver
          </Link>
          <button type="button" className="btn btn-danger" onClick={() => window.print()}>
            Imprimir boleta
          </button>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <p className="text-muted">
            {new Date(orden.fecha).toLocaleString('es-CL')} · Estado:{' '}
            <span className={'badge ' + claseEstado(actual)}>{actual}</span>
          </p>

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6">
              <h2 className="h6">Cliente</h2>
              <p className="mb-0">{cliente.nombre} {cliente.apellidos}</p>
              <p className="mb-0">{cliente.correo}</p>
            </div>
            <div className="col-12 col-md-6">
              <h2 className="h6">Dirección de entrega</h2>
              <p className="mb-0">
                {direccion.calle}
                {direccion.departamento && `, Depto ${direccion.departamento}`}
              </p>
              <p className="mb-0">{direccion.comuna}, {direccion.region}</p>
              {direccion.indicaciones && <p className="mb-0">{direccion.indicaciones}</p>}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Cantidad</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>{formatearPrecio(item.precio)}</td>
                    <td>{item.cantidad}</td>
                    <td>{formatearPrecio(item.precio * item.cantidad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="fs-5 fw-bold text-end mb-0">Total: {formatearPrecio(total)}</p>
        </div>
      </div>

      <div className="card shadow-sm d-print-none">
        <div className="card-body">
          <h2 className="h6">Actualizar estado</h2>
          <div className="d-flex flex-wrap gap-2">
            <select
              className="form-select w-auto"
              aria-label="Estado de la orden"
              value={estado}
              onChange={(evento) => {
                setEstado(evento.target.value)
                setGuardado(false)
              }}
            >
              {ESTADOS.map((opcion) => (
                <option key={opcion} value={opcion}>{opcion}</option>
              ))}
            </select>
            <button type="button" className="btn btn-primary" disabled={guardando} onClick={manejarGuardar}>
              Guardar estado
            </button>
          </div>
          {guardado && (
            <div className="alert alert-success mt-3 py-2 mb-0" role="alert">
              Estado actualizado.
            </div>
          )}
          {errorServidor && (
            <div className="alert alert-danger mt-3 py-2 mb-0" role="alert">
              {errorServidor}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Boleta