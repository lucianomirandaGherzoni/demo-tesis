import { estado } from './estado.js'
import { formatCurrency, showNotification } from './utilidades.js'
import {
  obtenerProductosMock,
  obtenerCategorias,
  guardarVentaMock,
  obtenerVentasMock,
  obtenerSesionCajaMock,
  guardarSesionCajaMock,
  recalcularTotalesCaja,
} from './productos-mock.js'

/** @type {Array<{key: string, tipo: 'producto'|'servicio', id: number, nombre: string, precio: number, cantidad: number}>} */
let carrito = []
let productosCaja = []
let categoriaActiva = 'todas'
let metodoPagoSeleccionado = 'efectivo'
let carritoMobileAbierto = false

function esVistaCajaMobile() {
  return window.matchMedia('(max-width: 900px)').matches
}

function abrirCarritoMobile() {
  if (!esVistaCajaMobile()) return
  carritoMobileAbierto = true
  document.getElementById('caja-carrito-panel')?.classList.add('abierto')
  const overlay = document.getElementById('caja-carrito-overlay')
  if (overlay) overlay.hidden = false
  document.getElementById('btn-toggle-carrito-mobile')?.setAttribute('aria-expanded', 'true')
  document.body.classList.add('caja-carrito-abierto')
}

function cerrarCarritoMobile() {
  carritoMobileAbierto = false
  document.getElementById('caja-carrito-panel')?.classList.remove('abierto')
  const overlay = document.getElementById('caja-carrito-overlay')
  if (overlay) overlay.hidden = true
  document.getElementById('btn-toggle-carrito-mobile')?.setAttribute('aria-expanded', 'false')
  document.body.classList.remove('caja-carrito-abierto')
}

function toggleCarritoMobile() {
  if (carritoMobileAbierto) cerrarCarritoMobile()
  else abrirCarritoMobile()
}

export async function inicializarCaja() {
  productosCaja = (await obtenerProductosMock()).filter((p) => p.activo)
  setupCajaListeners()
  renderizarEstadoCaja()
  renderizarCatalogoCaja()
  renderizarCarrito()
  poblarSelectTurnos()
  renderizarVentasDia()
}

function setupCajaListeners() {
  document.getElementById('buscador-caja')?.addEventListener('input', renderizarCatalogoCaja)
  document.getElementById('filtros-categoria-caja')?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-categoria]')
    if (!chip) return
    categoriaActiva = chip.dataset.categoria
    document.querySelectorAll('#filtros-categoria-caja .chip-filtro').forEach((b) => {
      b.classList.toggle('activo', b.dataset.categoria === categoriaActiva)
    })
    renderizarCatalogoCaja()
  })

  document.getElementById('grid-productos-caja')?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-agregar-producto]')
    if (card) agregarAlCarrito('producto', Number(card.dataset.agregarProducto))
  })

  document.getElementById('carrito-items')?.addEventListener('click', (e) => {
    const btnMas = e.target.closest('[data-mas]')
    const btnMenos = e.target.closest('[data-menos]')
    const btnQuitar = e.target.closest('[data-quitar]')
    if (btnMas) cambiarCantidad(btnMas.dataset.mas, 1)
    if (btnMenos) cambiarCantidad(btnMenos.dataset.menos, -1)
    if (btnQuitar) quitarDelCarrito(btnQuitar.dataset.quitar)
  })

  document.getElementById('btn-vaciar-carrito')?.addEventListener('click', () => {
    carrito = []
    renderizarCarrito()
    showNotification('Carrito vaciado', 'info')
  })

  document.getElementById('btn-cobrar-caja')?.addEventListener('click', abrirModalCobro)
  document.querySelector('#modal-cobro-caja .cerrar-modal')?.addEventListener('click', cerrarModalCobro)
  document.querySelector('#modal-cobro-caja .btn-cancelar-cobro')?.addEventListener('click', cerrarModalCobro)

  document.getElementById('metodos-pago-caja')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-metodo]')
    if (!btn) return
    metodoPagoSeleccionado = btn.dataset.metodo
    document.querySelectorAll('#metodos-pago-caja .btn-metodo-pago').forEach((b) => {
      b.classList.toggle('activo', b.dataset.metodo === metodoPagoSeleccionado)
    })
  })

  document.getElementById('btn-confirmar-cobro')?.addEventListener('click', confirmarCobro)

  document.getElementById('select-turno-caja')?.addEventListener('change', (e) => {
    const turnoId = e.target.value
    if (!turnoId) return
    const turno = (estado.turnos || []).find((t) => String(t.id) === turnoId)
    if (!turno) return
    const key = itemKey('servicio', turno.id, turno.id)
    if (carrito.some((i) => i.key === key)) return
    const servicio = estado.servicios?.find((s) => s.nombre === turno.nombre_servicio)
    agregarAlCarrito('servicio', servicio?.id || turno.id, {
      nombre: turno.nombre_servicio || 'Servicio',
      precio: Number(turno.precio) || Number(servicio?.precio) || 0,
      turnoId: turno.id,
    })
  })

  document.getElementById('btn-abrir-caja')?.addEventListener('click', () => {
    const sesion = { abierta: true, abiertaEn: new Date().toISOString(), montoApertura: 0, totalDia: 0, cantidadVentas: 0 }
    guardarSesionCajaMock(sesion)
    renderizarEstadoCaja()
    showNotification('Caja abierta (demo)', 'success')
  })

  document.getElementById('btn-cerrar-caja')?.addEventListener('click', () => {
    const sesion = obtenerSesionCajaMock()
    sesion.abierta = false
    sesion.cerradaEn = new Date().toISOString()
    guardarSesionCajaMock(sesion)
    renderizarEstadoCaja()
    showNotification('Caja cerrada (demo)', 'info')
  })

  document.getElementById('btn-ver-ventas-dia')?.addEventListener('click', renderizarVentasDia)

  document.getElementById('btn-toggle-carrito-mobile')?.addEventListener('click', toggleCarritoMobile)
  document.getElementById('btn-cerrar-carrito-mobile')?.addEventListener('click', cerrarCarritoMobile)
  document.getElementById('caja-carrito-overlay')?.addEventListener('click', cerrarCarritoMobile)
  document.getElementById('btn-cobrar-caja-mobile')?.addEventListener('click', abrirModalCobro)

  window.addEventListener('resize', () => {
    if (!esVistaCajaMobile()) cerrarCarritoMobile()
  })
}

