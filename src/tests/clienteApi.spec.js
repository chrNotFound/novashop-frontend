import { api, borrarSesion, guardarSesion, guardarUsuario, leerSesion } from '../api/cliente.js'
import { CLIENTE, ok, simularApi } from './ayudantes.jsx'

describe('cliente de la API (casos adicionales)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('AP-01 guarda, lee y borra la sesión', () => {
    expect(leerSesion()).toBeNull()

    guardarSesion({ accessToken: 'a', usuario: CLIENTE })
    expect(leerSesion().accessToken).toBe('a')

    borrarSesion()
    expect(leerSesion()).toBeNull()
  })

  it('AP-02 devuelve null si la sesión guardada está dañada', () => {
    localStorage.setItem('sesionNovaShop', '{dañado')
    expect(leerSesion()).toBeNull()
  })

  it('AP-03 guardarUsuario actualiza el usuario solo si hay sesión', () => {
    guardarUsuario({ nombre: 'Nadie' })
    expect(leerSesion()).toBeNull()

    guardarSesion({ accessToken: 'a', usuario: CLIENTE })
    guardarUsuario({ ...CLIENTE, nombre: 'Ana' })
    expect(leerSesion().usuario.nombre).toBe('Ana')
    expect(leerSesion().accessToken).toBe('a')
  })

  it('AP-04 hace un GET sin token cuando no hay sesión', async () => {
    const fetch = simularApi({ 'GET /productos': ok([{ id: 1 }]) })

    const datos = await api('/productos')

    expect(datos).toEqual([{ id: 1 }])
    expect(fetch.calls.mostRecent().args[1].headers.Authorization).toBeUndefined()
  })

  it('AP-05 envía el token y el cuerpo en JSON', async () => {
    guardarSesion({ accessToken: 'abc', refreshToken: 'r', usuario: CLIENTE })
    const fetch = simularApi({ 'POST /categorias': (cuerpo) => ({ status: 201, body: { id: 9, ...cuerpo } }) })

    const datos = await api('/categorias', { metodo: 'POST', cuerpo: { nombre: 'Gamer' } })

    expect(datos).toEqual({ id: 9, nombre: 'Gamer' })
    const opciones = fetch.calls.mostRecent().args[1]
    expect(opciones.method).toBe('POST')
    expect(opciones.headers.Authorization).toBe('Bearer abc')
  })

  it('AP-06 devuelve null en una respuesta 204', async () => {
    simularApi({ 'DELETE /productos/1': { status: 204 } })
    expect(await api('/productos/1', { metodo: 'DELETE' })).toBeNull()
  })

  it('AP-07 lanza el mensaje, el estado y los campos de un error', async () => {
    simularApi({
      'POST /productos': { status: 400, body: { mensaje: 'Datos inválidos', campos: { precio: 'Mayor a 0' } } },
    })

    try {
      await api('/productos', { metodo: 'POST', cuerpo: {} })
      fail('debió lanzar un error')
    } catch (error) {
      expect(error.message).toBe('Datos inválidos')
      expect(error.estado).toBe(400)
      expect(error.campos).toEqual({ precio: 'Mayor a 0' })
    }
  })

  it('AP-08 usa un mensaje genérico si el error no trae cuerpo', async () => {
    simularApi({ 'GET /productos': { status: 500, body: null } })

    await expectAsync(api('/productos')).toBeRejectedWithError('Error al comunicarse con el servidor.')
  })

  it('AP-09 avisa cuando no hay conexión con el servidor', async () => {
    simularApi({ 'GET /productos': 'sin-red' })

    await expectAsync(api('/productos')).toBeRejectedWithError(/No se pudo conectar con el servidor/)
  })

  it('AP-10 renueva el token vencido y repite la petición', async () => {
    guardarSesion({ accessToken: 'viejo', refreshToken: 'r1', usuario: CLIENTE })
    simularApi({
      'GET /ordenes/mias': (cuerpo, opciones) =>
        opciones.headers.Authorization === 'Bearer nuevo' ? ok([{ id: 1001 }]) : { status: 401, body: {} },
      'POST /auth/refresh': ok({ accessToken: 'nuevo', refreshToken: 'r2', usuario: CLIENTE }),
    })

    const datos = await api('/ordenes/mias')

    expect(datos).toEqual([{ id: 1001 }])
    expect(leerSesion().accessToken).toBe('nuevo')
  })

  it('AP-11 borra la sesión si el refresh token ya no sirve', async () => {
    guardarSesion({ accessToken: 'viejo', refreshToken: 'r1', usuario: CLIENTE })
    simularApi({
      'GET /ordenes/mias': { status: 401, body: { mensaje: 'Token vencido' } },
      'POST /auth/refresh': { status: 401, body: {} },
    })

    await expectAsync(api('/ordenes/mias')).toBeRejectedWithError('Token vencido')
    expect(leerSesion()).toBeNull()
  })

  it('AP-12 no intenta renovar si la sesión no tiene refresh token', async () => {
    guardarSesion({ accessToken: 'viejo', usuario: CLIENTE })
    const fetch = simularApi({ 'GET /auth/me': { status: 401, body: { mensaje: 'No autorizado' } } })

    await expectAsync(api('/auth/me')).toBeRejectedWithError('No autorizado')
    expect(fetch.calls.count()).toBe(1)
  })

  it('AP-13 no falla si el servidor de renovación no responde', async () => {
    guardarSesion({ accessToken: 'viejo', refreshToken: 'r1', usuario: CLIENTE })
    simularApi({ 'GET /auth/me': { status: 401, body: { mensaje: 'No autorizado' } }, 'POST /auth/refresh': 'sin-red' })

    await expectAsync(api('/auth/me')).toBeRejectedWithError('No autorizado')
  })
})
