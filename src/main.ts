import './style.css'
import { formatPrice, escapeHtml } from './utils'

// Types
interface Product {
  id: number
  name: string
  originalPrice: number
  originalQuantity: number
  unit: string
  largeUnit: string
  factor: number
  pricePerUnit: number
  pricePerLarge: number
  addedAt: number
}

interface Unit {
  unit: string
  large: string
  factor: number
}

interface Session {
  name: string
  products: Product[]
  savedAt: number
}

interface ToastTimer {
  id: number
  timer: ReturnType<typeof setTimeout>
}

// Theme Management
const themeBtns = document.querySelectorAll<HTMLButtonElement>('.theme-btn')
const html = document.documentElement

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: 'light' | 'dark'): void {
  html.setAttribute('data-theme', theme)

  // Update meta theme-color
  const metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (metaTheme) {
    metaTheme.content = theme === 'dark' ? '#0a0a0f' : '#f8fafc'
  }
}

function setTheme(theme: 'light' | 'dark'): void {
  localStorage.setItem('theme', theme)
  applyTheme(theme)

  themeBtns.forEach(btn => {
    const btnTheme = btn.dataset.theme as 'light' | 'dark' | undefined
    btn.classList.toggle('active', btnTheme === theme)
  })
}

// Initialize theme: use saved or detect from system
const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
if (savedTheme) {
  setTheme(savedTheme)
} else {
  setTheme(getSystemTheme())
}

// Theme button clicks
themeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.dataset.theme as 'light' | 'dark'
    setTheme(theme)
  })
})

// App State
let products: Product[] = JSON.parse(localStorage.getItem('products') || '[]')
let currentUnit: Unit = { unit: 'г', large: 'кг', factor: 1000 }
let sortBy: 'price' | 'added' = 'price'
let deferredPrompt: Event | null = null

// DOM Elements
const productNameInput = document.getElementById('productName') as HTMLInputElement
const priceInput = document.getElementById('price') as HTMLInputElement
const quantityInput = document.getElementById('quantity') as HTMLInputElement
const addBtn = document.getElementById('addProduct') as HTMLButtonElement
const productsList = document.getElementById('productsList') as HTMLDivElement
const resultsSection = document.getElementById('resultsSection') as HTMLDivElement
const emptyState = document.getElementById('emptyState') as HTMLDivElement
const itemCount = document.getElementById('itemCount') as HTMLSpanElement
const clearAllBtn = document.getElementById('clearAll') as HTMLButtonElement
const unitBtns = document.querySelectorAll<HTMLButtonElement>('.unit-btn')
const sortBtns = document.querySelectorAll<HTMLButtonElement>('.sort-btn')
const installBanner = document.getElementById('installBanner') as HTMLDivElement
const installBtn = document.getElementById('installBtn') as HTMLButtonElement
const installClose = document.getElementById('installClose') as HTMLButtonElement

// Unit Selection
unitBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    unitBtns.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    const unit = btn.dataset.unit
    const large = btn.dataset.large
    const factor = btn.dataset.factor
    if (unit && large && factor) {
      currentUnit = { unit, large, factor: parseInt(factor) }
    }
  })
})

// Sort Selection
sortBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    sortBtns.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    const sortValue = btn.dataset.sort as 'price' | 'added' | undefined
    if (sortValue) {
      sortBy = sortValue
      renderProducts()
    }
  })
})

// Add Product
addBtn.addEventListener('click', addProduct)

// Enter key support
;[productNameInput, priceInput, quantityInput].forEach(input => {
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addProduct()
  })
})

