function EstadoCarga({ cargando, error }) {
  if (cargando) {
    return <p className="text-muted">Cargando...</p>
  }
  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    )
  }
  return null
}

export default EstadoCarga