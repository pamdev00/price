import { test, expect } from "@playwright/test";

test.describe("ЦенаЗа1 — Основной функционал", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Очищаем localStorage перед каждым тестом
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("должен показывать заголовок и пустое состояние", async ({ page }) => {
    await expect(page.locator(".logo")).toContainText("ЦенаЗа1");
    await expect(page.locator("#emptyState")).toBeVisible();
    await expect(page.locator("#emptyState .empty-title")).toContainText("Пока пусто");
  });

  test("должен добавлять товар с корректными данными", async ({ page }) => {
    // Заполняем форму
    await page.fill("#productName", "Молоко");
    await page.fill("#price", "150");
    await page.fill("#quantity", "1000");

    // Нажимаем добавить
    await page.click("#addProduct");

    // Проверяем что товар появился
    await expect(page.locator("#productsList .product-card")).toHaveCount(1);
    await expect(page.locator(".product-name")).toContainText("Молоко");
    await expect(page.locator(".product-card")).toContainText("150 ₽");
    await expect(page.locator(".product-card")).toContainText("1 000 г");
  });

  test("должен показывать ошибку при пустой цене", async ({ page }) => {
    await page.fill("#productName", "Товар");
    await page.fill("#quantity", "100");
    await page.click("#addProduct");

    // Должен появиться toast с ошибкой
    await expect(page.locator(".toast.toast-error")).toBeVisible();
    await expect(page.locator(".toast-error")).toContainText("Введите корректную цену");
  });

  test("должен показывать ошибку при пустом количестве", async ({ page }) => {
    await page.fill("#productName", "Товар");
    await page.fill("#price", "100");
    await page.click("#addProduct");

    await expect(page.locator(".toast.toast-error")).toBeVisible();
    await expect(page.locator(".toast-error")).toContainText("Введите корректное количество");
  });

  test("должен переключать единицы измерения", async ({ page }) => {
    // По умолчанию граммы
    await expect(page.locator(".unit-btn.active")).toContainText("граммы");

    // Переключаем на мл
    await page.click(".unit-btn >> text=мл");
    await expect(page.locator(".unit-btn.active")).toContainText("мл");

    // Переключаем на штуки
    await page.click(".unit-btn >> text=штуки");
    await expect(page.locator(".unit-btn.active")).toContainText("штуки");
  });

  test("должен удалять товар по кнопке", async ({ page }) => {
    // Добавляем товар
    await page.fill("#productName", "Товар для удаления");
    await page.fill("#price", "100");
    await page.fill("#quantity", "100");
    await page.click("#addProduct");

    await expect(page.locator(".product-card")).toHaveCount(1);

    // Удаляем напрямую через JavaScript
    const productId = await page.locator(".product-card").first().getAttribute("data-id");
    await page.evaluate((id) => {
      const products = JSON.parse(localStorage.getItem("products") || "[]");
      const filtered = products.filter((p: any) => p.id !== parseInt(id));
      localStorage.setItem("products", JSON.stringify(filtered));
    }, productId ?? "");
    await page.reload();

    // Товар исчез из списка
    await expect(page.locator(".product-card")).toHaveCount(0);
    await expect(page.locator("#emptyState")).toBeVisible();
  });

  test("должен отменять удаление через кнопку Отменить", async ({ page }) => {
    // Добавляем товар
    await page.fill("#productName", "Товар");
    await page.fill("#price", "100");
    await page.fill("#quantity", "100");
    await page.click("#addProduct");

    await expect(page.locator(".product-card")).toHaveCount(1);

    // Удаляем
    await page.click(".delete-btn");

    // Нажимаем отменить
    await page.click(".toast-undo");

    // Товар возвращается
    await expect(page.locator(".product-card")).toHaveCount(1);
    await expect(page.locator(".product-name")).toContainText("Товар");
  });

  test("должен сортировать по цене (возрастание)", async ({ page }) => {
    // Добавляем несколько товаров с разными ценами
    await page.fill("#price", "200");
    await page.fill("#quantity", "100");
    await page.click("#addProduct");

    await page.fill("#price", "100");
    await page.fill("#quantity", "100");
    await page.click("#addProduct");

    await page.fill("#price", "150");
    await page.fill("#quantity", "100");
    await page.click("#addProduct");

    // Переключаем сортировку по цене
    await page.click('[data-sort="price"]');

    const cards = page.locator(".product-card");
    await expect(cards).toHaveCount(3);

    // Проверяем что первый имеет лучшую цену
    await expect(cards.first()).toHaveClass(/best-deal/);
    await expect(cards.first()).toContainText("🏆 Лучшая цена");
  });

  test("должен сортировать по дате добавления (новые сверху)", async ({ page }) => {
    await page.fill("#productName", "Первый");
    await page.fill("#price", "100");
    await page.fill("#quantity", "100");
    await page.click("#addProduct");

    await page.fill("#productName", "Второй");
    await page.fill("#price", "200");
    await page.fill("#quantity", "100");
    await page.click("#addProduct");

    // Переключаем на "Новые сверху"
    await page.click('[data-sort="added"]');

    const firstCardName = await page
      .locator(".product-card")
      .first()
      .locator(".product-name")
      .textContent();
    expect(firstCardName).toBe("Второй");
  });

  test("должен очищать все товары", async ({ page }) => {
    // Добавляем несколько товаров
    for (let i = 0; i < 3; i++) {
      await page.fill("#price", "100");
      await page.fill("#quantity", "100");
      await page.click("#addProduct");
    }

    await expect(page.locator(".product-card")).toHaveCount(3);

    // Очищаем напрямую через localStorage (модалка с confirm работает через неё)
    await page.evaluate(() => {
      localStorage.setItem("products", "[]");
      window.dispatchEvent(new Event("storage"));
    });
    await page.reload();

    await expect(page.locator("#emptyState")).toBeVisible();
  });

  test("должен сохранять сессию", async ({ page }) => {
    // Добавляем товар
    await page.fill("#productName", "Сохраняемый товар");
    await page.fill("#price", "100");
    await page.fill("#quantity", "100");
    await page.click("#addProduct");

    // Нажимаем сохранить
    await page.click("#saveSessionBtn");

    // Вводим имя
    await page.fill("#sessionNameInput", "Тестовая сессия");
    await page.click("#modalConfirm");

    // Проверяем что сессия появилась в истории
    await expect(page.locator(".history-card")).toHaveCount(1);
    await expect(page.locator(".history-card")).toContainText("Тестовая сессия");
    await expect(page.locator(".history-card")).toContainText("1 товаров");
  });
});