function addProduct(): void {
  const name = productNameInput.value.trim() || `Товар ${products.length + 1}`
  const price = parseFloat(priceInput.value)
  const quantity = parseFloat(quantityInput.value)

  // Валидация с проверкой на NaN
  if (isNaN(price) || price <= 0) {
    showError('Введите корректную цену', priceInput)
    priceInput.focus()
    return
  }
  if (isNaN(quantity) || quantity <= 0) {
    showError('Введите корректное количество', quantityInput)
    quantityInput.focus()
    return
  }

  const pricePerUnit = price / quantity
  const pricePerLarge = pricePerUnit * currentUnit.factor

  const product: Product = {
    id: Date.now(),
    name,
    originalPrice: price,
    originalQuantity: quantity,
    unit: currentUnit.unit,
    largeUnit: currentUnit.large,
    factor: currentUnit.factor,
    pricePerUnit,
    pricePerLarge,
    addedAt: Date.now()
  }

  products.push(product)
  saveProducts()
  renderProducts()

  // Clear inputs
  productNameInput.value = ''
  priceInput.value = ''
  quantityInput.value = ''
  productNameInput.focus()

  // Haptic feedback if available
  if (navigator.vibrate) {
    navigator.vibrate(10)
  }
}

function deleteProduct(id: number): void {
  const product = products.find(p => p.id === id)
  if (!product) return

  const productIndex = products.findIndex(p => p.id === id)
  const productBackup = { ...product }

  // Удаляем из массива
  products.splice(productIndex, 1)
  saveProducts()
  renderProducts()

  if (navigator.vibrate) {
    navigator.vibrate([10, 50, 10])
  }

  // Показываем toast с возможностью отмены
  showUndoToast(`«${product.name}» удалён`, () => {
    // Восстанавливаем товар
    products.splice(productIndex, 0, productBackup)
    saveProducts()
    renderProducts()
  })
}

// Toast с отложенным действием и undo
let toastTimers: ToastTimer[] = []

function showUndoToast(message: string, undoCallback: () => void): void {
  const container = document.getElementById('toastContainer') as HTMLDivElement
  const toastId = Date.now()

  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.dataset.id = toastId.toString()
  toast.innerHTML = `
    <div class="toast-content">
      <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
      <span class="toast-text">${message}</span>
    </div>
    <button class="toast-undo">Отменить</button>
    <div class="toast-progress"></div>
  `

  container.appendChild(toast)

  const undoBtn = toast.querySelector('.toast-undo') as HTMLButtonElement
  const timer = setTimeout(() => {
    removeToast(toastId)
  }, 3000)

  toastTimers.push({ id: toastId, timer })

  undoBtn.addEventListener('click', () => {
    clearTimeout(timer)
    toastTimers = toastTimers.filter(t => t.id !== toastId)
    undoCallback()
    removeToast(toastId)
    if (navigator.vibrate) {
      navigator.vibrate(5)
    }
  })
}

function removeToast(toastId: number): void {
  const container = document.getElementById('toastContainer') as HTMLDivElement
  const toast = container.querySelector(`[data-id="${toastId}"]`)
  if (toast) {
    toast.classList.add('removing')
    setTimeout(() => toast.remove(), 300)
  }
  toastTimers = toastTimers.filter(t => t.id !== toastId)
}

// Кастомный confirm modal
function showConfirm(
  title: string,
  text: string,
  onConfirm: () => void,
  confirmBtnText = 'Удалить',
  isDanger = true
): void {
  const modal = document.getElementById('confirmModal') as HTMLDivElement
  const titleEl = document.getElementById('confirmTitle') as HTMLHeadingElement
  const textEl = document.getElementById('confirmText') as HTMLParagraphElement
  const cancelBtn = document.getElementById('confirmCancel') as HTMLButtonElement
  const okBtn = document.getElementById('confirmOk') as HTMLButtonElement

  titleEl.textContent = title
  textEl.textContent = text
  okBtn.textContent = confirmBtnText

  // Меняем стиль кнопки
  if (isDanger) {
    okBtn.classList.add('danger')
    okBtn.classList.remove('confirm')
  } else {
    okBtn.classList.remove('danger')
    okBtn.classList.add('confirm')
  }

  modal.classList.add('show')

  const cleanup = () => {
    modal.classList.remove('show')
    cancelBtn.removeEventListener('click', handleCancel)
    okBtn.removeEventListener('click', handleOk)
    modal.removeEventListener('click', handleBackdrop)
  }

  const handleCancel = () => cleanup()
  const handleOk = () => {
    cleanup()
    onConfirm()
  }
  const handleBackdrop = (e: MouseEvent) => {
    if (e.target === modal) cleanup()
  }

  cancelBtn.addEventListener('click', handleCancel)
  okBtn.addEventListener('click', handleOk)
  modal.addEventListener('click', handleBackdrop)
}

