import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

global.localStorage = localStorageMock as any

// Мок для функций из main.ts
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

interface Session {
  name: string
  products: Product[]
  savedAt: number
}

// Тестируемая логика из main.ts
function saveProducts(products: Product[], showInfoToast: (msg: string) => void): void {
  try {
    localStorage.setItem('products', JSON.stringify(products))
  } catch (e) {
    showInfoToast('Недостаточно места в хранилище. Попробуйте удалить старые сравнения.')
  }
}

function saveSession(
  sessions: Session[],
  newSession: Session,
  showConfirm: (title: string, text: string, onConfirm: () => void, btnText: string, isDanger: boolean) => void,
  showInfoToast: (msg: string) => void,
  maxSessions: number = 200
): Session[] {
  sessions.unshift(newSession)

  // Keep only last maxSessions sessions
  if (sessions.length > maxSessions) {
    sessions = sessions.slice(0, maxSessions)
  }

  // Проверяем, хватает ли места в localStorage
  try {
    const data = JSON.stringify(sessions)
    localStorage.setItem('savedSessions', data)
    return sessions
  } catch (e) {
    // Если места нет - удаляем самые старые сессии
    const sessionsToRemove = Math.min(20, sessions.length - 1)
    sessions.splice(sessions.length - sessionsToRemove, sessionsToRemove)

    try {
      localStorage.setItem('savedSessions', JSON.stringify(sessions))

      // Показываем сообщение о том, что старые сессии были удалены
      showConfirm(
        'Хранилище заполнено',
        `Для сохранения нового сравнения было удалено ${sessionsToRemove} старых. Хотите открыть историю и удалить больше?`,
        () => {},
        'Открыть историю',
        false
      )
    } catch (e2) {
      // Если всё ещё не хватает места - удаляем ещё больше
      sessions.splice(0, sessions.length - 50)
      localStorage.setItem('savedSessions', JSON.stringify(sessions))

      showInfoToast('Недостаточно места. Удалено много старых сессий.')
    }

    return sessions
  }
}

describe('Storage — сохранение товаров', () => {
  let mockToast = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockToast = vi.fn()
  })

  it('должен сохранять товары в localStorage', () => {
    const products: Product[] = [
      {
        id: 1,
        name: 'Молоко',
        originalPrice: 100,
        originalQuantity: 1000,
        unit: 'г',
        largeUnit: 'кг',
        factor: 1000,
        pricePerUnit: 0.1,
        pricePerLarge: 100,
        addedAt: Date.now(),
      },
    ]

    saveProducts(products, mockToast)

    expect(localStorage.setItem).toHaveBeenCalledWith('products', JSON.stringify(products))
    expect(mockToast).not.toHaveBeenCalled()
  })

  it('должен показывать toast при ошибке localStorage', () => {
    localStorageMock.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError')
    })

    const products: Product[] = [{ id: 1, name: 'Товар', originalPrice: 100, originalQuantity: 100, unit: 'г', largeUnit: 'кг', factor: 1000, pricePerUnit: 1, pricePerLarge: 1000, addedAt: Date.now() }]

    saveProducts(products, mockToast)

    expect(mockToast).toHaveBeenCalledWith('Недостаточно места в хранилище. Попробуйте удалить старые сравнения.')
  })
})

describe('Storage — сохранение сессий', () => {
  let mockConfirm = vi.fn()
  let mockToast = vi.fn()
  let sessions: Session[] = []

  const newSession: Session = {
    name: 'Тестовая сессия',
    products: [{ id: 1, name: 'Товар', originalPrice: 100, originalQuantity: 100, unit: 'г', largeUnit: 'кг', factor: 1000, pricePerUnit: 1, pricePerLarge: 1000, addedAt: Date.now() }],
    savedAt: Date.now(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm = vi.fn()
    mockToast = vi.fn()
    sessions = []
    localStorageMock.setItem = vi.fn()
  })

  it('должен сохранять новую сессию', () => {
    const result = saveSession(sessions, newSession, mockConfirm, mockToast)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(newSession)
    expect(localStorage.setItem).toHaveBeenCalled()
    expect(mockConfirm).not.toHaveBeenCalled()
    expect(mockToast).not.toHaveBeenCalled()
  })

  it('должен ограничивать количество сессий до 200', () => {
    // Заполняем 201 сессию
    for (let i = 0; i < 201; i++) {
      sessions.push({ ...newSession, name: `Сессия ${i}`, savedAt: Date.now() + i })
    }

    const result = saveSession(sessions, { ...newSession, name: 'Новая', savedAt: Date.now() + 999 }, mockConfirm, mockToast)

    // Должно остаться не более 200
    expect(result.length).toBeLessThanOrEqual(200)
  })

  it('должен удалять 20 старых сессий при переполнении', () => {
    // Создаём 50 сессий
    for (let i = 0; i < 50; i++) {
      sessions.push({ ...newSession, name: `Сессия ${i}`, savedAt: Date.now() + i })
    }

    // Мокаем ошибку при первой попытке
    let attempts = 0
    localStorageMock.setItem = vi.fn(() => {
      attempts++
      if (attempts === 1) {
        throw new Error('QuotaExceededError')
      }
    })

    const result = saveSession(sessions, { ...newSession, name: 'Новая', savedAt: Date.now() + 999 }, mockConfirm, mockToast)

    // Должно удалиться 20 сессий (51 - 20 = 31)
    expect(result).toHaveLength(31)
    expect(mockConfirm).toHaveBeenCalledWith(
      'Хранилище заполнено',
      expect.stringContaining('удалено 20 старых'),
      expect.any(Function),
      'Открыть историю',
      false
    )
  })

  it('должен удалять почти все сессии при критическом переполнении', () => {
    // Создаём 100 сессий
    for (let i = 0; i < 100; i++) {
      sessions.push({ ...newSession, name: `Сессия ${i}`, savedAt: Date.now() + i })
    }

    // Мокаем: первая попытка падает, вторая (после удаления 20) тоже падает
    let attempts = 0
    localStorageMock.setItem = vi.fn(() => {
      attempts++
      if (attempts <= 2) {
        throw new Error('QuotaExceededError')
      }
    })

    const result = saveSession(sessions, { ...newSession, name: 'Новая', savedAt: Date.now() + 999 }, mockConfirm, mockToast)

    // Должно остаться 50 сессий
    expect(result).toHaveLength(50)
    expect(mockToast).toHaveBeenCalledWith('Недостаточно места. Удалено много старых сессий.')
  })

  it('не должен удалять сессии если осталась только одна', () => {
    sessions = [{ ...newSession }]

    // Мокаем: первая попытка падает, вторая - успешна
    let attempts = 0
    localStorageMock.setItem = vi.fn(() => {
      attempts++
      if (attempts === 1) {
        throw new Error('QuotaExceededError')
      }
    })

    const result = saveSession(sessions, { ...newSession, name: 'Новая', savedAt: Date.now() + 999 }, mockConfirm, mockToast)

    // sessionsToRemove = Math.min(20, sessions.length - 1) = Math.min(20, 1) = 1
    // После splice останется 1 сессия (новая)
    expect(result).toHaveLength(1)
  })
})
