import { formatCurrency, showNotification, confirmarAccion } from './utilidades.js'
import {
  obtenerProductosMock,
  guardarProductosMock,
  obtenerCategorias,
} from './productos-mock.js'

let productos = []
let productosFiltrados = []

export async function inicializarProductos() {
  productos = await obtenerProductosMock()
  productosFiltrados = [...productos]
  setupProductosListeners()
  renderizarProductos()
  actualizarMetricasProductos()
}

function setupProductosListeners() {
  document.getElementById('buscador-productos')?.addEventListener('input', (e) => {
    filtrarProductos(e.target.value, document.getElementById('filtro-categoria-productos')?.value)
  })

  document.getElementById('filtro-categoria-productos')?.addEventListener('change', (e) => {
    filtrarProductos(document.getElementById('buscador-productos')?.value || '', e.target.value)
  })

  document.getElementById('btn-nuevo-producto')?.addEventListener('click', () => abrirModalProducto())
  document.querySelector('#modal-producto .cerrar-modal')?.addEventListener('click', cerrarModalProducto)
  document.querySelector('#modal-producto .btn-cancelar-producto')?.addEventListener('click', cerrarModalProducto)
  document.getElementById('form-producto')?.addEventListener('submit', guardarProducto)

  document.getElementById('producto-categoria')?.addEventListener('change', (e) => {
    const wrap = document.getElementById('wrap-categoria-nueva')
    if (wrap) wrap.style.display = e.target.value === '__nueva__' ? '' : 'none'
  })

  document.getElementById('lista-productos')?.addEventListener('click', (e) => {
    const btnEditar = e.target.closest('[data-editar-producto]')
    const btnEliminar = e.target.closest('[data-eliminar-producto]')
    if (btnEditar) abrirModalProducto(Number(btnEditar.dataset.editarProducto))
    if (btnEliminar) eliminarProducto(Number(btnEliminar.dataset.eliminarProducto))
  })
}

function filtrarProductos(texto, categoria) {
  const termino = (texto || '').toLowerCase()
  productosFiltrados = productos.filter((p) => {
    const coincideTexto = !termino
      || p.nombre.toLowerCase().includes(termino)
      || (p.descripcion && p.descripcion.toLowerCase().includes(termino))
    const coincideCat = !categoria || categoria === 'todas' || p.categoria === categoria
    return coincideTexto && coincideCat
  })
  renderizarProductos()
}

function actualizarFiltroCategorias() {
  const select = document.getElementById('filtro-categoria-productos')
  if (!select) return
  const cats = obtenerCategorias(productos)
  select.innerHTML = '<option value="todas">Todas las categorías</option>'
    + cats.map((c) => `<option value="${c}">${c}</option>`).join('')
}

function actualizarMetricasProductos() {
  const activos = productos.filter((p) => p.activo)
  const stockBajo = productos.filter((p) => p.stock <= 5)
  const precioProm = activos.length
    ? activos.reduce((s, p) => s + Number(p.precio), 0) / activos.length
    : 0

  const elTotal = document.getElementById('total-productos')
  const elStock = document.getElementById('productos-stock-bajo')
  const elPrecio = document.getElementById('precio-promedio-productos')
  if (elTotal) elTotal.textContent = activos.length
  if (elStock) elStock.textContent = stockBajo.length
  if (elPrecio) elPrecio.textContent = formatCurrency(precioProm)
}

