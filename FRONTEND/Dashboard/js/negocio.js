import { showNotification } from './utilidades.js'

const LS_NEGOCIO = 'eleve_negocio_mock'

const NEGOCIO_DEFAULT = {
  nombre: 'ELEVÉ Barbería',
  slogan: 'Tu barbería de confianza',
  logoUrl: './img/logo-eleve-02.jpg',
  telefono: '+54 9 11 1234-5678',
  email: 'contacto@elevebarberia.com',
  whatsapp: '5491112345678',
  instagram: 'https://instagram.com/elevebarberia',
  facebook: '',
  direccion: 'Av. Corrientes 1234, CABA',
  mapsEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3284.016887889533!2d-58.38375908477045!3d-34.60373887965442!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzTCsDM2JzEzLjUiUyA1OMKwMjInNTkuMCJX!5e0!3m2!1ses!2sar!4v1600000000000!5m2!1ses!2sar',
  mapsLink: 'https://maps.google.com',
  mensajeReserva: 'Reservá tu turno online de forma rápida y sencilla.',
  politicaCancelacion: 'Cancelá con al menos 2 horas de anticipación.',
  horarios: [
    { dia: 0, nombre: 'Domingo', apertura: '09:00', cierre: '21:00', activo: false },
    { dia: 1, nombre: 'Lunes', apertura: '13:00', cierre: '21:00', activo: true },
    { dia: 2, nombre: 'Martes', apertura: '09:00', cierre: '21:00', activo: true },
    { dia: 3, nombre: 'Miércoles', apertura: '09:00', cierre: '21:00', activo: true },
    { dia: 4, nombre: 'Jueves', apertura: '09:00', cierre: '21:00', activo: true },
    { dia: 5, nombre: 'Viernes', apertura: '09:00', cierre: '21:00', activo: true },
    { dia: 6, nombre: 'Sábado', apertura: '09:00', cierre: '21:00', activo: true },
  ],
  diasNoLaborables: [
    { fecha: '2026-12-25', motivo: 'Navidad' },
    { fecha: '2026-01-01', motivo: 'Año Nuevo' },
  ],
}

function obtenerNegocioMock() {
  try {
    const raw = localStorage.getItem(LS_NEGOCIO)
    if (raw) return JSON.parse(raw)
  } catch { /* noop */ }
  localStorage.setItem(LS_NEGOCIO, JSON.stringify(NEGOCIO_DEFAULT))
  return { ...NEGOCIO_DEFAULT }
}

function guardarNegocioMock(data) {
  localStorage.setItem(LS_NEGOCIO, JSON.stringify(data))
}

export function inicializarNegocio() {
  const data = obtenerNegocioMock()
  poblarFormularioNegocio(data)
  renderizarHorarios(data.horarios)
  renderizarDiasNoLaborables(data.diasNoLaborables)
  renderizarVistaPrevia(data)
  setupNegocioListeners()
}

function setupNegocioListeners() {
  document.getElementById('form-negocio-general')?.addEventListener('submit', (e) => {
    e.preventDefault()
    guardarSeccionNegocio()
  })

  document.getElementById('form-negocio-redes')?.addEventListener('submit', (e) => {
    e.preventDefault()
    guardarSeccionNegocio()
  })

  document.getElementById('form-negocio-ubicacion')?.addEventListener('submit', (e) => {
    e.preventDefault()
    guardarSeccionNegocio()
  })

  document.getElementById('btn-guardar-horarios')?.addEventListener('click', guardarHorarios)

  document.getElementById('negocio-logo-input')?.addEventListener('change', previewLogo)

  document.getElementById('btn-agregar-dia-cerrado')?.addEventListener('click', agregarDiaCerrado)

  document.getElementById('lista-dias-cerrados')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-quitar-dia]')
    if (btn) quitarDiaCerrado(btn.dataset.quitarDia)
  })

  document.querySelectorAll('.negocio-subnav button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const seccion = btn.dataset.seccionNegocio
      document.querySelectorAll('.negocio-subnav button').forEach((b) => b.classList.remove('activo'))
      btn.classList.add('activo')
      document.querySelectorAll('.negocio-seccion-panel').forEach((p) => {
        p.classList.toggle('activo', p.id === `negocio-panel-${seccion}`)
      })
    })
  })
}

