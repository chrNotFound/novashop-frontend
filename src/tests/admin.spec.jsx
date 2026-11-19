import { fireEvent, screen } from '@testing-library/react'
import {
  ADMIN,
  CATEGORIAS,
  CLIENTE,
  esperarQue,
  iniciarSesionComo,
  mostrarApp,
  ok,
  ORDEN,
  PRODUCTOS,
  simularApi,
} from './ayudantes.jsx'

function escribir(etiqueta, valor) {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
}

const ORDENES = [
  { ...ORDEN, id: 1003, estado: 'enviada', usuarioId: 1 },
  { ...ORDEN, id: 1002, estado: 'rechazada', total: 30000 },
  { ...ORDEN, id: 1001, estado: 'pagada', items: [...ORDEN.items, { id: 99, nombre: 'Producto eliminado', precio: 1000, cantidad: 1 }] },
]
const USUARIOS = [ADMIN, CLIENTE]

function comoAdmin(rutas = {}) {
  iniciarSesionComo(ADMIN)
  return simularApi({ 'GET /auth/me': ok(ADMIN), ...rutas })
}

describe('panel de administración', () => {
  beforeEach(() => localStorage.clear())

  describe('acceso', () => {
    it('AD-01 sin sesión redirige al login', async () => {
      simularApi()
      mostrarApp('/admin')

      expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeTruthy()
    })

    it('AD-02 un cliente ve el mensaje de falta de permiso', async () => {
      iniciarSesionComo(CLIENTE)
      simularApi({ 'GET /auth/me': ok(CLIENTE) })
      mostrarApp('/admin')

      expect(await screen.findByText('No tienes permiso para ver esta página')).toBeTruthy()
    })

    it('AD-03 muestra "Cargando sesión..." mientras valida el token', () => {
      iniciarSesionComo(ADMIN)
      simularApi({ 'GET /auth/me': () => new Promise(() => {}) })
      mostrarApp('/admin')

      expect(screen.getByText('Cargando sesión...')).toBeTruthy()
    })

    it('AD-04 el administrador ve el menú y puede cerrar sesión', async () => {
      comoAdmin({ 'GET /productos': ok(PRODUCTOS) })
      mostrarApp('/admin')

      expect(await screen.findByText('NovaShop Admin')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

      await esperarQue(() => localStorage.getItem('sesionNovaShop') === null)
      await esperarQue(() => screen.queryByText('NovaShop Admin') === null)
    })
  })

  describe('dashboard, órdenes y reportes', () => {
    it('AD-05 el dashboard resume ventas, productos, usuarios y stock crítico desde la API', async () => {
      comoAdmin({ 'GET /ordenes': ok(ORDENES), 'GET /productos': ok(PRODUCTOS), 'GET /usuarios': ok(USUARIOS) })
      mostrarApp('/admin')

      expect(await screen.findByText('Productos con stock crítico')).toBeTruthy()
      expect(screen.getByText('Reloj Xiaomi')).toBeTruthy()
      expect(screen.queryByText('Mouse Logitech')).toBeNull()
      expect(screen.getByText('$120.000')).toBeTruthy()
    })

    it('AD-06 el dashboard avisa si no hay productos críticos', async () => {
      comoAdmin({ 'GET /ordenes': ok([]), 'GET /productos': ok([PRODUCTOS[1]]), 'GET /usuarios': ok(USUARIOS) })
      mostrarApp('/admin')
      expect(await screen.findByText('No hay productos con stock crítico.')).toBeTruthy()
    })

    it('AD-07 el dashboard muestra el error del servidor', async () => {
      comoAdmin({ 'GET /ordenes': { status: 500, body: { mensaje: 'Error interno' } }, 'GET /productos': ok([]), 'GET /usuarios': ok([]) })
      mostrarApp('/admin')
      expect((await screen.findByRole('alert')).textContent).toContain('Error interno')
    })

    it('AD-08 lista y filtra las órdenes del backend por estado', async () => {
      comoAdmin({ 'GET /ordenes': ok(ORDENES) })
      mostrarApp('/admin/ordenes')

      expect(await screen.findByText('#1003')).toBeTruthy()
      expect(screen.getAllByRole('link', { name: 'Ver boleta' }).length).toBe(3)

      fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'rechazada' } })
      expect(screen.getAllByRole('link', { name: 'Ver boleta' }).length).toBe(1)

      fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'cancelada' } })
      expect(screen.getByText('No hay órdenes para mostrar.')).toBeTruthy()
    })

    it('AD-09 la lista de órdenes muestra el error del servidor', async () => {
      comoAdmin({ 'GET /ordenes': { status: 403, body: { mensaje: 'No tienes permiso para realizar esta acción.' } } })
      mostrarApp('/admin/ordenes')
      expect((await screen.findByRole('alert')).textContent).toContain('No tienes permiso')
    })

    it('AD-10 la boleta cambia el estado con PATCH en la API', async () => {
      let enviado = null
      comoAdmin({
        'GET /ordenes/1001': ok(ORDEN),
        'PATCH /ordenes/1001/estado': (cuerpo) => {
          enviado = cuerpo
          return ok({ ...ORDEN, estado: cuerpo.estado })
        },
      })
      mostrarApp('/admin/ordenes/1001')

      expect(await screen.findByText('Boleta #1001')).toBeTruthy()
      expect(screen.getByText('Portón negro')).toBeTruthy()
      fireEvent.change(screen.getByLabelText('Estado de la orden'), { target: { value: 'cancelada' } })
      fireEvent.click(screen.getByRole('button', { name: 'Guardar estado' }))

      expect((await screen.findByRole('alert')).textContent).toContain('Estado actualizado.')
      expect(enviado).toEqual({ estado: 'cancelada' })
    })

    it('AD-11 la boleta muestra el error al cambiar el estado', async () => {
      const sinDetalle = { ...ORDEN, estado: 'cancelada', direccion: { ...ORDEN.direccion, departamento: '', indicaciones: '' } }
      comoAdmin({
        'GET /ordenes/1001': ok(sinDetalle),
        'PATCH /ordenes/1001/estado': { status: 409, body: { mensaje: 'Stock insuficiente para "Audifonos HyperX".' } },
      })
      mostrarApp('/admin/ordenes/1001')

      await screen.findByText('Boleta #1001')
      fireEvent.change(screen.getByLabelText('Estado de la orden'), { target: { value: 'pagada' } })
      fireEvent.click(screen.getByRole('button', { name: 'Guardar estado' }))

      expect((await screen.findByRole('alert')).textContent).toContain('Stock insuficiente')
    })

    it('AD-12 la boleta informa una orden inexistente', async () => {
      comoAdmin({ 'GET /ordenes/5': { status: 404, body: { mensaje: 'Orden no encontrada: 5' } } })
      mostrarApp('/admin/ordenes/5')
      expect(await screen.findByText('Orden no encontrada')).toBeTruthy()
    })

    it('AD-13 los reportes calculan ingresos, estados, más vendidos y categorías', async () => {
      comoAdmin({ 'GET /ordenes': ok(ORDENES), 'GET /productos': ok(PRODUCTOS) })
      mostrarApp('/admin/reportes')

      expect(await screen.findByText('Órdenes por estado')).toBeTruthy()
      expect(screen.getByText('Productos más vendidos')).toBeTruthy()
      expect(screen.getByText('Sin categoría')).toBeTruthy()
      expect(screen.getByText('Producto eliminado')).toBeTruthy()
    })

    it('AD-14 los reportes indican cuando no hay ventas', async () => {
      comoAdmin({ 'GET /ordenes': ok([]), 'GET /productos': ok(PRODUCTOS) })
      mostrarApp('/admin/reportes')
      expect((await screen.findAllByText('Todavía no hay ventas registradas.')).length).toBeGreaterThan(0)
    })

    it('AD-15 los reportes muestran el error del servidor', async () => {
      comoAdmin({ 'GET /ordenes': ok([]), 'GET /productos': 'sin-red' })
      mostrarApp('/admin/reportes')
      expect((await screen.findByRole('alert')).textContent).toContain('No se pudo conectar')
    })
  })

  describe('productos', () => {
    it('AD-16 lista productos, filtra críticos y elimina con confirmación', async () => {
      let eliminado = null
      comoAdmin({
        'GET /productos': ok(PRODUCTOS),
        'DELETE /productos/2': () => {
          eliminado = 2
          return { status: 204 }
        },
      })
      spyOn(window, 'confirm').and.returnValues(false, true)
      mostrarApp('/admin/productos')

      expect(await screen.findByText('Mouse Logitech')).toBeTruthy()
      fireEvent.click(screen.getByLabelText('Mostrar solo productos con stock crítico'))
      expect(screen.queryByText('Mouse Logitech')).toBeNull()
      fireEvent.click(screen.getByLabelText('Mostrar solo productos con stock crítico'))

      const botonMouse = () => screen.getAllByRole('button', { name: 'Eliminar' })[1]
      fireEvent.click(botonMouse())
      expect(eliminado).toBeNull()
      fireEvent.click(botonMouse())
      await esperarQue(() => eliminado === 2)
    })

    it('AD-17 muestra el error al eliminar un producto', async () => {
      comoAdmin({
        'GET /productos': ok(PRODUCTOS),
        'DELETE /productos/1': { status: 403, body: { mensaje: 'No tienes permiso para realizar esta acción.' } },
      })
      spyOn(window, 'confirm').and.returnValue(true)
      mostrarApp('/admin/productos')

      await screen.findByText('Audifonos HyperX')
      fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0])

      expect((await screen.findByRole('alert')).textContent).toContain('No tienes permiso')
    })

    it('AD-18 crea un producto validando el formulario', async () => {
      let creado = null
      comoAdmin({
        'GET /categorias': ok(CATEGORIAS),
        'POST /productos': (cuerpo) => {
          creado = cuerpo
          return { status: 201, body: { id: 9, ...cuerpo } }
        },
        'GET /productos': ok(PRODUCTOS),
      })
      mostrarApp('/admin/productos/nuevo')

      expect(await screen.findByRole('heading', { name: 'Nuevo producto' })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Crear producto' }))
      expect(screen.getByText('Ingresa el nombre del producto.')).toBeTruthy()

      escribir('Nombre', 'Teclado Redragon')
      escribir('Precio (CLP)', '34990')
      escribir('Stock', '12')
      escribir('Descuento (%)', '5')
      escribir('Atributo (opcional)', 'Switch Red')
      escribir('Ruta de la imagen', '/Imagen/teclado.jpg')
      escribir('Categoría', 'Perifericos')
      escribir('Descripción', 'Teclado mecánico TKL.')
      expect(screen.getByAltText('Vista previa del producto')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Crear producto' }))

      await esperarQue(() => creado !== null)
      expect(creado.precio).toBe(34990)
      expect(await screen.findByRole('heading', { name: 'Productos' })).toBeTruthy()
    })

    it('AD-19 edita un producto y muestra errores de la API', async () => {
      comoAdmin({
        'GET /productos/1': ok(PRODUCTOS[0]),
        'GET /categorias': ok(CATEGORIAS),
        'PUT /productos/1': { status: 400, body: { mensaje: 'Hay datos que no cumplen las validaciones.', campos: { nombre: 'Nombre demasiado largo.' } } },
      })
      mostrarApp('/admin/productos/1/editar')

      expect(await screen.findByRole('heading', { name: 'Editar producto' })).toBeTruthy()
      expect(screen.getByLabelText('Nombre').value).toBe('Audifonos HyperX')
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      expect(await screen.findByText('Nombre demasiado largo.')).toBeTruthy()
      expect(screen.getByText('Hay datos que no cumplen las validaciones.')).toBeTruthy()
    })

    it('AD-20 informa cuando el producto a editar no existe', async () => {
      comoAdmin({ 'GET /categorias': ok(CATEGORIAS) })
      mostrarApp('/admin/productos/99/editar')

      expect(await screen.findByText('Producto no encontrado')).toBeTruthy()
    })
  })

  describe('categorías', () => {
    it('AD-21 crea, renombra y elimina categorías', async () => {
      const llamadas = []
      const registrar = (nombre) => (cuerpo) => {
        llamadas.push([nombre, cuerpo])
        return { status: nombre === 'DELETE' ? 204 : 200, body: { id: 3, nombre: 'x', productos: 0 } }
      }
      comoAdmin({
        'GET /categorias': ok(CATEGORIAS),
        'POST /categorias': registrar('POST'),
        'PUT /categorias/1': registrar('PUT'),
        'DELETE /categorias/3': registrar('DELETE'),
      })
      spyOn(window, 'confirm').and.returnValue(true)
      mostrarApp('/admin/categorias')
      await screen.findByText('Accesorios')

      fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
      expect(screen.getByText('Ingresa el nombre de la categoría.')).toBeTruthy()
      escribir('Nombre de la nueva categoría', 'Gamer')
      fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
      await esperarQue(() => llamadas.length === 1)

      fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0])
      escribir('Nuevo nombre de la categoría', 'Pe')
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
      expect(screen.getByText('El nombre debe tener al menos 3 caracteres.')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0])
      escribir('Nuevo nombre de la categoría', 'Sonido')
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
      await esperarQue(() => llamadas.length === 2)
      await esperarQue(() => screen.queryAllByRole('button', { name: 'Eliminar' }).length === 3)

      fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[2])
      await esperarQue(() => llamadas.length === 3)
      expect(llamadas.map((l) => l[0])).toEqual(['POST', 'PUT', 'DELETE'])
      expect(llamadas[1][1]).toEqual({ nombre: 'Sonido' })
    })

    it('AD-22 muestra los errores de la API en categorías', async () => {
      const conflicto = { status: 409, body: { mensaje: 'Conflicto con la categoría.' } }
      comoAdmin({
        'GET /categorias': ok(CATEGORIAS),
        'POST /categorias': conflicto,
        'PUT /categorias/1': conflicto,
        'DELETE /categorias/3': conflicto,
      })
      spyOn(window, 'confirm').and.returnValue(true)
      mostrarApp('/admin/categorias')
      await screen.findByText('Accesorios')

      escribir('Nombre de la nueva categoría', 'Gamer')
      fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
      expect(await screen.findByText('Conflicto con la categoría.')).toBeTruthy()

      fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0])
      escribir('Nuevo nombre de la categoría', 'Sonido')
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
      await esperarQue(() => screen.getAllByText('Conflicto con la categoría.').length === 2)

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      await esperarQue(() => screen.queryAllByRole('button', { name: 'Eliminar' }).length === 3)
      fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[2])
      expect((await screen.findByRole('alert')).textContent).toContain('Conflicto')
    })
  })

  describe('usuarios y perfil', () => {

    it('AD-23 lista usuarios y elimina con confirmación', async () => {
      let eliminado = false
      comoAdmin({
        'GET /usuarios': ok(USUARIOS),
        'DELETE /usuarios/2': () => {
          eliminado = true
          return { status: 204 }
        },
      })
      spyOn(window, 'confirm').and.returnValue(true)
      mostrarApp('/admin/usuarios')

      expect(await screen.findByText('cliente@novashop.cl')).toBeTruthy()
      const botones = screen.getAllByRole('button', { name: 'Eliminar' })
      expect(botones[0].disabled).toBeTrue()
      fireEvent.click(botones[1])

      await esperarQue(() => eliminado)
    })

    it('AD-24 muestra el error al eliminar un usuario con compras', async () => {
      comoAdmin({
        'GET /usuarios': ok(USUARIOS),
        'DELETE /usuarios/2': { status: 409, body: { mensaje: 'No se puede eliminar un usuario que tiene compras registradas.' } },
      })
      spyOn(window, 'confirm').and.returnValue(true)
      mostrarApp('/admin/usuarios')

      await screen.findByText('cliente@novashop.cl')
      fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[1])

      expect((await screen.findByRole('alert')).textContent).toContain('tiene compras')
    })

    it('AD-25 crea un usuario nuevo', async () => {
      let creado = null
      comoAdmin({
        'POST /usuarios': (cuerpo) => {
          creado = cuerpo
          return { status: 201, body: { id: 3, ...cuerpo } }
        },
        'GET /usuarios': ok(USUARIOS),
      })
      mostrarApp('/admin/usuarios/nuevo')

      expect(await screen.findByRole('heading', { name: 'Nuevo usuario' })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
      expect(screen.getByText('Ingresa el nombre.')).toBeTruthy()

      escribir('Nombre', 'Ana')
      escribir('Apellidos', 'Pérez')
      escribir('Correo', 'ana@correo.cl')
      escribir('Contraseña', 'Clave123')
      escribir('Rol', 'admin')
      fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))

      await esperarQue(() => creado !== null)
      expect(creado.rol).toBe('admin')
    })

    it('AD-26 al editar muestra el error de correo repetido', async () => {
      comoAdmin({
        'GET /usuarios/2': ok(CLIENTE),
        'PUT /usuarios/2': { status: 409, body: { mensaje: 'El correo ya está registrado.' } },
      })
      mostrarApp('/admin/usuarios/2/editar')

      expect(await screen.findByRole('heading', { name: 'Editar usuario' })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

      expect(await screen.findByText('El correo ya está registrado.')).toBeTruthy()
    })

    it('AD-27 al editar muestra errores por campo y genéricos', async () => {
      let intento = 0
      comoAdmin({
        'GET /usuarios/2': ok(CLIENTE),
        'PUT /usuarios/2': () => {
          intento += 1
          return intento === 1
            ? { status: 400, body: { mensaje: 'Datos inválidos', campos: { apellidos: 'Apellidos muy largos.' } } }
            : { status: 500, body: { mensaje: 'Error interno' } }
        },
      })
      mostrarApp('/admin/usuarios/2/editar')

      await screen.findByRole('heading', { name: 'Editar usuario' })
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
      expect(await screen.findByText('Apellidos muy largos.')).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
      expect(await screen.findByText('Error interno')).toBeTruthy()
    })

    it('AD-28 informa cuando el usuario a editar no existe', async () => {
      comoAdmin()
      mostrarApp('/admin/usuarios/99/editar')

      expect(await screen.findByText('Usuario no encontrado')).toBeTruthy()
    })

    it('AD-29 muestra el historial de compras de un usuario desde la API', async () => {
      comoAdmin({ 'GET /usuarios/2': ok(CLIENTE), 'GET /ordenes?usuarioId=2': ok(ORDENES.slice(1)) })
      mostrarApp('/admin/usuarios/2/historial')

      expect(await screen.findByText('Historial de compras')).toBeTruthy()
      expect(screen.getAllByRole('link', { name: 'Ver boleta' }).length).toBe(2)
      expect(screen.getByText('Total en compras pagadas: $120.000')).toBeTruthy()
    })

    it('AD-30 el historial informa un usuario inexistente', async () => {
      comoAdmin({ 'GET /ordenes?usuarioId=99': ok([]) })
      mostrarApp('/admin/usuarios/99/historial')
      expect(await screen.findByText('Usuario no encontrado')).toBeTruthy()
    })

    it('AD-31 el historial indica cuando el usuario no tiene compras', async () => {
      comoAdmin({ 'GET /usuarios/2': ok(CLIENTE), 'GET /ordenes?usuarioId=2': ok([]) })
      mostrarApp('/admin/usuarios/2/historial')
      expect(await screen.findByText('Este usuario todavía no tiene compras.')).toBeTruthy()
    })

    it('AD-32 el historial muestra el error del servidor', async () => {
      comoAdmin({ 'GET /usuarios/2': ok(CLIENTE), 'GET /ordenes?usuarioId=2': { status: 500, body: { mensaje: 'Error interno' } } })
      mostrarApp('/admin/usuarios/2/historial')
      expect((await screen.findByRole('alert')).textContent).toContain('Error interno')
    })

    it('AD-33 el perfil valida y guarda los cambios', async () => {
      let enviado = null
      comoAdmin({
        'PUT /perfil': (cuerpo) => {
          enviado = cuerpo
          return ok({ ...ADMIN, ...cuerpo })
        },
      })
      mostrarApp('/admin/perfil')

      expect(await screen.findByRole('heading', { name: 'Perfil' })).toBeTruthy()
      escribir('Nueva contraseña (opcional)', 'Nueva123')
      escribir('Repetir nueva contraseña', 'Otra123')
      fireEvent.click(screen.getByRole('button', { name: /Guardar/ }))
      expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy()

      escribir('Nombre', 'Administradora')
      escribir('Repetir nueva contraseña', 'Nueva123')
      fireEvent.click(screen.getByRole('button', { name: /Guardar/ }))

      expect((await screen.findByRole('alert')).textContent).toContain('actualizado')
      await esperarQue(() => enviado !== null)
      expect(enviado).toEqual({ nombre: 'Administradora', apellidos: 'NovaShop', clave: 'Nueva123' })
    })

    it('AD-34 el perfil muestra los errores que devuelve la API', async () => {
      comoAdmin({
        'PUT /perfil': { status: 400, body: { mensaje: 'Hay datos que no cumplen las validaciones.', campos: { nombre: 'Nombre demasiado largo.' } } },
      })
      mostrarApp('/admin/perfil')

      await screen.findByRole('heading', { name: 'Perfil' })
      fireEvent.click(screen.getByRole('button', { name: /Guardar/ }))

      expect(await screen.findByText('Nombre demasiado largo.')).toBeTruthy()
      expect(screen.getByRole('alert').textContent).toContain('Hay datos que no cumplen')
    })
  })
})
