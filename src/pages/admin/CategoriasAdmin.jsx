import { useState } from 'react'
import { api } from '../../api/cliente.js'
import EstadoCarga from '../../components/EstadoCarga.jsx'
import { useApi } from '../../hooks/useApi.js'
import { validarCategoria } from '../../utils/validaciones.js'

function CategoriasAdmin() {
  const { datos, cargando, error, recargar } = useApi('/categorias')
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [errorNuevo, setErrorNuevo] = useState('')
  const [idEdicion, setIdEdicion] = useState(null)
  const [nombreEdicion, setNombreEdicion] = useState('')
  const [errorEdicion, setErrorEdicion] = useState('')
  const [errorAccion, setErrorAccion] = useState('')

  const categorias = datos || []

  const manejarCrear = async (evento) => {
    evento.preventDefault()
    const errores = validarCategoria(nombreNuevo, categorias, null)
    setErrorNuevo(errores.nombre || '')
    if (errores.nombre) {
      return
    }
    try {
      await api('/categorias', { metodo: 'POST', cuerpo: { nombre: nombreNuevo.trim() } })
      setNombreNuevo('')
      recargar()
    } catch (err) {
      setErrorNuevo(err.message)
    }
  }

  const iniciarEdicion = (categoria) => {
    setIdEdicion(categoria.id)
    setNombreEdicion(categoria.nombre)
    setErrorEdicion('')
  }

  const cancelarEdicion = () => {
    setIdEdicion(null)
    setErrorEdicion('')
  }

  const guardarEdicion = async () => {
    const errores = validarCategoria(nombreEdicion, categorias, idEdicion)
    setErrorEdicion(errores.nombre || '')
    if (errores.nombre) {
      return
    }
    try {
      await api(`/categorias/${idEdicion}`, { metodo: 'PUT', cuerpo: { nombre: nombreEdicion.trim() } })
      setIdEdicion(null)
      recargar()
    } catch (err) {
      setErrorEdicion(err.message)
    }
  }

  const manejarEliminar = async (categoria) => {
    if (window.confirm(`¿Eliminar la categoría "${categoria.nombre}"?`)) {
      setErrorAccion('')
      try {
        await api(`/categorias/${categoria.id}`, { metodo: 'DELETE' })
        recargar()
      } catch (err) {
        setErrorAccion(err.message)
      }
    }
  }

  return (
    <>
      <h1 className="h3 mb-4">Categorías</h1>

      <form onSubmit={manejarCrear} noValidate className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h6">Nueva categoría</h2>
          <div className="d-flex flex-wrap gap-2">
            <div className="flex-grow-1">
              <input
                type="text"
                aria-label="Nombre de la nueva categoría"
                className={'form-control' + (errorNuevo ? ' is-invalid' : '')}
                placeholder="Ej: Gaming"
                value={nombreNuevo}
                onChange={(evento) => setNombreNuevo(evento.target.value)}
              />
              <div className="invalid-feedback">{errorNuevo}</div>
            </div>
            <button type="submit" className="btn btn-primary align-self-start">
              Agregar
            </button>
          </div>
        </div>
      </form>

      <EstadoCarga cargando={cargando} error={error} />
      {errorAccion && (
        <div className="alert alert-danger py-2" role="alert">
          {errorAccion}
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-hover align-middle bg-white">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Productos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((categoria) => {
              const cantidad = categoria.productos
              const editando = idEdicion === categoria.id

              return (
                <tr key={categoria.id}>
                  <td>
                    {editando ? (
                      <>
                        <input
                          type="text"
                          aria-label="Nuevo nombre de la categoría"
                          className={'form-control' + (errorEdicion ? ' is-invalid' : '')}
                          value={nombreEdicion}
                          onChange={(evento) => setNombreEdicion(evento.target.value)}
                        />
                        <div className="invalid-feedback">{errorEdicion}</div>
                      </>
                    ) : (
                      categoria.nombre
                    )}
                  </td>
                  <td>{cantidad}</td>
                  <td>
                    <div className="d-flex flex-wrap gap-2">
                      {editando ? (
                        <>
                          <button type="button" className="btn btn-primary btn-sm" onClick={guardarEdicion}>
                            Guardar
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={cancelarEdicion}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => iniciarEdicion(categoria)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={cantidad > 0}
                            title={cantidad > 0 ? 'No se puede eliminar una categoría con productos' : ''}
                            onClick={() => manejarEliminar(categoria)}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default CategoriasAdmin