function itemKey(tipo, id, turnoId = null) {
  return turnoId ? `${tipo}-${id}-t${turnoId}` : `${tipo}-${id}`
}

function agregarAlCarrito(tipo, id, extra = {}) {
  if (tipo === 'producto') {
    const prod = productosCaja.find((p) => p.id === id)
    if (!prod) return
    const key = itemKey('producto', id)
    const existente = carrito.find((i) => i.key === key)
    if (existente) {
      existente.cantidad += 1
    } else {
      carrito.push({
        key,
        tipo: 'producto',
        id,
        nombre: prod.nombre,
        precio: Number(prod.precio),
        cantidad: 1,
      })
    }
  } else {
    const key = itemKey('servicio', id, extra.turnoId)
    if (carrito.some((i) => i.key === key)) return
    carrito.push({
      key,
      tipo: 'servicio',
      id,
      turnoId: extra.turnoId || null,
      nombre: extra.nombre,
      precio: extra.precio,
      cantidad: 1,
    })
  }
  renderizarCarrito()
  if (esVistaCajaMobile() && tipo === 'producto') {
    const nombre = productosCaja.find((p) => p.id === id)?.nombre
    if (nombre) showNotification(`${nombre} agregado`, 'success')
  }
}

function cambiarCantidad(key, delta) {
  const item = carrito.find((i) => i.key === key)
  if (!item) return
  if (item.tipo === 'servicio') return
  item.cantidad += delta
  if (item.cantidad <= 0) carrito = carrito.filter((i) => i.key !== key)
  renderizarCarrito()
}

function quitarDelCarrito(key) {
  carrito = carrito.filter((i) => i.key !== key)
  renderizarCarrito()
}

function calcularSubtotal() {
  return carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
}

function renderizarEstadoCaja() {
  const sesion = recalcularTotalesCaja()
  const badge = document.getElementById('estado-caja-badge')
  const totalDia = document.getElementById('caja-total-dia')
  const cantVentas = document.getElementById('caja-cant-ventas')
  const btnAbrir = document.getElementById('btn-abrir-caja')
  const btnCerrar = document.getElementById('btn-cerrar-caja')

  if (badge) {
    badge.textContent = sesion.abierta ? 'Caja abierta' : 'Caja cerrada'
    badge.className = `estado-caja-badge ${sesion.abierta ? 'abierta' : 'cerrada'}`
  }
  if (totalDia) totalDia.textContent = formatCurrency(sesion.totalDia)
  if (cantVentas) cantVentas.textContent = sesion.cantidadVentas
  if (btnAbrir) btnAbrir.style.display = sesion.abierta ? 'none' : ''
  if (btnCerrar) btnCerrar.style.display = sesion.abierta ? '' : 'none'
}

