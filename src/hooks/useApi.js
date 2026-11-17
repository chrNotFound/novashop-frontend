import { useEffect, useState } from 'react'
import { api } from '../api/cliente.js'


export function useApi(ruta) {
  const [version, setVersion] = useState(0)
  const [resultado, setResultado] = useState({ ruta: null, version: 0, datos: null, error: '', estado: 0 })

  useEffect(() => {
    if (!ruta) {
      return undefined
    }
    let activo = true
    api(ruta)
      .then((datos) => {
        if (activo) {
          setResultado({ ruta, version, datos, error: '', estado: 200 })
        }
      })
      .catch((error) => {
        if (activo) {
          setResultado({ ruta, version, datos: null, error: error.message, estado: error.estado || 0 })
        }
      })
    return () => {
      activo = false
    }
  }, [ruta, version])

  const cargando = ruta ? resultado.ruta !== ruta || resultado.version !== version : false

  return {
    datos: cargando || !ruta ? null : resultado.datos,
    error: cargando || !ruta ? '' : resultado.error,
    estado: cargando || !ruta ? 0 : resultado.estado,
    cargando,
    recargar: () => setVersion((actual) => actual + 1),
  }
}