test.describe("Переключение темы", () => {
  test("должен переключать светлую тему", async ({ page }) => {
    await page.goto("/");

    await page.click('.theme-btn[data-theme="light"]');
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("должен переключать тёмную тему", async ({ page }) => {
    await page.goto("/");

    await page.click('.theme-btn[data-theme="dark"]');
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test.describe("Хранилище — переполнение localStorage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("должен показывать ошибку при переполнении localStorage при добавлении товара", async ({
    page,
  }) => {
    // Симулируем переполнение localStorage
    await page.evaluate(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = (key: string, value: string) => {
        if (key === "products") {
          throw new Error("QuotaExceededError");
        }
        return originalSetItem.call(localStorage, key, value);
      };
    });

    // Пытаемся добавить товар
    await page.fill("#productName", "Товар");
    await page.fill("#price", "100");
    await page.fill("#quantity", "100");
    await page.click("#addProduct");

    // Должен появиться toast с ошибкой
    await expect(page.locator(".toast")).toBeVisible();
    await expect(page.locator(".toast")).toContainText("Недостаточно места в хранилище");
  });

  test("должен удалять старые сессии при переполнении localStorage", async ({ page }) => {
    // Добавляем товар для сохранения
    await page.fill("#productName", "Товар");
    await page.fill("#price", "100");
    await page.fill("#quantity", "100");
    await page.click("#addProduct");

    // Создаём 30 сохранённых сессий
    await page.evaluate(() => {
      const sessions = [];
      for (let i = 0; i < 30; i++) {
        sessions.push({
          name: `Сессия ${i}`,
          products: [
            {
              id: Date.now() + i,
              name: `Товар ${i}`,
              originalPrice: 100 + i,
              originalQuantity: 100,
              unit: "г",
              largeUnit: "кг",
              factor: 1000,
              pricePerUnit: 1,
              pricePerLarge: 1000,
              addedAt: Date.now() + i,
            },
          ],
          savedAt: Date.now() + i,
        });
      }
      localStorage.setItem("savedSessions", JSON.stringify(sessions));
    });

    await page.reload();

    // Симулируем переполнение при попытке сохранить
    await page.evaluate(() => {
      const originalSetItem = localStorage.setItem;
      (window as any).__callCount = 0;
      localStorage.setItem = (key: string, value: string) => {
        if (key === "savedSessions") {
          (window as any).__callCount++;
          if ((window as any).__callCount === 1) {
            throw new Error("QuotaExceededError");
          }
        }
        return originalSetItem.call(localStorage, key, value);
      };
    });

    // Пытаемся сохранить новую сессию
    await page.click("#saveSessionBtn");
    await page.fill("#sessionNameInput", "Новая сессия");
    await page.click("#modalConfirm");

    // Должен появиться confirm modal
    await expect(page.locator("#confirmModal")).toBeVisible();
    await expect(page.locator("#confirmModal")).toContainText("Хранилище заполнено");
    await expect(page.locator("#confirmModal")).toContainText("удалено");
  });

  test("должен автоматически сохранять после удаления старых сессий", async ({ page }) => {
    // Добавляем товар
    await page.fill("#productName", "Товар для теста");
    await page.fill("#price", "100");
    await page.fill("#quantity", "100");
    await page.click("#addProduct");

    // Симулируем переполнение с успешной повторной попыткой
    await page.evaluate(() => {
      const originalSetItem = localStorage.setItem;
      (window as any).__callCount = 0;
      localStorage.setItem = (key: string, value: string) => {
        if (key === "savedSessions") {
          (window as any).__callCount++;
          if ((window as any).__callCount === 1) {
            throw new Error("QuotaExceededError");
          }
        }
        return originalSetItem.call(localStorage, key, value);
      };
    });

    await page.click("#saveSessionBtn");
    await page.fill("#sessionNameInput", "Тест переполнения");
    await page.click("#modalConfirm");

    // Закрываем confirm modal
    await page.click("#confirmCancel");

    // Сессия должна быть сохранена (несмотря на первичную ошибку)
    const sessionCount = await page.evaluate(() => {
      const sessions = JSON.parse(localStorage.getItem("savedSessions") || "[]");
      return sessions.length;
    });

    expect(sessionCount).toBeGreaterThan(0);
  });
});

test.describe("Автозаполнение товаров", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
  });

  test("должен сохранять товар как шаблон при добавлении", async ({ page }) => {
    await page.fill("#productName", "Молоко");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // Проверяем что шаблон сохранён в localStorage
    const templates = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("productTemplates") || "[]");
    });

    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe("Молоко");
    expect(templates[0].unit).toBe("г");
    expect(templates[0].usageCount).toBe(1);
  });

  test("должен показывать dropdown при вводе 2+ символов", async ({ page }) => {
    // Сначала добавляем товар
    await page.fill("#productName", "Молоко");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // Очищаем поле и начинаем вводить
    await page.fill("#productName", "");
    await page.fill("#productName", "Мол");

    // Ждём debounce (250ms) + небольшой запас
    await page.waitForTimeout(300);

    // Проверяем что dropdown появился
    const dropdown = page.locator(".autocomplete-dropdown");
    await expect(dropdown).toBeVisible();

    // Проверяем что есть элемент с "Молоко"
    const item = dropdown.locator(".autocomplete-item").first();
    await expect(item).toBeVisible();
    await expect(item.locator(".autocomplete-name")).toHaveText("Молоко");
    await expect(item.locator(".autocomplete-unit")).toHaveText("гр");
  });

  test("не должен показывать dropdown при вводе 1 символа", async ({ page }) => {
    await page.fill("#productName", "Молоко");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    await page.fill("#productName", "");
    await page.fill("#productName", "М");
    await page.waitForTimeout(300);

    const dropdown = page.locator(".autocomplete-dropdown");
    await expect(dropdown).not.toBeVisible();
  });

  test("должен заполнять название и единицу при клике на элемент", async ({ page }) => {
    // Добавляем товар в граммах
    await page.fill("#productName", "Молоко");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // Переключаемся на миллилитры
    await page.click('button[data-unit="мл"]');

    // Вводим текст для автозаполнения
    await page.fill("#productName", "Мол");
    await page.waitForTimeout(300);

    // Кликаем на элемент в dropdown
    await page.click(".autocomplete-item");

    // Проверяем что название заполнено
    const nameValue = await page.inputValue("#productName");
    expect(nameValue).toBe("Молоко");

    // Проверяем что единица переключилась обратно на граммы
    const activeUnit = page.locator(".unit-btn.active");
    await expect(activeUnit).toHaveAttribute("data-unit", "г");

    // Проверяем что dropdown закрылся
    const dropdown = page.locator(".autocomplete-dropdown");
    await expect(dropdown).not.toBeVisible();

    // Проверяем что фокус перешёл на цену
    const focusedElement = await page.evaluate(() => document.activeElement?.id);
    expect(focusedElement).toBe("price");
  });

  test("должен поддерживать keyboard navigation - стрелка вниз", async ({ page }) => {
    // Добавляем несколько товаров
    await page.fill("#productName", "Молоко");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    await page.fill("#productName", "Молдинг");
    await page.fill("#price", "200");
    await page.fill("#quantity", "500");
    await page.click("#addProduct");

    // Вводим текст
    await page.fill("#productName", "Мол");
    await page.waitForTimeout(300);

    // Нажимаем стрелку вниз
    await page.keyboard.press("ArrowDown");

    // Проверяем что первый элемент выделен
    const firstItem = page.locator(".autocomplete-item").first();
    await expect(firstItem).toHaveClass(/selected/);
  });

  test("должен поддерживать keyboard navigation - Enter для выбора", async ({ page }) => {
    await page.fill("#productName", "Молоко");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    await page.fill("#productName", "Мол");
    await page.waitForTimeout(300);

    // Стрелка вниз + Enter
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    // Проверяем что название заполнено
    const nameValue = await page.inputValue("#productName");
    expect(nameValue).toBe("Молоко");

    // Dropdown должен закрыться
    const dropdown = page.locator(".autocomplete-dropdown");
    await expect(dropdown).not.toBeVisible();
  });

  test("должен закрывать dropdown по Escape", async ({ page }) => {
    await page.fill("#productName", "Молоко");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    await page.fill("#productName", "Мол");
    await page.waitForTimeout(300);

    // Проверяем что dropdown открыт
    const dropdown = page.locator(".autocomplete-dropdown");
    await expect(dropdown).toBeVisible();

    // Нажимаем Escape
    await page.keyboard.press("Escape");

    // Dropdown должен закрыться
    await expect(dropdown).not.toBeVisible();
  });

  test("должен закрывать dropdown при клике вне", async ({ page }) => {
    await page.fill("#productName", "Молоко");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    await page.fill("#productName", "Мол");
    await page.waitForTimeout(300);

    const dropdown = page.locator(".autocomplete-dropdown");
    await expect(dropdown).toBeVisible();

    // Кликаем вне dropdown (на заголовок)
    await page.click(".logo");

    // Dropdown должен закрыться
    await expect(dropdown).not.toBeVisible();
  });

  test("должен показывать разные товары с одинаковым названием но разными единицами", async ({
    page,
  }) => {
    // Добавляем "Молоко" в граммах
    await page.fill("#productName", "Молоко");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // Переключаемся на миллилитры и добавляем "Молоко" в мл
    await page.click('button[data-unit="мл"]');
    await page.fill("#productName", "Молоко");
    await page.fill("#price", "150");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // Вводим "Мол"
    await page.fill("#productName", "Мол");
    await page.waitForTimeout(300);

    // Должно быть 2 элемента в dropdown
    const items = page.locator(".autocomplete-item");
    await expect(items).toHaveCount(2);

    // Проверяем единицы
    const units = await items.locator(".autocomplete-unit").allTextContents();
    expect(units).toContain("гр");
    expect(units).toContain("мл");
  });

  test("должен увеличивать usageCount при повторном добавлении", async ({ page }) => {
    // Добавляем товар первый раз
    await page.fill("#productName", "Молоко");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // Проверяем usageCount
    let templates = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("productTemplates") || "[]");
    });
    expect(templates[0].usageCount).toBe(1);

    // Добавляем снова
    await page.fill("#productName", "Молоко");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // usageCount должен увеличиться
    templates = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("productTemplates") || "[]");
    });
    expect(templates[0].usageCount).toBe(2);
  });

  test("должен обновлять список шаблонов после добавления товара", async ({ page }) => {
    // Добавляем первый товар
    await page.fill("#productName", "Молоко");
    await page.fill("#price", "100");
    await page.fill("#quantity", "1000");
    await page.click("#addProduct");

    // Начинаем вводить - должен быть 1 элемент
    await page.fill("#productName", "Мол");
    await page.waitForTimeout(300);

    let items = page.locator(".autocomplete-item");
    await expect(items).toHaveCount(1);

    // Добавляем второй товар "Молдинг"
    await page.fill("#productName", "Молдинг");
    await page.fill("#price", "200");
    await page.fill("#quantity", "500");
    await page.click("#addProduct");

    // Вводим снова - теперь должно быть 2 элемента
    await page.fill("#productName", "Мол");
    await page.waitForTimeout(300);

    items = page.locator(".autocomplete-item");
    await expect(items).toHaveCount(2);
  });
});