function renderizarCatalogoCaja() {
  const grid = document.getElementById('grid-productos-caja')
  const filtros = document.getElementById('filtros-categoria-caja')
  if (!grid) return

  const texto = (document.getElementById('buscador-caja')?.value || '').toLowerCase()
  const cats = ['todas', ...obtenerCategorias(productosCaja)]

  if (filtros && !filtros.dataset.rendered) {
    filtros.innerHTML = cats.map((c) => `
      <button type="button" class="chip-filtro ${c === categoriaActiva ? 'activo' : ''}" data-categoria="${c}">
        ${c === 'todas' ? 'Todos' : c}
      </button>
    `).join('')
    filtros.dataset.rendered = '1'
  }

  const filtrados = productosCaja.filter((p) => {
    const okCat = categoriaActiva === 'todas' || p.categoria === categoriaActiva
    const okTexto = !texto || p.nombre.toLowerCase().includes(texto)
    return okCat && okTexto
  })

  if (filtrados.length === 0) {
    grid.innerHTML = '<p class="sin-resultados caja-sin-productos">No hay productos activos</p>'
    return
  }

  grid.innerHTML = filtrados.map((p) => `
    <button type="button" class="tarjeta-producto-caja" data-agregar-producto="${p.id}">
      <span class="producto-caja-cat">${p.categoria || 'General'}</span>
      <h4>${p.nombre}</h4>
      <p class="producto-caja-precio">${formatCurrency(p.precio)}</p>
    </button>
  `).join('')
}

function renderizarCarrito() {
  const contenedor = document.getElementById('carrito-items')
  const subtotalEl = document.getElementById('carrito-subtotal')
  const totalEl = document.getElementById('carrito-total')
  const btnCobrar = document.getElementById('btn-cobrar-caja')
  const btnCobrarMobile = document.getElementById('btn-cobrar-caja-mobile')
  const contador = document.getElementById('carrito-contador')

  const subtotal = calcularSubtotal()
  const itemsCount = carrito.reduce((s, i) => s + i.cantidad, 0)
  const totalFmt = formatCurrency(subtotal)
  const vacio = carrito.length === 0

  if (contador) contador.textContent = itemsCount
  if (subtotalEl) subtotalEl.textContent = totalFmt
  if (totalEl) totalEl.textContent = totalFmt
  if (btnCobrar) btnCobrar.disabled = vacio
  if (btnCobrarMobile) btnCobrarMobile.disabled = vacio

  const dockTotal = document.getElementById('caja-dock-total')
  const dockItems = document.getElementById('caja-dock-items')
  const dockBadge = document.getElementById('caja-dock-badge')
  if (dockTotal) dockTotal.textContent = totalFmt
  if (dockItems) dockItems.textContent = itemsCount === 0 ? 'Sin ítems' : `${itemsCount} ítem${itemsCount === 1 ? '' : 's'}`
  if (dockBadge) {
    dockBadge.textContent = itemsCount
    dockBadge.hidden = itemsCount === 0
  }
  const headerCount = document.getElementById('carrito-header-count')
  if (headerCount) headerCount.textContent = itemsCount > 0 ? `(${itemsCount})` : ''

  if (!contenedor) return

  if (vacio) {
    contenedor.innerHTML = `
      <div class="carrito-vacio">
        <p>Sin productos</p>
        <small>Tocá un producto para agregarlo</small>
      </div>`
    return
  }

  contenedor.innerHTML = carrito.map((item) => `
    <article class="carrito-item ${item.tipo}">
      <div class="carrito-item-top">
        <div class="carrito-item-info">
          <span class="carrito-item-tipo">${item.tipo === 'servicio' ? 'Servicio' : 'Producto'}</span>
          <span class="carrito-item-nombre">${item.nombre}</span>
        </div>
        <span class="carrito-item-subtotal valor-tabular">${formatCurrency(item.precio * item.cantidad)}</span>
      </div>
      <div class="carrito-item-bottom">
        ${item.tipo === 'producto' ? `
          <div class="carrito-cantidad" role="group" aria-label="Cantidad">
            <button type="button" class="btn-cantidad" data-menos="${item.key}" aria-label="Menos">−</button>
            <span>${item.cantidad}</span>
            <button type="button" class="btn-cantidad" data-mas="${item.key}" aria-label="Más">+</button>
          </div>
        ` : '<span class="carrito-item-unitario">×1 · ${formatCurrency(item.precio)}</span>'}
        <button type="button" class="carrito-btn-quitar" data-quitar="${item.key}" aria-label="Quitar ${item.nombre}">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    </article>
  `).join('')
}