function clearAll(): void {
  if (products.length === 0) return

  showConfirm(
    'Удалить все товары?',
    `Будет удалено ${products.length} товаров. Это действие можно отменить в течение 3 секунд.`,
    () => {
      const backup = [...products]
      products = []
      saveProducts()
      renderProducts()

      showUndoToast('Все товары удалены', () => {
        products = backup
        saveProducts()
        renderProducts()
      })
    }
  )
}

clearAllBtn.addEventListener('click', clearAll)

function saveProducts(): void {
  localStorage.setItem('products', JSON.stringify(products))
}

function renderProducts(): void {
  if (products.length === 0) {
    resultsSection.style.display = 'none'
    emptyState.style.display = 'block'
    return
  }

  resultsSection.style.display = 'block'
  emptyState.style.display = 'none'
  itemCount.textContent = products.length.toString()

  // Sort products
  let sorted = [...products]
  if (sortBy === 'price') {
    sorted.sort((a, b) => a.pricePerUnit - b.pricePerUnit)
  } else {
    // По добавлению - новые сверху
    sorted.sort((a, b) => b.addedAt - a.addedAt)
  }

  // Find best deal
  const bestDealId = sorted.reduce<Product | null>(
    (best, current) =>
      current.pricePerUnit < (best?.pricePerUnit ?? Infinity) ? current : best,
    null
  )?.id

  productsList.innerHTML = sorted
    .map(
      (product) => `
    <div class="product-card ${
      product.id === bestDealId && products.length > 1 ? 'best-deal' : ''
    }" data-id="${product.id}">
      <div class="swipe-hint swipe-hint-left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </div>
      <div class="swipe-hint swipe-hint-right">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </div>
      ${product.id === bestDealId && products.length > 1 ? '<div class="best-badge">🏆 Лучшая цена</div>' : ''}
      <div class="product-header">
        <div>
          <div class="product-name">${escapeHtml(product.name)}</div>
          <div class="product-original"><strong>${formatPrice(product.originalPrice)} ₽</strong> за <strong>${formatPrice(product.originalQuantity)} ${product.unit}</strong></div>
        </div>
        <button class="delete-btn" data-delete-id="${product.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
      <div class="price-grid">
        <div class="price-box">
          <div class="price-label">За 1 ${product.unit}</div>
          <div class="price-value">${formatPrice(product.pricePerUnit)} <small>₽</small></div>
        </div>
        <div class="price-box">
          <div class="price-label">${product.unit === 'шт' ? 'За' : 'За 1'} ${product.largeUnit}</div>
          <div class="price-value">${formatPrice(product.pricePerLarge)} <small>₽</small></div>
        </div>
      </div>
    </div>
  `
    )
    .join('')

  // Add event listeners to delete buttons
  document.querySelectorAll<HTMLButtonElement>('[data-delete-id]').forEach(btn => {
    const id = parseInt(btn.dataset.deleteId || '0')
    btn.addEventListener('click', () => deleteProduct(id))
  })

  // Initialize swipe handlers
  initSwipeHandlers()
}

