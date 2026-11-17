const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
const CLAVE_SESION = 'sesionNovaShop'

export function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION))
  } catch {
    return null
  }
}

export function guardarSesion(sesion) {
  localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
}

export function borrarSesion() {
  localStorage.removeItem(CLAVE_SESION)
}

export function guardarUsuario(usuario) {
  const sesion = leerSesion()
  if (sesion) {
    guardarSesion({ ...sesion, usuario })
  }
}

async function renovarToken() {
  const sesion = leerSesion()
  if (!sesion || !sesion.refreshToken) {
    return false
  }
  try {
    const respuesta = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: sesion.refreshToken }),
    })
    if (!respuesta.ok) {
      borrarSesion()
      return false
    }
    guardarSesion(await respuesta.json())
    return true
  } catch {
    return false
  }
}

export async function api(ruta, { metodo = 'GET', cuerpo } = {}, reintento = true) {
  const sesion = leerSesion()
  let respuesta
  try {
    respuesta = await fetch(`${API}${ruta}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(sesion && sesion.accessToken ? { Authorization: `Bearer ${sesion.accessToken}` } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa que el backend esté encendido.')
  }

  if (respuesta.status === 401 && reintento && sesion && (await renovarToken())) {
    return api(ruta, { metodo, cuerpo }, false)
  }

  if (respuesta.status === 204) {
    return null
  }

  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    const error = new Error((datos && datos.mensaje) || 'Error al comunicarse con el servidor.')
    error.estado = respuesta.status
    error.campos = (datos && datos.campos) || {}
    throw error
  }
  return datos
}