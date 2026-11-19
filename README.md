# NovaShop

Tienda online de tecnología hecha con **React 19, Vite, React Router y Bootstrap 5**.
Proyecto de la Evaluación Parcial 2 de DSY1104 Desarrollo Fullstack II.

Es una aplicación solo frontend: los datos viven en archivos JavaScript (`src/data`) y en
`localStorage` del navegador. El pago es una simulación y no procesa dinero real.

## Qué incluye

**Tienda (pública):** inicio, catálogo, detalle de producto, categorías, ofertas, carrito,
checkout con región y comuna, compra exitosa o rechazada, registro, inicio de sesión,
contacto, blog y nosotros.

**Panel de administración (`/admin`, solo rol admin):** dashboard con stock crítico, CRUD de
productos, categorías y usuarios, órdenes con boleta, historial de compras por usuario,
reportes y perfil.

## Requisitos

- Node.js 20 o superior y npm
- Chrome, Edge o Brave (para las pruebas)

## Instalación y uso

```bash
npm install
npm run dev 
```

## Usuarios de demostración

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | admin@novashop.cl | Admin123 |
| Cliente | cliente@novashop.cl | Cliente123 |

Son datos de prueba. No uses claves reales: se guardan en el navegador.

## Pruebas unitarias

Las pruebas usan **Jasmine** y **Karma** .

```bash
npm test
```

Ejecuta 134 pruebas sobre toda la aplicación. Las llamadas al backend se simulan con un
`fetch` falso (`src/tests/ayudantes.jsx`), así que no hace falta tener la API encendida.

| Archivo | Qué prueba |
| --- | --- |
| `ProductCard.spec.jsx` | Tarjeta de producto, descuento y sin stock |
| `CarritoContext.spec.jsx`, `contextos.spec.jsx` | Carrito, sesión (`AuthContext`) y hook `useApi` |
| `Login.spec.jsx` | Formulario de login contra la API |
| `cliente.spec.js`, `clienteApi.spec.js` | Cliente de la API: token, errores, renovación del token |
| `precios.spec.js`, `validaciones.spec.js`, `utilidades.spec.js` | Precios, validaciones, stock y estados |
| `tienda.spec.jsx` | Páginas de la tienda: catálogo, carrito, checkout, registro, contacto, blog |
| `admin.spec.jsx` | Panel de administración: acceso por rol, productos, categorías, usuarios, órdenes, reportes, perfil |

Última ejecución: 134 de 134 aprobadas. Cobertura global: 99,27 % de instrucciones,
95,62 % de ramas, 99,05 % de funciones y 99,36 % de líneas.

El informe detallado queda en `coverage/html/index.html`.

## Estructura

```
src/
  components/   ProductCard, Header, Footer, RutaAdmin, ...
  context/      AuthContext, CarritoContext
  data/         productos, usuarios, categorias, ordenes, blogs
  pages/        tienda/ y admin/
  utils/        precios, validaciones, stock, estados
  tests/        pruebas Jasmine (*.spec.js y *.spec.jsx)
```
