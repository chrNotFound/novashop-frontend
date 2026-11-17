import { api, borrarSesion, guardarSesion, leerSesion } from '../api/cliente.js'

function respuestaJson(estado, cuerpo) {
  return Promise.resolve(
    new Response(cuerpo === null ? null : JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

describe('cliente de la API (fetch con JWT)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('guarda, lee y borra la sesión en localStorage', () => {
    guardarSesion({ accessToken: 'a', refreshToken: 'r', usuario: { id: 1 } })
    expect(leerSesion().accessToken).toBe('a')

    borrarSesion()
    expect(leerSesion()).toBeNull()
  })

  it('envía el token Bearer cuando hay sesión', async () => {
    guardarSesion({ accessToken: 'mi-token', refreshToken: 'r', usuario: { id: 1 } })
    const fetchFalso = spyOn(window, 'fetch').and.callFake(() => respuestaJson(200, [{ id: 1 }]))

    const datos = await api('/productos')

    expect(datos).toEqual([{ id: 1 }])
    expect(fetchFalso.calls.mostRecent().args[1].headers.Authorization).toBe('Bearer mi-token')
  })

  it('no envía Authorization cuando no hay sesión', async () => {
    const fetchFalso = spyOn(window, 'fetch').and.callFake(() => respuestaJson(200, []))

    await api('/productos')

    expect(fetchFalso.calls.mostRecent().args[1].headers.Authorization).toBeUndefined()
  })

  it('lanza un error con el estado y los campos cuando el backend responde 400', async () => {
    spyOn(window, 'fetch').and.callFake(() =>
      respuestaJson(400, { estado: 400, mensaje: 'Datos inválidos.', campos: { precio: 'El precio debe ser mayor a 0.' } })
    )

    let error
    try {
      await api('/productos', { metodo: 'POST', cuerpo: { precio: 0 } })
    } catch (err) {
      error = err
    }

    expect(error.estado).toBe(400)
    expect(error.message).toBe('Datos inválidos.')
    expect(error.campos.precio).toBe('El precio debe ser mayor a 0.')
  })

  it('renueva el token con el refresh token cuando recibe 401 y reintenta la petición', async () => {
    guardarSesion({ accessToken: 'vencido', refreshToken: 'refresco', usuario: { id: 1 } })
    const fetchFalso = spyOn(window, 'fetch').and.callFake((url, opciones) => {
      if (url.includes('/auth/refresh')) {
        return respuestaJson(200, { accessToken: 'nuevo', refreshToken: 'refresco2', usuario: { id: 1 } })
      }
      if (opciones.headers.Authorization === 'Bearer vencido') {
        return respuestaJson(401, { estado: 401, mensaje: 'Sesión expirada.' })
      }
      return respuestaJson(200, [{ id: 7 }])
    })

    const datos = await api('/ordenes')

    expect(datos).toEqual([{ id: 7 }])
    expect(fetchFalso.calls.count()).toBe(3)
    expect(leerSesion().accessToken).toBe('nuevo')
  })

  it('muestra un mensaje claro cuando el backend no responde', async () => {
    spyOn(window, 'fetch').and.callFake(() => Promise.reject(new TypeError('Failed to fetch')))

    await expectAsync(api('/productos')).toBeRejectedWithError(/No se pudo conectar con el servidor/)
  })
})