function poblarFormularioNegocio(data) {
  const campos = {
    'negocio-nombre': data.nombre,
    'negocio-slogan': data.slogan,
    'negocio-telefono': data.telefono,
    'negocio-email': data.email,
    'negocio-whatsapp': data.whatsapp,
    'negocio-instagram': data.instagram,
    'negocio-facebook': data.facebook,
    'negocio-direccion': data.direccion,
    'negocio-maps-embed': data.mapsEmbed,
    'negocio-maps-link': data.mapsLink,
    'negocio-mensaje-reserva': data.mensajeReserva,
    'negocio-politica': data.politicaCancelacion,
  }
  Object.entries(campos).forEach(([id, val]) => {
    const el = document.getElementById(id)
    if (el) el.value = val || ''
  })

  const logoPreview = document.getElementById('negocio-logo-preview')
  if (logoPreview) logoPreview.src = data.logoUrl || NEGOCIO_DEFAULT.logoUrl
}

function renderizarHorarios(horarios) {
  const cont = document.getElementById('tabla-horarios-negocio')
  if (!cont) return

  cont.innerHTML = horarios.map((h) => `
    <div class="fila-horario-negocio" data-dia="${h.dia}">
      <label class="horario-dia-check">
        <input type="checkbox" class="horario-activo" ${h.activo ? 'checked' : ''}>
        <span>${h.nombre}</span>
      </label>
      <input type="time" class="horario-apertura form-input" value="${h.apertura}" ${h.activo ? '' : 'disabled'}>
      <span class="horario-separador">a</span>
      <input type="time" class="horario-cierre form-input" value="${h.cierre}" ${h.activo ? '' : 'disabled'}>
    </div>
  `).join('')

  cont.querySelectorAll('.horario-activo').forEach((chk) => {
    chk.addEventListener('change', (e) => {
      const fila = e.target.closest('.fila-horario-negocio')
      fila.querySelectorAll('input[type="time"]').forEach((inp) => {
        inp.disabled = !e.target.checked
      })
    })
  })
}