function renderizarProductos() {
  const lista = document.getElementById('lista-productos')
  if (!lista) return

  actualizarFiltroCategorias()

  if (productosFiltrados.length === 0) {
    lista.innerHTML = '<p class="sin-resultados">No hay productos para mostrar</p>'
    return
  }

  lista.innerHTML = productosFiltrados.map((p) => `
    <div class="elemento-lista elemento-producto" data-id="${p.id}">
      <div class="producto-avatar-mini" aria-hidden="true">
        <i class="fas fa-box"></i>
      </div>
      <div class="info-elemento">
        <div class="producto-lista-header">
          <h4>${p.nombre}</h4>
          <span class="insignia-categoria">${p.categoria || 'General'}</span>
          ${p.activo ? '' : '<span class="insignia-inactivo">Inactivo</span>'}
        </div>
        <p class="meta-producto-card">
          ${formatCurrency(p.precio)} · Stock: ${p.stock ?? 0}
        </p>
        ${p.descripcion ? `<small class="descripcion-producto-card">${p.descripcion}</small>` : ''}
      </div>
      <div class="acciones-elemento">
        <button class="boton-icono editar" data-editar-producto="${p.id}" title="Editar">
          <i class="fas fa-edit"></i>
        </button>
        <button class="boton-icono eliminar" data-eliminar-producto="${p.id}" title="Eliminar">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('')
}

function abrirModalProducto(id = null) {
  const modal = document.getElementById('modal-producto')
  const titulo = document.getElementById('titulo-modal-producto')
  const form = document.getElementById('form-producto')
  if (!modal || !form) return

  form.reset()
  document.getElementById('producto-id').value = ''

  const selectCat = document.getElementById('producto-categoria')
  if (selectCat) {
    const cats = obtenerCategorias(productos)
    selectCat.innerHTML = cats.map((c) => `<option value="${c}">${c}</option>`).join('')
      + '<option value="__nueva__">+ Nueva categoría</option>'
  }

  if (id) {
    const prod = productos.find((p) => p.id === id)
    if (!prod) return
    titulo.textContent = 'Editar Producto'
    document.getElementById('producto-id').value = prod.id
    document.getElementById('producto-nombre').value = prod.nombre
    document.getElementById('producto-descripcion').value = prod.descripcion || ''
    document.getElementById('producto-precio').value = prod.precio
    document.getElementById('producto-stock').value = prod.stock ?? 0
    document.getElementById('producto-activo').checked = prod.activo !== false
    if (selectCat && prod.categoria) selectCat.value = prod.categoria
  } else {
    titulo.textContent = 'Nuevo Producto'
    document.getElementById('producto-activo').checked = true
  }

  modal.classList.add('activo')
  document.body.style.overflow = 'hidden'
}

function cerrarModalProducto() {
  const modal = document.getElementById('modal-producto')
  modal?.classList.remove('activo')
  document.body.style.overflow = ''
}

async function guardarProducto(e) {
  e.preventDefault()

  const id = document.getElementById('producto-id').value
  let categoria = document.getElementById('producto-categoria').value
  if (categoria === '__nueva__') {
    categoria = document.getElementById('producto-categoria-nueva').value.trim()
    if (!categoria) {
      showNotification('Ingresá el nombre de la categoría', 'warning')
      return
    }
  }

  const datos = {
    nombre: document.getElementById('producto-nombre').value.trim(),
    descripcion: document.getElementById('producto-descripcion').value.trim(),
    precio: Number(document.getElementById('producto-precio').value),
    stock: Number(document.getElementById('producto-stock').value) || 0,
    categoria,
    activo: document.getElementById('producto-activo').checked,
  }

  if (id) {
    const idx = productos.findIndex((p) => p.id === Number(id))
    if (idx >= 0) productos[idx] = { ...productos[idx], ...datos }
    showNotification('Producto actualizado (demo)', 'success')
  } else {
    const nuevoId = productos.length ? Math.max(...productos.map((p) => p.id)) + 1 : 1
    productos.push({ id: nuevoId, ...datos })
    showNotification('Producto creado (demo)', 'success')
  }

  guardarProductosMock(productos)
  productosFiltrados = [...productos]
  cerrarModalProducto()
  renderizarProductos()
  actualizarMetricasProductos()
}

async function eliminarProducto(id) {
  const prod = productos.find((p) => p.id === id)
  if (!prod) return
  const ok = await confirmarAccion(
  'Eliminar producto',
  `¿Eliminar "${prod.nombre}"? (solo demo, se borra del almacenamiento local)`
  )
  if (!ok) return
  productos = productos.filter((p) => p.id !== id)
  guardarProductosMock(productos)
  productosFiltrados = productosFiltrados.filter((p) => p.id !== id)
  renderizarProductos()
  actualizarMetricasProductos()
  showNotification('Producto eliminado (demo)', 'success')
}

export async function recargarProductosDesdeMock() {
  productos = await obtenerProductosMock()
  productosFiltrados = [...productos]
  renderizarProductos()
  actualizarMetricasProductos()
  return productos
}