// Swipe to delete functionality
function initSwipeHandlers(): void {
  const cards = document.querySelectorAll<HTMLDivElement>('.product-card')

  cards.forEach((card) => {
    let startX = 0
    let currentX = 0
    let isDragging = false
    const threshold = 80 // Minimum swipe distance to trigger delete

    card.addEventListener('touchstart', (e) => {
      // Don't start swipe if touching delete button
      if ((e.target as HTMLElement)?.closest('.delete-btn')) return

      startX = e.touches[0].clientX
      isDragging = true
      card.classList.add('swiping')
    }, { passive: true })

    card.addEventListener('touchmove', (e) => {
      if (!isDragging) return

      currentX = e.touches[0].clientX - startX

      // Apply resistance at edges
      const resistance = 0.4
      const translateX = currentX * resistance

      card.style.transform = `translateX(${translateX}px)`
    }, { passive: true })

    card.addEventListener('touchend', () => {
      if (!isDragging) return
      isDragging = false
      card.classList.remove('swiping')

      const translateX = currentX * 0.4

      if (Math.abs(translateX) > threshold) {
        // Trigger delete
        const direction = translateX < 0 ? 'swipe-left' : 'swipe-right'
        card.classList.add('removing', direction)

        const productId = parseInt(card.dataset.id || '0')

        setTimeout(() => {
          deleteProduct(productId)
        }, 300)
      } else {
        // Snap back
        card.style.transform = ''
      }

      currentX = 0
    })

    // Mouse support for desktop testing
    card.addEventListener('mousedown', (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('.delete-btn')) return

      startX = e.clientX
      isDragging = true
      card.classList.add('swiping')

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return
        currentX = e.clientX - startX
        const resistance = 0.4
        card.style.transform = `translateX(${currentX * resistance}px)`
      }

      const onMouseUp = () => {
        if (!isDragging) return
        isDragging = false
        card.classList.remove('swiping')

        const translateX = currentX * 0.4

        if (Math.abs(translateX) > threshold) {
          const direction = translateX < 0 ? 'swipe-left' : 'swipe-right'
          card.classList.add('removing', direction)

          const productId = parseInt(card.dataset.id || '0')
          setTimeout(() => deleteProduct(productId), 300)
        } else {
          card.style.transform = ''
        }

        currentX = 0
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    })
  })
}

// Shake animation
const style = document.createElement('style')
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-8px); }
    40%, 80% { transform: translateX(8px); }
  }
