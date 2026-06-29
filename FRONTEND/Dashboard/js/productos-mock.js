const LS_PRODUCTOS = 'eleve_productos_mock'
const LS_VENTAS = 'eleve_ventas_mock'
const LS_CAJA = 'eleve_caja_sesion_mock'

let _cacheProductos = null

export async function obtenerProductosMock() {
  if (_cacheProductos) return [..._cacheProductos]

  const guardado = localStorage.getItem(LS_PRODUCTOS)
  if (guardado) {
    _cacheProductos = JSON.parse(guardado)
    return [..._cacheProductos]
  }

  const res = await fetch('./data/productos.json')
  const seed = await res.json()
  _cacheProductos = seed
  localStorage.setItem(LS_PRODUCTOS, JSON.stringify(seed))
  return [...seed]
}

export function guardarProductosMock(productos) {
  _cacheProductos = [...productos]
  localStorage.setItem(LS_PRODUCTOS, JSON.stringify(productos))
}

export function obtenerCategorias(productos) {
  return [...new Set(productos.map((p) => p.categoria).filter(Boolean))].sort()
}

export function obtenerVentasMock() {
  try {
    return JSON.parse(localStorage.getItem(LS_VENTAS) || '[]')
  } catch {
    return []
  }
}

export function guardarVentaMock(venta) {
  const ventas = obtenerVentasMock()
  ventas.unshift(venta)
  localStorage.setItem(LS_VENTAS, JSON.stringify(ventas.slice(0, 100)))
}

export function obtenerSesionCajaMock() {
  try {
    const raw = localStorage.getItem(LS_CAJA)
    if (raw) return JSON.parse(raw)
  } catch { /* noop */ }

  const sesion = {
    abierta: true,
    abiertaEn: new Date().toISOString(),
    montoApertura: 0,
    totalDia: 0,
    cantidadVentas: 0,
  }
  localStorage.setItem(LS_CAJA, JSON.stringify(sesion))
  return sesion
}

export function guardarSesionCajaMock(sesion) {
  localStorage.setItem(LS_CAJA, JSON.stringify(sesion))
}

export function recalcularTotalesCaja() {
  const hoy = new Date().toISOString().slice(0, 10)
  const ventasHoy = obtenerVentasMock().filter((v) => v.fecha?.startsWith(hoy))
  const sesion = obtenerSesionCajaMock()
  sesion.totalDia = ventasHoy.reduce((s, v) => s + v.total, 0)
  sesion.cantidadVentas = ventasHoy.length
  guardarSesionCajaMock(sesion)
  return sesion
}
