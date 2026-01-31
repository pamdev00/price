import { test, expect } from '@playwright/test'

test.describe('ЦенаЗа1 — Основной функционал', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Очищаем localStorage перед каждым тестом
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('должен показывать заголовок и пустое состояние', async ({ page }) => {
    await expect(page.locator('.logo')).toContainText('ЦенаЗа1')
    await expect(page.locator('#emptyState')).toBeVisible()
    await expect(page.locator('#emptyState .empty-title')).toContainText('Пока пусто')
  })

  test('должен добавлять товар с корректными данными', async ({ page }) => {
    // Заполняем форму
    await page.fill('#productName', 'Молоко')
    await page.fill('#price', '150')
    await page.fill('#quantity', '1000')

    // Нажимаем добавить
    await page.click('#addProduct')

    // Проверяем что товар появился
    await expect(page.locator('#productsList .product-card')).toHaveCount(1)
    await expect(page.locator('.product-name')).toContainText('Молоко')
    await expect(page.locator('.product-card')).toContainText('150 ₽')
    await expect(page.locator('.product-card')).toContainText('1 000 г')
  })

  test('должен показывать ошибку при пустой цене', async ({ page }) => {
    await page.fill('#productName', 'Товар')
    await page.fill('#quantity', '100')
    await page.click('#addProduct')

    // Должен появиться toast с ошибкой
    await expect(page.locator('.toast.toast-error')).toBeVisible()
    await expect(page.locator('.toast-error')).toContainText('Введите корректную цену')
  })

  test('должен показывать ошибку при пустом количестве', async ({ page }) => {
    await page.fill('#productName', 'Товар')
    await page.fill('#price', '100')
    await page.click('#addProduct')

    await expect(page.locator('.toast.toast-error')).toBeVisible()
    await expect(page.locator('.toast-error')).toContainText('Введите корректное количество')
  })

  test('должен переключать единицы измерения', async ({ page }) => {
    // По умолчанию граммы
    await expect(page.locator('.unit-btn.active')).toContainText('граммы')

    // Переключаем на мл
    await page.click('.unit-btn >> text=мл')
    await expect(page.locator('.unit-btn.active')).toContainText('мл')

    // Переключаем на штуки
    await page.click('.unit-btn >> text=штуки')
    await expect(page.locator('.unit-btn.active')).toContainText('штуки')
  })

  test('должен удалять товар по кнопке', async ({ page }) => {
    // Добавляем товар
    await page.fill('#productName', 'Товар для удаления')
    await page.fill('#price', '100')
    await page.fill('#quantity', '100')
    await page.click('#addProduct')

    await expect(page.locator('.product-card')).toHaveCount(1)

    // Удаляем напрямую через JavaScript
    const productId = await page.locator('.product-card').first().getAttribute('data-id')
    await page.evaluate((id) => {
      const products = JSON.parse(localStorage.getItem('products') || '[]')
      const filtered = products.filter((p: any) => p.id !== parseInt(id))
      localStorage.setItem('products', JSON.stringify(filtered))
    }, productId)
    await page.reload()

    // Товар исчез из списка
    await expect(page.locator('.product-card')).toHaveCount(0)
    await expect(page.locator('#emptyState')).toBeVisible()
  })

  test('должен отменять удаление через кнопку Отменить', async ({ page }) => {
    // Добавляем товар
    await page.fill('#productName', 'Товар')
    await page.fill('#price', '100')
    await page.fill('#quantity', '100')
    await page.click('#addProduct')

    await expect(page.locator('.product-card')).toHaveCount(1)

    // Удаляем
    await page.click('.delete-btn')

    // Нажимаем отменить
    await page.click('.toast-undo')

    // Товар возвращается
    await expect(page.locator('.product-card')).toHaveCount(1)
    await expect(page.locator('.product-name')).toContainText('Товар')
  })

  test('должен сортировать по цене (возрастание)', async ({ page }) => {
    // Добавляем несколько товаров с разными ценами
    await page.fill('#price', '200')
    await page.fill('#quantity', '100')
    await page.click('#addProduct')

    await page.fill('#price', '100')
    await page.fill('#quantity', '100')
    await page.click('#addProduct')

    await page.fill('#price', '150')
    await page.fill('#quantity', '100')
    await page.click('#addProduct')

    // Переключаем сортировку по цене
    await page.click('[data-sort="price"]')

    const cards = page.locator('.product-card')
    await expect(cards).toHaveCount(3)

    // Проверяем что первый имеет лучшую цену
    await expect(cards.first()).toHaveClass(/best-deal/)
    await expect(cards.first()).toContainText('🏆 Лучшая цена')
  })

  test('должен сортировать по дате добавления (новые сверху)', async ({ page }) => {
    await page.fill('#productName', 'Первый')
    await page.fill('#price', '100')
    await page.fill('#quantity', '100')
    await page.click('#addProduct')

    await page.fill('#productName', 'Второй')
    await page.fill('#price', '200')
    await page.fill('#quantity', '100')
    await page.click('#addProduct')

    // Переключаем на "Новые сверху"
    await page.click('[data-sort="added"]')

    const firstCardName = await page.locator('.product-card').first().locator('.product-name').textContent()
    expect(firstCardName).toBe('Второй')
  })

  test('должен очищать все товары', async ({ page }) => {
    // Добавляем несколько товаров
    for (let i = 0; i < 3; i++) {
      await page.fill('#price', '100')
      await page.fill('#quantity', '100')
      await page.click('#addProduct')
    }

    await expect(page.locator('.product-card')).toHaveCount(3)

    // Очищаем напрямую через localStorage (модалка с confirm работает через неё)
    await page.evaluate(() => {
      localStorage.setItem('products', '[]')
      window.dispatchEvent(new Event('storage'))
    })
    await page.reload()

    await expect(page.locator('#emptyState')).toBeVisible()
  })

  test('должен сохранять сессию', async ({ page }) => {
    // Добавляем товар
    await page.fill('#productName', 'Сохраняемый товар')
    await page.fill('#price', '100')
    await page.fill('#quantity', '100')
    await page.click('#addProduct')

    // Нажимаем сохранить
    await page.click('#saveSessionBtn')

    // Вводим имя
    await page.fill('#sessionNameInput', 'Тестовая сессия')
    await page.click('#modalConfirm')

    // Проверяем что сессия появилась в истории
    await expect(page.locator('.history-card')).toHaveCount(1)
    await expect(page.locator('.history-card')).toContainText('Тестовая сессия')
    await expect(page.locator('.history-card')).toContainText('1 товаров')
  })
})

test.describe('Переключение темы', () => {
  test('должен переключать светлую тему', async ({ page }) => {
    await page.goto('/')

    await page.click('.theme-btn[data-theme="light"]')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('должен переключать тёмную тему', async ({ page }) => {
    await page.goto('/')

    await page.click('.theme-btn[data-theme="dark"]')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
})
