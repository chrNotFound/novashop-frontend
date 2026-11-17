import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/cliente.js'
import EstadoCarga from '../../components/EstadoCarga.jsx'
import { useApi } from '../../hooks/useApi.js'
import { validarProducto } from '../../utils/validaciones.js'

const DATOS_VACIOS = {
  nombre: '',
  categoria: '',
  precio: '',
  stock: '',
  descuento: '0',
  atributo: '',
  imagen: '',
  descripcion: '',
}

const CAMPOS = [
  { name: 'nombre', label: 'Nombre', type: 'text', columnas: 'col-12' },
  { name: 'precio', label: 'Precio (CLP)', type: 'number', columnas: 'col-12 col-md-4' },
  { name: 'stock', label: 'Stock', type: 'number', columnas: 'col-12 col-md-4' },
  { name: 'descuento', label: 'Descuento (%)', type: 'number', columnas: 'col-12 col-md-4' },
  { name: 'atributo', label: 'Atributo (opcional)', type: 'text', columnas: 'col-12 col-md-6' },
  { name: 'imagen', label: 'Ruta de la imagen', type: 'text', columnas: 'col-12 col-md-6' },
]

function aFormulario(producto) {
  return {
    nombre: producto.nombre,
    categoria: producto.categoria,
    precio: String(producto.precio),
    stock: String(producto.stock),
    descuento: String(producto.descuento || 0),
    atributo: producto.atributo || '',
    imagen: producto.imagen,
    descripcion: producto.descripcion,
  }
}

function FormularioProducto() {
  const { id } = useParams()
  const { datos: existente, cargando, error, estado } = useApi(id ? `/productos/${id}` : null)
  const { datos: listaCategorias } = useApi('/categorias')

  if (cargando || (error && estado !== 404)) {
    return <EstadoCarga cargando={cargando} error={error} />
  }

  if (id && !existente) {
    return (
      <>
        <h1 className="h3 mb-3">Producto no encontrado</h1>
        <Link className="btn btn-primary" to="/admin/productos">
          Volver a productos
        </Link>
      </>
    )
  }

  const categorias = (listaCategorias || []).map((categoria) => categoria.nombre)
  return <Formulario existente={existente} categorias={categorias} />
}

function Formulario({ existente, categorias }) {
  const navigate = useNavigate()
  const [datos, setDatos] = useState(existente ? aFormulario(existente) : DATOS_VACIOS)
  const [errores, setErrores] = useState({})
  const [errorServidor, setErrorServidor] = useState('')
  const [guardando, setGuardando] = useState(false)

  const manejarCambio = (evento) => {
    const { name, value } = evento.target
    setDatos({ ...datos, [name]: value })
  }

  const clase = (campo) => 'form-control' + (errores[campo] ? ' is-invalid' : '')

  const manejarEnvio = async (evento) => {
    evento.preventDefault()
    setErrorServidor('')

    const erroresEncontrados = validarProducto(datos)
    setErrores(erroresEncontrados)
    if (Object.keys(erroresEncontrados).length > 0) {
      return
    }

    const producto = {
      nombre: datos.nombre.trim(),
      categoria: datos.categoria.trim(),
      precio: Number(datos.precio),
      stock: Number(datos.stock),
      descuento: Number(datos.descuento),
      atributo: datos.atributo.trim(),
      imagen: datos.imagen.trim(),
      descripcion: datos.descripcion.trim(),
    }

    setGuardando(true)
    try {
      if (existente) {
        await api(`/productos/${existente.id}`, { metodo: 'PUT', cuerpo: producto })
      } else {
        await api('/productos', { metodo: 'POST', cuerpo: producto })
      }
      navigate('/admin/productos')
    } catch (err) {
      if (err.campos && Object.keys(err.campos).length > 0) {
        setErrores(err.campos)
      }
      setErrorServidor(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <h1 className="h3 mb-4">{existente ? 'Editar producto' : 'Nuevo producto'}</h1>

      <form onSubmit={manejarEnvio} noValidate className="card shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            {CAMPOS.map((campo) => (
              <div key={campo.name} className={campo.columnas}>
                <label htmlFor={campo.name} className="form-label">{campo.label}</label>
                <input
                  id={campo.name}
                  name={campo.name}
                  type={campo.type}
                  className={clase(campo.name)}
                  value={datos[campo.name]}
                  onChange={manejarCambio}
                />
                <div className="invalid-feedback">{errores[campo.name]}</div>
              </div>
            ))}

            <div className="col-12 col-md-6">
              <label htmlFor="categoria" className="form-label">Categoría</label>
              <input
                id="categoria"
                name="categoria"
                list="listaCategorias"
                className={clase('categoria')}
                value={datos.categoria}
                onChange={manejarCambio}
              />
              <datalist id="listaCategorias">
                {categorias.map((categoria) => (
                  <option key={categoria} value={categoria} />
                ))}
              </datalist>
              <div className="invalid-feedback">{errores.categoria}</div>
            </div>

            <div className="col-12">
              <label htmlFor="descripcion" className="form-label">Descripción</label>
              <textarea
                id="descripcion"
                name="descripcion"
                rows="3"
                className={clase('descripcion')}
                value={datos.descripcion}
                onChange={manejarCambio}
              />
              <div className="invalid-feedback">{errores.descripcion}</div>
            </div>

            {datos.imagen.trim() && (
              <div className="col-12">
                <p className="form-label mb-1">Vista previa</p>
                <img
                  src={datos.imagen.trim()}
                  alt="Vista previa del producto"
                  style={{ height: '120px', objectFit: 'contain' }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="card-footer d-flex justify-content-end gap-2">
          {errorServidor && <span className="text-danger align-self-center me-auto">{errorServidor}</span>}
          <Link className="btn btn-secondary" to="/admin/productos">
            Cancelar
          </Link>
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            {existente ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </form>
    </>
  )
}

export default FormularioProducto