function renderizarDiasNoLaborables(dias) {
  const lista = document.getElementById('lista-dias-cerrados')
  if (!lista) return

  if (!dias?.length) {
    lista.innerHTML = '<p class="sin-resultados">No hay días cerrados configurados</p>'
    return
  }

  lista.innerHTML = dias.map((d) => `
    <div class="dia-cerrado-item">
      <div>
        <strong>${formatearFecha(d.fecha)}</strong>
        <span>${d.motivo || 'Cerrado'}</span>
      </div>
      <button type="button" class="boton-icono eliminar" data-quitar-dia="${d.fecha}" title="Quitar">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('')
}

function formatearFecha(fecha) {
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}

function renderizarVistaPrevia(data) {
  const mapsFrame = document.getElementById('negocio-maps-preview')
  if (mapsFrame && data.mapsEmbed) mapsFrame.src = data.mapsEmbed

  const previewCard = document.getElementById('negocio-preview-card')
  if (previewCard) {
    previewCard.innerHTML = `
      <img src="${data.logoUrl || NEGOCIO_DEFAULT.logoUrl}" alt="Logo" class="negocio-preview-logo">
      <h3>${data.nombre}</h3>
      <p>${data.slogan || ''}</p>
      <div class="negocio-preview-links">
        ${data.whatsapp ? `<a href="https://wa.me/${data.whatsapp}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>` : ''}
        ${data.instagram ? `<a href="${data.instagram}" target="_blank" rel="noopener"><i class="fab fa-instagram"></i> Instagram</a>` : ''}
        ${data.mapsLink ? `<a href="${data.mapsLink}" target="_blank" rel="noopener"><i class="fas fa-map-marker-alt"></i> Ubicación</a>` : ''}
      </div>
      <p class="negocio-preview-dir"><i class="fas fa-location-dot"></i> ${data.direccion || ''}</p>
    `
  }
}

function previewLogo(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    document.getElementById('negocio-logo-preview').src = reader.result
    const data = obtenerNegocioMock()
    data.logoUrl = reader.result
    guardarNegocioMock(data)
    renderizarVistaPrevia(data)
    showNotification('Logo actualizado (demo, solo en este navegador)', 'success')
  }
  reader.readAsDataURL(file)
}

function guardarSeccionNegocio() {
  const data = obtenerNegocioMock()
  data.nombre = document.getElementById('negocio-nombre')?.value.trim() || data.nombre
  data.slogan = document.getElementById('negocio-slogan')?.value.trim() || ''
  data.telefono = document.getElementById('negocio-telefono')?.value.trim() || ''
  data.email = document.getElementById('negocio-email')?.value.trim() || ''
  data.whatsapp = document.getElementById('negocio-whatsapp')?.value.trim() || ''
  data.instagram = document.getElementById('negocio-instagram')?.value.trim() || ''
  data.facebook = document.getElementById('negocio-facebook')?.value.trim() || ''
  data.direccion = document.getElementById('negocio-direccion')?.value.trim() || ''
  data.mapsEmbed = document.getElementById('negocio-maps-embed')?.value.trim() || ''
  data.mapsLink = document.getElementById('negocio-maps-link')?.value.trim() || ''
  data.mensajeReserva = document.getElementById('negocio-mensaje-reserva')?.value.trim() || ''
  data.politicaCancelacion = document.getElementById('negocio-politica')?.value.trim() || ''

  guardarNegocioMock(data)
  renderizarVistaPrevia(data)
  const mapsFrame = document.getElementById('negocio-maps-preview')
  if (mapsFrame && data.mapsEmbed) mapsFrame.src = data.mapsEmbed
  showNotification('Configuración guardada (demo)', 'success')
}

function guardarHorarios() {
  const data = obtenerNegocioMock()
  const filas = document.querySelectorAll('.fila-horario-negocio')
  data.horarios = Array.from(filas).map((fila) => {
    const dia = Number(fila.dataset.dia)
    const nombre = NEGOCIO_DEFAULT.horarios.find((h) => h.dia === dia)?.nombre || ''
    return {
      dia,
      nombre,
      apertura: fila.querySelector('.horario-apertura').value,
      cierre: fila.querySelector('.horario-cierre').value,
      activo: fila.querySelector('.horario-activo').checked,
    }
  })
  guardarNegocioMock(data)
  showNotification('Horarios guardados (demo)', 'success')
}

function agregarDiaCerrado() {
  const fecha = document.getElementById('negocio-dia-cerrado-fecha')?.value
  const motivo = document.getElementById('negocio-dia-cerrado-motivo')?.value.trim()
  if (!fecha) {
    showNotification('Seleccioná una fecha', 'warning')
    return
  }
  const data = obtenerNegocioMock()
  if (!data.diasNoLaborables) data.diasNoLaborables = []
  if (data.diasNoLaborables.some((d) => d.fecha === fecha)) {
    showNotification('Esa fecha ya está registrada', 'warning')
    return
  }
  data.diasNoLaborables.push({ fecha, motivo: motivo || 'Cerrado' })
  data.diasNoLaborables.sort((a, b) => a.fecha.localeCompare(b.fecha))
  guardarNegocioMock(data)
  renderizarDiasNoLaborables(data.diasNoLaborables)
  document.getElementById('negocio-dia-cerrado-fecha').value = ''
  document.getElementById('negocio-dia-cerrado-motivo').value = ''
  showNotification('Día cerrado agregado (demo)', 'success')
}

function quitarDiaCerrado(fecha) {
  const data = obtenerNegocioMock()
  data.diasNoLaborables = (data.diasNoLaborables || []).filter((d) => d.fecha !== fecha)
  guardarNegocioMock(data)
  renderizarDiasNoLaborables(data.diasNoLaborables)
  showNotification('Día eliminado (demo)', 'info')
}
