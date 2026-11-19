import { fireEvent, screen } from '@testing-library/react'
import {
  ADMIN,
  CLIENTE,
  esperarQue,
  guardarCarrito,
  iniciarSesionComo,
  mostrarApp,
  ok,
  ORDEN,
  PRODUCTOS,
  simularApi,
} from './ayudantes.jsx'

const ITEM_CARRITO = { id: 1, nombre: 'Audifonos HyperX', precio: 90000, imagen: '/Imagen/a.jpg', stock: 10, cantidad: 2 }

function escribir(etiqueta, valor) {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
}

function carritoGuardado() {
  return JSON.parse(localStorage.getItem('carritoNovaShop'))
}

describe('páginas de la tienda', () => {
  beforeEach(() => localStorage.clear())

  describe('catálogo', () => {
    beforeEach(() => simularApi({ 'GET /productos': ok(PRODUCTOS), 'GET /productos/1': ok(PRODUCTOS[0]) }))

    it('TI-01 Home muestra productos destacados y permite agregarlos', async () => {
      mostrarApp('/')

      expect(await screen.findByText('Productos destacados')).toBeTruthy()
      const botones = await screen.findAllByRole('button', { name: 'Agregar al carrito' })
      fireEvent.click(botones[0])

      expect(carritoGuardado().length).toBe(1)
    })

    it('TI-02 Productos filtra por texto de búsqueda', async () => {
      mostrarApp('/productos')
      await screen.findByText('Mouse Logitech')

      fireEvent.change(screen.getByPlaceholderText('Buscar producto por nombre'), { target: { value: 'mouse' } })

      expect(screen.getByText('Mouse Logitech')).toBeTruthy()
      expect(screen.queryByText('Audifonos HyperX')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Agregar al carrito' }))
      expect(carritoGuardado()[0].id).toBe(2)
    })

    it('TI-03 Ofertas muestra solo productos con descuento', async () => {
      mostrarApp('/ofertas')

      expect(await screen.findByText('Audifonos HyperX')).toBeTruthy()
      expect(screen.queryByText('Mouse Logitech')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Agregar al carrito' }))
      expect(carritoGuardado().length).toBe(1)
    })

    it('TI-04 Categorías filtra los productos por categoría', async () => {
      mostrarApp('/categorias')
      await screen.findByText('Audifonos HyperX')

      fireEvent.click(screen.getByRole('button', { name: 'Perifericos' }))

      expect(screen.getByText('Mouse Logitech')).toBeTruthy()
      expect(screen.queryByText('Audifonos HyperX')).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Agregar al carrito' }))
      expect(carritoGuardado()[0].id).toBe(2)
    })

    it('TI-05 el detalle permite elegir cantidad y agregar al carrito', async () => {
      mostrarApp('/productos/1')
      expect(await screen.findByRole('heading', { name: 'Audifonos HyperX' })).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: '+' }))
      fireEvent.click(screen.getByRole('button', { name: '+' }))
      fireEvent.click(screen.getByRole('button', { name: '-' }))
      fireEvent.click(screen.getByRole('button', { name: 'Agregar al carrito' }))

      expect(screen.getByRole('alert').textContent).toContain('Producto agregado al carrito.')
      expect(carritoGuardado()[0].cantidad).toBe(2)
    })
  })

  it('TI-06 el detalle informa cuando el producto no existe', async () => {
    simularApi({ 'GET /productos/99': { status: 404, body: { mensaje: 'Producto no encontrado: 99' } } })
    mostrarApp('/productos/99')

    expect(await screen.findByText('Producto no encontrado')).toBeTruthy()
  })

  it('TI-07 el detalle muestra un producto sin stock', async () => {
    simularApi({ 'GET /productos/3': ok(PRODUCTOS[2]) })
    mostrarApp('/productos/3')

    expect(await screen.findByRole('heading', { name: 'Reloj Xiaomi' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Agregar al carrito' })).toBeNull()
  })

  it('TI-08 muestra un aviso si el backend no responde', async () => {
    simularApi({ 'GET /productos': 'sin-red' })
    mostrarApp('/productos')

    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo conectar con el servidor')
  })

  describe('carrito', () => {
    it('TI-09 muestra el mensaje de carrito vacío', () => {
      simularApi()
      mostrarApp('/carrito')

      expect(screen.getByText('Tu carrito está vacío')).toBeTruthy()
    })

    it('TI-10 cambia cantidades, elimina y limpia el carrito', () => {
      simularApi()
      guardarCarrito([ITEM_CARRITO, { ...ITEM_CARRITO, id: 2, nombre: 'Mouse Logitech', precio: 30000, cantidad: 1 }])
      mostrarApp('/carrito')

      expect(screen.getByText('Carrito de compras')).toBeTruthy()
      fireEvent.click(screen.getAllByRole('button', { name: '+' })[0])
      expect(carritoGuardado()[0].cantidad).toBe(3)
      fireEvent.click(screen.getAllByRole('button', { name: '-' })[0])
      expect(carritoGuardado()[0].cantidad).toBe(2)

      fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[1])
      expect(carritoGuardado().length).toBe(1)

      fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
      expect(screen.getByText('Tu carrito está vacío')).toBeTruthy()
    })
  })

  describe('checkout y resultado de la compra', () => {
    it('TI-11 pide iniciar sesión antes de pagar', async () => {
      simularApi()
      guardarCarrito([ITEM_CARRITO])
      mostrarApp('/checkout')

      expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy()
    })

    it('TI-12 avisa cuando no hay productos para comprar', async () => {
      iniciarSesionComo(CLIENTE)
      simularApi({ 'GET /auth/me': ok(CLIENTE) })
      mostrarApp('/checkout')

      expect(await screen.findByText('No hay productos para comprar')).toBeTruthy()
    })

    it('TI-13 valida los campos y carga comunas según la región', async () => {
      iniciarSesionComo(CLIENTE)
      simularApi({ 'GET /auth/me': ok(CLIENTE) })
      guardarCarrito([ITEM_CARRITO])
      mostrarApp('/checkout')
      await screen.findByRole('heading', { name: 'Checkout' })

      escribir('Nombre *', '')
      fireEvent.click(screen.getByRole('button', { name: /Pagar ahora/ }))
      expect(screen.getByText('Ingresa tu nombre.')).toBeTruthy()
      expect(screen.getByText('Selecciona una región.')).toBeTruthy()

      expect(screen.getByLabelText('Comuna *').disabled).toBeTrue()
      escribir('Región *', 'Región de Valparaíso')
      expect(screen.getByLabelText('Comuna *').disabled).toBeFalse()
      expect(screen.getByRole('option', { name: 'Viña del Mar' })).toBeTruthy()
    })

    async function completarCheckout(resultadoPago) {
      await screen.findByRole('heading', { name: 'Checkout' })
      escribir('Calle *', 'Av. Siempre Viva 123')
      escribir('Departamento (opcional)', '603')
      escribir('Región *', 'Región de Valparaíso')
      escribir('Comuna *', 'Viña del Mar')
      escribir('Indicaciones para la entrega (opcional)', 'Portón negro')
      escribir('Resultado del pago (simulación)', resultadoPago)
      fireEvent.click(screen.getByRole('button', { name: /Pagar ahora/ }))
    }

    it('TI-14 una compra aprobada vacía el carrito y muestra la boleta', async () => {
      iniciarSesionComo(CLIENTE)
      let enviado = null
      simularApi({
        'GET /auth/me': ok(CLIENTE),
        'POST /ordenes': (cuerpo) => {
          enviado = cuerpo
          return { status: 201, body: ORDEN }
        },
        'GET /ordenes/1001': ok(ORDEN),
      })
      guardarCarrito([ITEM_CARRITO])
      mostrarApp('/checkout')

      await completarCheckout('aprobado')

      expect(await screen.findByText('Se ha realizado la compra. Nro #1001')).toBeTruthy()
      expect(enviado.items).toEqual([{ id: 1, cantidad: 2 }])
      expect(enviado.direccion.comuna).toBe('Viña del Mar')
      expect(carritoGuardado()).toEqual([])
      expect(screen.getByText('Portón negro')).toBeTruthy()
    })

    it('TI-15 un pago rechazado conserva el carrito y muestra el error', async () => {
      iniciarSesionComo(CLIENTE)
      const rechazada = { ...ORDEN, id: 1002, estado: 'rechazada', direccion: { ...ORDEN.direccion, departamento: '', indicaciones: '' } }
      simularApi({
        'GET /auth/me': ok(CLIENTE),
        'POST /ordenes': { status: 201, body: rechazada },
        'GET /ordenes/1002': ok(rechazada),
      })
      guardarCarrito([ITEM_CARRITO])
      mostrarApp('/checkout')

      await completarCheckout('rechazado')

      expect(await screen.findByText('No se pudo realizar el pago. Nro #1002')).toBeTruthy()
      expect(screen.getByText('Volver a realizar el pago')).toBeTruthy()
      expect(carritoGuardado().length).toBe(1)
    })

    it('TI-16 muestra el error del servidor al pagar', async () => {
      iniciarSesionComo(CLIENTE)
      simularApi({
        'GET /auth/me': ok(CLIENTE),
        'POST /ordenes': { status: 409, body: { mensaje: 'Stock insuficiente para "Audifonos HyperX".' } },
      })
      guardarCarrito([ITEM_CARRITO])
      mostrarApp('/checkout')

      await completarCheckout('aprobado')

      expect((await screen.findByRole('alert')).textContent).toContain('Stock insuficiente')
    })

    it('TI-17 informa cuando la orden no existe', async () => {
      simularApi({ 'GET /ordenes/5': { status: 404, body: { mensaje: 'Orden no encontrada: 5' } } })
      mostrarApp('/compra-exitosa/5')

      expect(await screen.findByText('Orden no encontrada')).toBeTruthy()
    })

    it('TI-18 muestra el error si no se puede cargar la orden', async () => {
      simularApi({ 'GET /ordenes/5': { status: 403, body: { mensaje: 'No tienes permiso para ver esta orden.' } } })
      mostrarApp('/compra-exitosa/5')

      expect((await screen.findByRole('alert')).textContent).toContain('No tienes permiso')
    })
  })

  describe('registro', () => {
    it('TI-19 valida el formulario antes de enviarlo', () => {
      const fetch = simularApi()
      mostrarApp('/registro')

      fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

      expect(screen.getByText('Ingresa tu nombre.')).toBeTruthy()
      expect(screen.getByText('Repite la contraseña.')).toBeTruthy()
      expect(fetch).not.toHaveBeenCalled()
    })

    function completarRegistro() {
      escribir('Nombre', 'Ana')
      escribir('Apellidos', 'Pérez')
      escribir('Correo', 'ana@correo.cl')
      escribir('Contraseña', 'Clave123')
      escribir('Repetir contraseña', 'Clave123')
      fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    }

    it('TI-20 crea la cuenta e inicia sesión', async () => {
      simularApi({
        'POST /auth/register': (cuerpo) => ({
          status: 201,
          body: { accessToken: 'a', refreshToken: 'r', usuario: { id: 7, ...cuerpo, rol: 'cliente' } },
        }),
        'GET /productos': ok(PRODUCTOS),
      })
      mostrarApp('/registro')

      completarRegistro()

      expect(await screen.findByText('Hola, Ana')).toBeTruthy()
    })

    it('TI-21 muestra el error de correo repetido', async () => {
      simularApi({ 'POST /auth/register': { status: 409, body: { mensaje: 'El correo ya está registrado.' } } })
      mostrarApp('/registro')

      completarRegistro()

      expect(await screen.findByText('El correo ya está registrado.')).toBeTruthy()
    })

    it('TI-22 muestra los errores por campo que devuelve la API', async () => {
      simularApi({
        'POST /auth/register': { status: 400, body: { mensaje: 'Datos inválidos', campos: { nombre: 'Nombre muy largo.' } } },
      })
      mostrarApp('/registro')

      completarRegistro()

      expect(await screen.findByText('Nombre muy largo.')).toBeTruthy()
    })
  })

  describe('páginas informativas', () => {
    beforeEach(() => simularApi())

    it('TI-23 Contacto valida y confirma el envío', () => {
      mostrarApp('/contacto')

      fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }))
      expect(screen.getByText('Ingresa tu nombre completo.')).toBeTruthy()

      escribir('Nombre completo', 'Ana Pérez')
      escribir('Correo (opcional)', 'ana@correo.cl')
      escribir('Comentario', 'Quiero saber si tienen despacho a regiones.')
      fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }))

      expect(screen.getByRole('alert').textContent).toContain('Mensaje enviado')
      expect(screen.getByLabelText('Nombre completo').value).toBe('')
    })

    it('TI-24 Blog lista artículos y abre el detalle', () => {
      mostrarApp('/blog')

      expect(screen.getByText('Noticias importantes')).toBeTruthy()
      fireEvent.click(screen.getAllByText('Leer más')[0])

      expect(screen.getByRole('heading', { name: /Caso curioso #1/ })).toBeTruthy()
    })

    it('TI-25 el detalle de blog informa un artículo inexistente', () => {
      mostrarApp('/blog/999')
      expect(screen.getByText('Artículo no encontrado')).toBeTruthy()
    })

    it('TI-26 Nosotros muestra la información de la tienda', () => {
      mostrarApp('/nosotros')
      expect(screen.getByText('Quiénes somos')).toBeTruthy()
    })
  })

  describe('encabezado y sesión', () => {
    it('TI-27 un administrador ve el enlace al panel y puede cerrar sesión', async () => {
      iniciarSesionComo(ADMIN)
      simularApi({ 'GET /auth/me': ok(ADMIN), 'GET /productos': ok(PRODUCTOS) })
      mostrarApp('/')

      expect(await screen.findByText('Hola, Admin')).toBeTruthy()
      expect(screen.getByText('Panel admin')).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

      await esperarQue(() => screen.queryByText('Hola, Admin') === null)
      expect(screen.getAllByText('Iniciar sesión').length).toBeGreaterThan(0)
      expect(localStorage.getItem('sesionNovaShop')).toBeNull()
    })

    it('TI-28 muestra "Cargando sesión..." mientras se valida el token', () => {
      iniciarSesionComo(CLIENTE)
      simularApi({ 'GET /auth/me': () => new Promise(() => {}) })
      guardarCarrito([ITEM_CARRITO])
      mostrarApp('/checkout')

      expect(screen.getByText('Cargando sesión...')).toBeTruthy()
    })
  })
})
