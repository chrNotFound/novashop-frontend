import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App.jsx'
import { AuthProvider } from '../context/AuthContext.jsx'
import { CarritoProvider } from '../context/CarritoContext.jsx'

// Datos de ejemplo con la misma forma que devuelve la API del backend
export const PRODUCTOS = [
  {
    id: 1,
    nombre: 'Audifonos HyperX',
    precio: 100000,
    stock: 10,
    atributo: 'USB-C',
    categoria: 'Audio',
    descuento: 10,
    imagen: '/Imagen/audifonos.jpg',
    descripcion: 'Audifonos gamer inalambricos.',
  },
  {
    id: 2,
    nombre: 'Mouse Logitech',
    precio: 30000,
    stock: 25,
    atributo: 'Inalambrico',
    categoria: 'Perifericos',
    descuento: 0,
    imagen: '/Imagen/mouse.jpg',
    descripcion: 'Mouse gamer liviano.',
  },
  {
    id: 3,
    nombre: 'Reloj Xiaomi',
    precio: 35000,
    stock: 0,
    atributo: '5 ATM',
    categoria: 'Wearables',
    descuento: 0,
    imagen: '/Imagen/reloj.jpg',
    descripcion: 'Smartwatch deportivo.',
  },
]

export const CATEGORIAS = [
  { id: 1, nombre: 'Audio', productos: 1 },
  { id: 2, nombre: 'Perifericos', productos: 1 },
  { id: 3, nombre: 'Accesorios', productos: 0 },
]

export const ADMIN = { id: 1, nombre: 'Admin', apellidos: 'NovaShop', correo: 'admin@novashop.cl', rol: 'admin' }
export const CLIENTE = { id: 2, nombre: 'Cliente', apellidos: 'Demo', correo: 'cliente@novashop.cl', rol: 'cliente' }

export const ORDEN = {
  id: 1001,
  fecha: '2026-11-19T12:00:00',
  estado: 'pagada',
  total: 120000,
  usuarioId: 2,
  cliente: { nombre: 'Cliente', apellidos: 'Demo', correo: 'cliente@novashop.cl' },
  direccion: { calle: 'Av. Siempre Viva 123', departamento: '603', region: 'Región de Valparaíso', comuna: 'Viña del Mar', indicaciones: 'Portón negro' },
  items: [
    { id: 1, nombre: 'Audifonos HyperX', precio: 90000, cantidad: 1 },
    { id: 2, nombre: 'Mouse Logitech', precio: 30000, cantidad: 1 },
  ],
}

export const ok = (body) => ({ status: 200, body })

// Reemplaza window.fetch por un servidor falso.
// rutas: { 'GET /productos': ok([...]), 'POST /ordenes': (cuerpo) => ok({...}) }
export function simularApi(rutas = {}) {
  return spyOn(window, 'fetch').and.callFake(async (url, opciones = {}) => {
    const metodo = opciones.method || 'GET'
    const ruta = String(url).replace(/^.*\/api/, '')
    const cuerpo = opciones.body ? JSON.parse(opciones.body) : undefined
    let respuesta = rutas[`${metodo} ${ruta}`]
    if (typeof respuesta === 'function') {
      respuesta = await respuesta(cuerpo, opciones)
    }
    if (respuesta === 'sin-red') {
      throw new TypeError('Failed to fetch')
    }
    if (!respuesta) {
      respuesta = { status: 404, body: { mensaje: 'No encontrado' } }
    }
    const estado = respuesta.status ?? 200
    return new Response(estado === 204 ? null : JSON.stringify(respuesta.body ?? null), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}

export function iniciarSesionComo(usuario) {
  localStorage.setItem(
    'sesionNovaShop',
    JSON.stringify({ accessToken: 'token-acceso', refreshToken: 'token-renovacion', usuario })
  )
}

export function guardarCarrito(items) {
  localStorage.setItem('carritoNovaShop', JSON.stringify(items))
}

export function mostrarApp(ruta) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthProvider>
        <CarritoProvider>
          <App />
        </CarritoProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

// En Jasmine un expect fallido no lanza excepción, así que waitFor necesita una condición que sí lance
export function esperarQue(condicion) {
  return waitFor(() => {
    if (!condicion()) {
      throw new Error('La condición todavía no se cumple')
    }
  })
}