function poblarSelectTurnos() {
  const select = document.getElementById('select-turno-caja')
  if (!select) return

  const turnos = (estado.turnos || []).filter((t) =>
    !['cancelado', 'anulado'].includes(t.estado)
  )

  select.innerHTML = '<option value="">Sin turno (venta mostrador)</option>'
    + turnos.map((t) => {
      const hora = (t.hora || t.hora_inicio || '').substring(0, 5)
      return `<option value="${t.id}">${hora} — ${t.nombre_cliente || 'Cliente'} — ${t.nombre_servicio || 'Servicio'}</option>`
    }).join('')
}

function abrirModalCobro() {
  if (carrito.length === 0) return
  const sesion = obtenerSesionCajaMock()
  if (!sesion.abierta) {
    showNotification('Abrí la caja antes de cobrar', 'warning')
    return
  }

  const total = calcularSubtotal()
  document.getElementById('cobro-total-monto').textContent = formatCurrency(total)
  document.getElementById('cobro-resumen-items').textContent =
    `${carrito.reduce((s, i) => s + i.cantidad, 0)} ítem(s)`

  const modal = document.getElementById('modal-cobro-caja')
  modal?.classList.add('activo')
  document.body.style.overflow = 'hidden'
}

function cerrarModalCobro() {
  document.getElementById('modal-cobro-caja')?.classList.remove('activo')
  document.body.style.overflow = ''
}

function confirmarCobro() {
  const total = calcularSubtotal()
  const turnoSelect = document.getElementById('select-turno-caja')
  const clienteInput = document.getElementById('carrito-cliente')

  const venta = {
    id: Date.now(),
    fecha: new Date().toISOString(),
    items: carrito.map((i) => ({ ...i })),
    total,
    metodoPago: metodoPagoSeleccionado,
    turnoId: turnoSelect?.value || null,
    cliente: clienteInput?.value.trim() || null,
  }

  guardarVentaMock(venta)
  carrito = []
  if (turnoSelect) turnoSelect.value = ''
  if (clienteInput) clienteInput.value = ''

  cerrarModalCobro()
  cerrarCarritoMobile()
  renderizarCarrito()
  renderizarEstadoCaja()
  renderizarVentasDia()
  showNotification(`Venta registrada — ${formatCurrency(total)} (${metodoPagoSeleccionado})`, 'success')
}

function renderizarVentasDia() {
  const panel = document.getElementById('ventas-dia-lista')
  if (!panel) return

  const hoy = new Date().toISOString().slice(0, 10)
  const ventas = obtenerVentasMock().filter((v) => v.fecha?.startsWith(hoy))
  const countEl = document.getElementById('ventas-dia-count')
  if (countEl) countEl.textContent = ventas.length

  if (ventas.length === 0) {
    panel.innerHTML = '<p class="sin-resultados">Sin ventas registradas hoy</p>'
    return
  }

  panel.innerHTML = ventas.map((v) => {
    const hora = new Date(v.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    const itemsTxt = v.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ')
    return `
      <div class="venta-dia-item">
        <div class="venta-dia-detalle">
          <p>${itemsTxt}</p>
          <small>${hora} · ${v.metodoPago}${v.cliente ? ` · ${v.cliente}` : ''}</small>
        </div>
        <div class="venta-dia-total valor-tabular">${formatCurrency(v.total)}</div>
      </div>`
  }).join('')
}

export async function refrescarCaja() {
  productosCaja = (await obtenerProductosMock()).filter((p) => p.activo)
  document.getElementById('filtros-categoria-caja')?.removeAttribute('data-rendered')
  categoriaActiva = 'todas'
  cerrarCarritoMobile()
  poblarSelectTurnos()
  renderizarCatalogoCaja()
  renderizarEstadoCaja()
  renderizarVentasDia()
}
