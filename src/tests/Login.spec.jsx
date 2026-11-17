import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from '../pages/tienda/Login.jsx'
import { AuthProvider } from '../context/AuthContext.jsx'

const USUARIO = { id: 2, nombre: 'Cliente', apellidos: 'Demo', correo: 'cliente@novashop.cl', rol: 'cliente' }

function respuestaJson(estado, cuerpo) {
  return Promise.resolve(
    new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } })
  )
}

function mostrarLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  )
}

function escribir(etiqueta, valor) {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
}

describe('página Login', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('no muestra mensajes de error al abrir el formulario', () => {
    mostrarLogin()

    expect(screen.queryByText('Ingresa tu correo.')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('actualiza el estado del campo cuando el usuario escribe', () => {
    mostrarLogin()

    escribir('Correo', 'ana@correo.cl')

    expect(screen.getByLabelText('Correo').value).toBe('ana@correo.cl')
  })

  it('muestra los errores de validación al enviar el formulario vacío', () => {
    mostrarLogin()

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(screen.getByText('Ingresa tu correo.')).toBeTruthy()
    expect(screen.getByText('Ingresa tu contraseña.')).toBeTruthy()
  })

  it('muestra una alerta cuando el backend responde 401 (credenciales incorrectas)', async () => {
    spyOn(window, 'fetch').and.callFake(() => respuestaJson(401, { estado: 401, mensaje: 'Correo o contraseña incorrectos.' }))
    mostrarLogin()

    escribir('Correo', 'cliente@novashop.cl')
    escribir('Contraseña', 'ClaveEquivocada1')
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toBe('Correo o contraseña incorrectos.')
    expect(localStorage.getItem('sesionNovaShop')).toBeNull()
  })

  it('guarda la sesión con los tokens cuando el backend acepta las credenciales', async () => {
    const fetchFalso = spyOn(window, 'fetch').and.callFake(() =>
      respuestaJson(200, { accessToken: 'token-acceso', refreshToken: 'token-refresco', usuario: USUARIO })
    )
    mostrarLogin()

    escribir('Correo', 'cliente@novashop.cl')
    escribir('Contraseña', 'Cliente123')
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => {
      if (!localStorage.getItem('sesionNovaShop')) {
        throw new Error('La sesión todavía no se guardó.')
      }
    })

    const sesion = JSON.parse(localStorage.getItem('sesionNovaShop'))
    expect(sesion.accessToken).toBe('token-acceso')
    expect(sesion.usuario.correo).toBe('cliente@novashop.cl')
    expect(fetchFalso.calls.mostRecent().args[0]).toContain('/auth/login')
  })
})