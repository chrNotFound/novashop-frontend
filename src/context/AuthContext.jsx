import { createContext, useContext, useEffect, useState } from 'react'
import { api, borrarSesion, guardarSesion, guardarUsuario, leerSesion } from '../api/cliente.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const sesion = leerSesion()
    return sesion ? sesion.usuario : null
  })
  const [cargando, setCargando] = useState(() => leerSesion() !== null)

  useEffect(() => {
    if (!leerSesion()) {
      return undefined
    }
    let activo = true
    api('/auth/me')
      .then((actual) => {
        if (activo) {
          guardarUsuario(actual)
          setUsuario(actual)
        }
      })
      .catch((error) => {
        if (activo && error.estado === 401) {
          borrarSesion()
          setUsuario(null)
        }
      })
      .finally(() => {
        if (activo) {
          setCargando(false)
        }
      })
    return () => {
      activo = false
    }
  }, [])

  const iniciarSesion = async (correo, clave) => {
    try {
      const datos = await api('/auth/login', {
        metodo: 'POST',
        cuerpo: { correo: correo.trim(), clave },
      })
      guardarSesion(datos)
      setUsuario(datos.usuario)
      return true
    } catch (error) {
      if (error.estado === 401) {
        return false
      }
      throw error
    }
  }

  const registrar = async (datos) => {
    const respuesta = await api('/auth/register', {
      metodo: 'POST',
      cuerpo: {
        nombre: datos.nombre.trim(),
        apellidos: datos.apellidos.trim(),
        correo: datos.correo.trim(),
        clave: datos.clave,
      },
    })
    guardarSesion(respuesta)
    setUsuario(respuesta.usuario)
    return respuesta.usuario
  }

  const actualizarPerfil = async (cambios) => {
    const actualizado = await api('/perfil', { metodo: 'PUT', cuerpo: cambios })
    guardarUsuario(actualizado)
    setUsuario(actualizado)
    return actualizado
  }

  const cerrarSesion = () => {
    borrarSesion()
    setUsuario(null)
  }

  const valor = {
    usuario,
    cargando,
    estaAutenticado: usuario !== null,
    esAdmin: usuario !== null && usuario.rol === 'admin',
    iniciarSesion,
    registrar,
    actualizarPerfil,
    cerrarSesion,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return contexto
}