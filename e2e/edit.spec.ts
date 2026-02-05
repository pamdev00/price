import { test, expect } from "@playwright/test";

test.describe("Редактирование товаров", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Отключаем tutorial, чтобы он не блокировал клики
    await page.evaluate(() => localStorage.setItem("tutorialSeen", "true"));
    await page.reload();
    // Сбрасываем выбор единицы измерения на "граммы"
    await page.locator(".unit-btn").nth(0).click();
  });

  test("должен открывать модалку при клике на карточку", async ({ page }) => {
    // Добавляем товар
    await page.fill("#productName", "Товар");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // Кликаем на карточку
    await page.click(".product-card");

    // Проверяем, что модалка открыта
    await expect(page.locator("#editModal")).toBeVisible();
    await expect(page.locator("#editProductName")).toHaveValue("Товар");
    await expect(page.locator("#editPrice")).toHaveValue("100");
    await expect(page.locator("#editQuantity")).toHaveValue("1000");
  });

  test("не должен открывать модалку при клике на кнопку удаления", async ({ page }) => {
    // Добавляем товар
    await page.fill("#productName", "Товар");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // Кликаем на кнопку удаления
    await page.click(".delete-btn");

    // Проверяем, что модалка не открыта
    await expect(page.locator("#editModal")).not.toBeVisible();
  });

  test("должен редактировать товар", async ({ page }) => {
    // Добавляем товар
    await page.fill("#productName", "Товар");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // Открываем редактирование
    await page.click(".product-card");

    // Изменяем название
    await page.fill("#editProductName", "Товар 2");

    // Сохраняем
    await page.click("#editSave");

    // Проверяем, что название обновилось
    await expect(page.locator(".product-name")).toHaveText("Товар 2");
  });

  test("должен показывать ошибку при невалидной цене", async ({ page }) => {
    // Добавляем товар
    await page.fill("#productName", "Товар");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // Открываем редактирование
    await page.click(".product-card");

    // Вводим некорректную цену
    await page.fill("#editPrice", "-50");

    // Сохраняем
    await page.click("#editSave");

    // Проверяем, что показан toast с ошибкой
    await expect(page.locator(".toast.toast-error")).toBeVisible();
  });

  test("должен обновлять информацию о лучшем товаре", async ({ page }) => {
    // Добавляем три товара
    await page.fill("#productName", "Дорогой");
    await page.fill("#price", "300");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    await page.fill("#productName", "Средний");
    await page.fill("#price", "200");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    await page.fill("#productName", "Дешёвый");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // При сортировке по цене дешёвый первый и отмечен как лучший
    await expect(page.locator(".product-card").first()).toHaveClass(/best-deal/);

    // Редактируем дешёвый товар, делаем его самым дорогим
    await page.locator(".product-card").first().click();
    await page.fill("#editPrice", "400");
    await page.click("#editSave");

    // Теперь товар "Средний" (200₽) отмечен как лучший
    const bestCard = page.locator(".product-card.best-deal");
    await expect(bestCard).toHaveCount(1);
    await expect(bestCard.locator(".product-name")).toHaveText("Средний");
  });

  test("должен показывать активную кнопку единицы измерения в модалке", async ({ page }) => {
    // Добавляем товар с единицей "граммы"
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // Открываем редактирование
    await page.click(".product-card");

    // Проверяем, что кнопка "граммы" активна
    const unitBtns = page.locator("#editModal .unit-btn");
    await expect(unitBtns.nth(0)).toHaveClass(/active/); // граммы
    await expect(unitBtns.nth(1)).not.toHaveClass(/active/); // мл
    await expect(unitBtns.nth(2)).not.toHaveClass(/active/); // штуки
  });

  test("должен переключать активную кнопку единицы измерения", async ({ page }) => {
    // Добавляем товар
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // Открываем редактирование
    await page.click(".product-card");

    // Проверяем, что кнопка "граммы" активна
    const unitBtns = page.locator("#editModal .unit-btn");
    await expect(unitBtns.nth(0)).toHaveClass(/active/);

    // Кликаем на кнопку "мл"
    await page.locator("#editModal .unit-btn").nth(1).click();

    // Проверяем, что кнопка "мл" стала активной
    await expect(unitBtns.nth(0)).not.toHaveClass(/active/); // граммы
    await expect(unitBtns.nth(1)).toHaveClass(/active/); // мл
    await expect(unitBtns.nth(2)).not.toHaveClass(/active/); // штуки

    // Сохраняем
    await page.click("#editSave");

    // Проверяем, что единица измерения обновилась в карточке
    await expect(page.locator(".product-original")).toContainText("мл");
  });

  test("должен сохранять новую единицу измерения", async ({ page }) => {
    // Добавляем товар в граммах
    await page.fill("#productName", "Молоко");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // Открываем редактирование
    await page.click(".product-card");

    // Меняем единицу на "штуки"
    await page.locator("#editModal .unit-btn").nth(2).click();

    // Сохраняем
    await page.click("#editSave");

    // Проверяем, что единица измерения обновилась в карточке
    await expect(page.locator(".product-original")).toContainText("шт");
    await expect(page.locator(".price-box").nth(1)).toContainText("100 шт");
  });

  test("должен пересчитывать цену за большую единицу при смене единицы измерения", async ({ page }) => {
    // Добавляем товар в граммах: 100₽ за 1000г = 0.1₽/г = 100₽/кг
    await page.fill("#productName", "Товар");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // Проверяем исходные цены (русская локаль - запятая)
    await expect(page.locator(".product-card").first()).toContainText("0,1");
    await expect(page.locator(".product-card").first()).toContainText("100");
    await expect(page.locator(".product-card").first()).toContainText("кг");

    // Открываем редактирование
    await page.click(".product-card");

    // Меняем единицу на "штуки" (factor = 100)
    await page.locator("#editModal .unit-btn").nth(2).click();

    // Сохраняем
    await page.click("#editSave");

    // Проверяем, что цена за 100 шт пересчиталась: 0.1₽/шт * 100 = 10₽ за 100 шт
    await expect(page.locator(".product-card").first()).toContainText("10");
    await expect(page.locator(".product-card").first()).toContainText("100 шт");
  });
});