`
document.head.appendChild(style)

// PWA Install
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e

  // Show install banner after a delay
  setTimeout(() => {
    if (!localStorage.getItem('installDismissed')) {
      installBanner.classList.add('show')
    }
  }, 3000)
})

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return

  // @ts-ignore - beforeinstallprompt event is not fully typed
  deferredPrompt.prompt()
  // @ts-ignore
  const { outcome } = await deferredPrompt.userChoice

  if (outcome === 'accepted') {
    installBanner.classList.remove('show')
  }
  deferredPrompt = null
})

installClose.addEventListener('click', () => {
  installBanner.classList.remove('show')
  localStorage.setItem('installDismissed', 'true')
})

// Initial render
renderProducts()

// History Management
let savedSessions: Session[] = JSON.parse(localStorage.getItem('savedSessions') || '[]')
const historyList = document.getElementById('historyList') as HTMLDivElement
const saveSessionBtn = document.getElementById('saveSessionBtn') as HTMLButtonElement
const saveModal = document.getElementById('saveModal') as HTMLDivElement
const sessionNameInput = document.getElementById('sessionNameInput') as HTMLInputElement
const modalCancel = document.getElementById('modalCancel') as HTMLButtonElement
const modalConfirm = document.getElementById('modalConfirm') as HTMLButtonElement

function renderHistory(): void {
  if (savedSessions.length === 0) {
    historyList.innerHTML = '<div class="history-empty">Сохранённых сравнений пока нет</div>'
    return
  }

  historyList.innerHTML = savedSessions
    .map((session, index) => {
      const date = new Date(session.savedAt)
      const dateStr = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })

      const bestPrice = session.products.reduce<Product | null>(
        (best, p) => (p.pricePerUnit < (best?.pricePerUnit ?? Infinity) ? p : best),
        null
      )

      return `
        <div class="history-card" data-index="${index}">
          <div class="history-card-header">
            <div class="history-card-name">${escapeHtml(session.name)}</div>
            <div class="history-card-date">${dateStr}</div>
          </div>
          <div class="history-card-info">
            <span>📦 ${session.products.length} товаров</span>
            ${bestPrice ? `<span>🏆 от ${formatPrice(bestPrice.pricePerUnit)} ₽/${bestPrice.unit}</span>` : ''}
          </div>
          <div class="history-card-actions">
            <button class="history-action-btn load-btn" data-index="${index}">Загрузить</button>
            <button class="history-action-btn danger delete-history-btn" data-index="${index}">Удалить</button>
          </div>
        </div>
      `
    })
    .join('')

  // Add event listeners
  document.querySelectorAll<HTMLButtonElement>('.load-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      loadSession(parseInt(btn.dataset.index || '0'))
    })
  })

  document.querySelectorAll<HTMLButtonElement>('.delete-history-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      deleteSession(parseInt(btn.dataset.index || '0'))
    })
  })
}

function loadSession(index: number): void {
  const session = savedSessions[index]
  if (!session) return

  const doLoad = () => {
    products = [...session.products]
    let nextId = Date.now()
    products = products.map((p) => ({ ...p, id: ++nextId, addedAt: nextId }))
    saveProducts()
    renderProducts()

    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })

    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  if (products.length > 0) {
    showConfirm(
      'Загрузить сравнение?',
      `Загрузить «${session.name}»? Текущее сравнение будет заменено.`,
      doLoad,
      'Загрузить',
      false
    )
  } else {
    doLoad()
  }
}

function deleteSession(index: number): void {
  const session = savedSessions[index]
  if (!session) return

  showConfirm(
    'Удалить из истории?',
    `Удалить «${session.name}»? Это действие можно отменить в течение 3 секунд.`,
    () => {
      const backup = { ...session }
      savedSessions.splice(index, 1)
      localStorage.setItem('savedSessions', JSON.stringify(savedSessions))
      renderHistory()

      if (navigator.vibrate) {
        navigator.vibrate([10, 50, 10])
      }

      showUndoToast(`«${session.name}» удалён`, () => {
        savedSessions.splice(index, 0, backup)
        localStorage.setItem('savedSessions', JSON.stringify(savedSessions))
        renderHistory()
      })
    }
  )
}

// Простой toast без undo
function showInfoToast(message: string): void {
  const container = document.getElementById('toastContainer') as HTMLDivElement
  const toastId = Date.now()

  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.dataset.id = toastId.toString()
  toast.innerHTML = `
    <div class="toast-content">
      <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
      <span class="toast-text">${message}</span>
    </div>
  `

  container.appendChild(toast)

  setTimeout(() => removeToast(toastId), 2500)
}

// Error toast для ошибок валидации
function showError(message: string, inputField: HTMLInputElement | null = null): void {
  // Подсветка проблемного поля
  if (inputField) {
    inputField.classList.add('input-error')
    // Убираем подсветку при вводе
    const removeHighlight = () => {
      inputField.classList.remove('input-error')
      inputField.removeEventListener('input', removeHighlight)
    }
    inputField.addEventListener('input', removeHighlight)
  }

  const container = document.getElementById('toastContainer') as HTMLDivElement
  const toastId = Date.now()

  const toast = document.createElement('div')
  toast.className = 'toast toast-error'
  toast.dataset.id = toastId.toString()
  toast.innerHTML = `
    <div class="toast-content">
      <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span class="toast-text">${message}</span>
    </div>
  `

  container.appendChild(toast)

  setTimeout(() => removeToast(toastId), 3000)
}

function showSaveModal(): void {
  if (products.length === 0) {
    showInfoToast('Сначала добавьте товары для сравнения')
    return
  }

  sessionNameInput.value = ''
  saveModal.classList.add('show')
  setTimeout(() => sessionNameInput.focus(), 100)
}

function hideSaveModal(): void {
  saveModal.classList.remove('show')
}

function saveSession(): void {
  const name = sessionNameInput.value.trim() || `Сравнение ${savedSessions.length + 1}`

  const session: Session = {
    name,
    products: [...products],
    savedAt: Date.now()
  }

  savedSessions.unshift(session)

  // Keep only last 20 sessions
  if (savedSessions.length > 20) {
    savedSessions = savedSessions.slice(0, 20)
  }

  localStorage.setItem('savedSessions', JSON.stringify(savedSessions))
  renderHistory()
  hideSaveModal()

  if (navigator.vibrate) {
    navigator.vibrate(10)
  }
}

saveSessionBtn.addEventListener('click', showSaveModal)
modalCancel.addEventListener('click', hideSaveModal)
modalConfirm.addEventListener('click', saveSession)

saveModal.addEventListener('click', (e) => {
  if (e.target === saveModal) hideSaveModal()
})

sessionNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveSession()
})

// Initial history render
renderHistory()
