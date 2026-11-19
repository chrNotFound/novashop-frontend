import { claseEstado, ESTADOS } from '../utils/estados.js'
import { esCritico, UMBRAL_STOCK_CRITICO } from '../utils/stock.js'
import {
  validarCategoria,
  validarDatosEnvio,
  validarPerfil,
  validarProducto,
  validarUsuario,
} from '../utils/validaciones.js'

const ENVIO_VALIDO = {
  nombre: 'Ana',
  apellidos: 'Pérez',
  correo: 'ana@correo.cl',
  calle: 'Av. Siempre Viva 123',
  region: 'Región de Valparaíso',
  comuna: 'Viña del Mar',
}

const PRODUCTO_VALIDO = {
  nombre: 'Mouse',
  categoria: 'Perifericos',
  precio: '29990',
  stock: '10',
  descuento: '0',
  imagen: '/Imagen/mouse.jpg',
  descripcion: 'Mouse gamer',
}

const USUARIO_VALIDO = { nombre: 'Ana', apellidos: 'Pérez', correo: 'ana@correo.cl', clave: 'Clave123', rol: 'cliente' }

describe('utilidades de stock y estados', () => {
  it('UT-01 marca como crítico un stock de 15 o menos', () => {
    expect(UMBRAL_STOCK_CRITICO).toBe(15)
    expect(esCritico({ stock: 15 })).toBeTrue()
    expect(esCritico({ stock: 16 })).toBeFalse()
  })

  it('UT-02 asigna una clase de color a cada estado de orden', () => {
    expect(ESTADOS).toEqual(['pagada', 'enviada', 'rechazada', 'cancelada'])
    expect(claseEstado('pagada')).toBe('text-bg-success')
    expect(claseEstado('enviada')).toBe('text-bg-info')
    expect(claseEstado('rechazada')).toBe('text-bg-danger')
    expect(claseEstado('cancelada')).toBe('text-bg-secondary')
    expect(claseEstado('otro')).toBe('text-bg-light')
  })
})

describe('validación de datos de envío', () => {
  it('VE-01 acepta datos completos', () => {
    expect(validarDatosEnvio(ENVIO_VALIDO)).toEqual({})
  })

  it('VE-02 exige todos los campos obligatorios', () => {
    const errores = validarDatosEnvio({ nombre: ' ', apellidos: '', correo: '', calle: '', region: '', comuna: '' })
    expect(Object.keys(errores)).toEqual(['nombre', 'apellidos', 'correo', 'calle', 'region', 'comuna'])
  })

  it('VE-03 rechaza un correo con formato inválido', () => {
    expect(validarDatosEnvio({ ...ENVIO_VALIDO, correo: 'ana@' }).correo).toContain('correo válido')
  })
})

describe('validación de productos', () => {
  it('VP-01 acepta un producto válido', () => {
    expect(validarProducto(PRODUCTO_VALIDO)).toEqual({})
  })

  it('VP-02 exige nombre, categoría, imagen y descripción', () => {
    const errores = validarProducto({ ...PRODUCTO_VALIDO, nombre: '', categoria: '', imagen: '', descripcion: '' })
    expect(errores.nombre).toBeDefined()
    expect(errores.categoria).toBeDefined()
    expect(errores.imagen).toContain('Ingresa la ruta')
    expect(errores.descripcion).toBeDefined()
  })

  it('VP-03 valida precio mayor a 0 y entero', () => {
    expect(validarProducto({ ...PRODUCTO_VALIDO, precio: '' }).precio).toBe('Ingresa un precio mayor a 0.')
    expect(validarProducto({ ...PRODUCTO_VALIDO, precio: '0' }).precio).toBe('Ingresa un precio mayor a 0.')
    expect(validarProducto({ ...PRODUCTO_VALIDO, precio: '10.5' }).precio).toBe('El precio debe ser un número entero.')
  })

  it('VP-04 valida stock y descuento', () => {
    expect(validarProducto({ ...PRODUCTO_VALIDO, stock: '-1' }).stock).toBeDefined()
    expect(validarProducto({ ...PRODUCTO_VALIDO, descuento: '101' }).descuento).toBeDefined()
    expect(validarProducto({ ...PRODUCTO_VALIDO, descuento: '' }).descuento).toBeDefined()
  })

  it('VP-05 exige que la imagen empiece con / o https://', () => {
    expect(validarProducto({ ...PRODUCTO_VALIDO, imagen: 'imagen.jpg' }).imagen).toContain('debe empezar')
    expect(validarProducto({ ...PRODUCTO_VALIDO, imagen: 'https://sitio.cl/a.jpg' })).toEqual({})
  })
})

describe('validación de usuarios', () => {
  it('VU-01 acepta un usuario válido', () => {
    expect(validarUsuario(USUARIO_VALIDO, false)).toEqual({})
  })

  it('VU-02 exige nombre, apellidos, correo y rol', () => {
    const errores = validarUsuario({ nombre: '', apellidos: '', correo: '', clave: 'Clave123', rol: 'otro' }, false)
    expect(Object.keys(errores)).toEqual(['nombre', 'apellidos', 'correo', 'rol'])
    expect(validarUsuario({ ...USUARIO_VALIDO, correo: 'x' }, false).correo).toContain('correo válido')
  })

  it('VU-03 valida la contraseña al crear', () => {
    expect(validarUsuario({ ...USUARIO_VALIDO, clave: '' }, false).clave).toBe('Ingresa una contraseña.')
    expect(validarUsuario({ ...USUARIO_VALIDO, clave: 'a1' }, false).clave).toContain('6 caracteres')
    expect(validarUsuario({ ...USUARIO_VALIDO, clave: 'solotexto' }, false).clave).toContain('letras y números')
  })

  it('VU-04 la contraseña es opcional al editar', () => {
    expect(validarUsuario({ ...USUARIO_VALIDO, clave: '' }, true)).toEqual({})
    expect(validarUsuario({ ...USUARIO_VALIDO, clave: 'abc' }, true).clave).toBeDefined()
  })
})

describe('validación de categorías y perfil', () => {
  const categorias = [{ id: 1, nombre: 'Audio' }]

  it('VC-01 valida nombre vacío, corto y repetido', () => {
    expect(validarCategoria('  ', categorias, null).nombre).toContain('Ingresa')
    expect(validarCategoria('Ab', categorias, null).nombre).toContain('3 caracteres')
    expect(validarCategoria('audio', categorias, null).nombre).toContain('Ya existe')
    expect(validarCategoria('Audio', categorias, 1)).toEqual({})
    expect(validarCategoria('Gamer', categorias, null)).toEqual({})
  })

  it('VC-02 valida el perfil y la confirmación de contraseña', () => {
    const base = { nombre: 'Ana', apellidos: 'Pérez', clave: '', confirmarClave: '' }
    expect(validarPerfil(base)).toEqual({})
    expect(Object.keys(validarPerfil({ ...base, nombre: '', apellidos: '' }))).toEqual(['nombre', 'apellidos'])
    expect(validarPerfil({ ...base, clave: 'a1', confirmarClave: 'a1' }).clave).toContain('6 caracteres')
    expect(validarPerfil({ ...base, clave: 'solotexto', confirmarClave: 'solotexto' }).clave).toContain('letras')
    expect(validarPerfil({ ...base, clave: 'Clave123', confirmarClave: 'Otra123' }).confirmarClave).toBeDefined()
  })
})
