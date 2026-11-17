import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function RutaPrivada({ children }) {
  const { estaAutenticado, cargando } = useAuth()

  if (cargando) {
    return <p className="container py-5 text-center text-muted">Cargando sesión...</p>
  }

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default RutaPrivada