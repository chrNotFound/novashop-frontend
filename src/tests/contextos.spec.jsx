import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { AuthProvider, useAuth } from '../context/AuthContext.jsx'
import { CarritoProvider, useCarrito } from '../context/CarritoContext.jsx'
import { useApi } from '../hooks/useApi.js'
import { CLIENTE, esperarQue, iniciarSesionComo, ok, PRODUCTOS, simularApi } from './ayudantes.jsx'

const conAuth = ({ children }) => <AuthProvider>{children}</AuthProvider>
const conCarrito = ({ children }) => <CarritoProvider>{children}</CarritoProvider>

describe('contexto de autenticación', () => {
  beforeEach(() => localStorage.clear())

  it('AC-01 sin sesión no consulta al servidor', () => {
    const fetch = simularApi()
    const { result } = renderHook(() => useAuth(), { wrapper: conAuth })

    expect(result.current.estaAutenticado).toBeFalse()
    expect(result.current.cargando).toBeFalse()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('AC-02 con sesión confirma el usuario con /auth/me', async () => {
    iniciarSesionComo(CLIENTE)
    simularApi({ 'GET /auth/me': ok({ ...CLIENTE, nombre: 'Carla' }) })
    const { result } = renderHook(() => useAuth(), { wrapper: conAuth })

    expect(result.current.cargando).toBeTrue()
    await esperarQue(() => !result.current.cargando)
    expect(result.current.usuario.nombre).toBe('Carla')
    expect(result.current.esAdmin).toBeFalse()
  })

  it('AC-03 cierra la sesión si el token ya no es válido', async () => {
    iniciarSesionComo(CLIENTE)
    simularApi({ 'GET /auth/me': { status: 401, body: {} } })
    const { result } = renderHook(() => useAuth(), { wrapper: conAuth })

    await esperarQue(() => !result.current.cargando)
    expect(result.current.usuario).toBeNull()
    expect(localStorage.getItem('sesionNovaShop')).toBeNull()
  })

  it('AC-04 mantiene la sesión si el servidor falla por otra razón', async () => {
    iniciarSesionComo(CLIENTE)
    simularApi({ 'GET /auth/me': { status: 500, body: {} } })
    const { result } = renderHook(() => useAuth(), { wrapper: conAuth })

    await esperarQue(() => !result.current.cargando)
    expect(result.current.usuario.id).toBe(2)
  })

  it('AC-05 registra, actualiza el perfil y cierra sesión', async () => {
    simularApi({
      'POST /auth/register': (cuerpo) => ({ status: 201, body: { accessToken: 'a', refreshToken: 'r', usuario: { id: 5, ...cuerpo, rol: 'cliente' } } }),
      'PUT /perfil': (cuerpo) => ok({ id: 5, correo: 'ana@correo.cl', rol: 'cliente', ...cuerpo }),
    })
    const { result } = renderHook(() => useAuth(), { wrapper: conAuth })

    await act(() => result.current.registrar({ nombre: ' Ana ', apellidos: ' Pérez ', correo: ' ana@correo.cl ', clave: 'Clave123' }))
    expect(result.current.usuario.nombre).toBe('Ana')

    await act(() => result.current.actualizarPerfil({ nombre: 'Anita', apellidos: 'Pérez' }))
    expect(result.current.usuario.nombre).toBe('Anita')
    expect(JSON.parse(localStorage.getItem('sesionNovaShop')).usuario.nombre).toBe('Anita')

    act(() => result.current.cerrarSesion())
    expect(result.current.estaAutenticado).toBeFalse()
  })

  it('AC-06 propaga errores de login distintos de 401', async () => {
    simularApi({ 'POST /auth/login': { status: 500, body: { mensaje: 'Servidor caído' } } })
    const { result } = renderHook(() => useAuth(), { wrapper: conAuth })

    await expectAsync(result.current.iniciarSesion('a@b.cl', 'x')).toBeRejectedWithError('Servidor caído')
  })

  it('AC-07 useAuth fuera del proveedor lanza un error', () => {
    spyOn(console, 'error')
    expect(() => renderHook(() => useAuth())).toThrowError(/AuthProvider/)
  })
})

describe('contexto del carrito (casos extra)', () => {
  beforeEach(() => localStorage.clear())

  it('CR-06 cambiarCantidad respeta el mínimo 1 y el stock', () => {
    const { result } = renderHook(() => useCarrito(), { wrapper: conCarrito })
    act(() => result.current.agregar(PRODUCTOS[0], 2))

    act(() => result.current.cambiarCantidad(1, 0))
    expect(result.current.items[0].cantidad).toBe(1)

    act(() => result.current.cambiarCantidad(1, 50))
    expect(result.current.items[0].cantidad).toBe(10)
  })

  it('CR-07 inicia vacío si el carrito guardado está dañado', () => {
    spyOn(console, 'error')
    localStorage.setItem('carritoNovaShop', '{dañado')
    const { result } = renderHook(() => useCarrito(), { wrapper: conCarrito })
    expect(result.current.items).toEqual([])
  })

  it('CR-08 useCarrito fuera del proveedor lanza un error', () => {
    spyOn(console, 'error')
    expect(() => renderHook(() => useCarrito())).toThrowError(/CarritoProvider/)
  })
})

function ListaProductos({ ruta }) {
  const { datos, cargando, error, estado, recargar } = useApi(ruta)
  return (
    <div>
      <p>{cargando ? 'cargando' : 'listo'}</p>
      <p>{error || 'sin error'}</p>
      <p>estado {estado}</p>
      <p>{datos ? `${datos.length} productos` : 'sin datos'}</p>
      <button onClick={recargar}>recargar</button>
    </div>
  )
}

describe('hook useApi', () => {
  beforeEach(() => localStorage.clear())

  it('HA-01 carga datos y permite recargar', async () => {
    const fetch = simularApi({ 'GET /productos': ok(PRODUCTOS) })
    render(<ListaProductos ruta="/productos" />)

    expect(screen.getByText('cargando')).toBeTruthy()
    expect(await screen.findByText('3 productos')).toBeTruthy()
    expect(screen.getByText('estado 200')).toBeTruthy()

    fireEvent.click(screen.getByText('recargar'))
    await screen.findByText('listo')
    await esperarQue(() => fetch.calls.count() === 2)
  })

  it('HA-02 entrega el error y el estado HTTP', async () => {
    simularApi({ 'GET /productos/99': { status: 404, body: { mensaje: 'Producto no encontrado' } } })
    render(<ListaProductos ruta="/productos/99" />)

    expect(await screen.findByText('Producto no encontrado')).toBeTruthy()
    expect(screen.getByText('estado 404')).toBeTruthy()
  })

  it('HA-03 sin ruta no hace ninguna petición', () => {
    const fetch = simularApi()
    render(<ListaProductos ruta={null} />)

    expect(screen.getByText('listo')).toBeTruthy()
    expect(screen.getByText('sin datos')).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
  })
})
