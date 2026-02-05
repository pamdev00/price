import { describe, it, expect, beforeEach } from "vitest";
import { ProductManager } from "../components/product";
import type { Product } from "../constants";

describe("ProductManager — редактирование", () => {
  let productManager: ProductManager;
  let testProduct: Product;

  beforeEach(() => {
    productManager = new ProductManager([]);
    testProduct = {
      id: 1,
      name: "Товар",
      originalPrice: 100,
      originalQuantity: 1000,
      unit: "г",
      largeUnit: "кг",
      factor: 1000,
      pricePerUnit: 0.1,
      pricePerLarge: 100,
      addedAt: Date.now(),
    };
    productManager["products"] = [testProduct];
  });

  it("должен обновлять название товара", () => {
    productManager.editProduct(1, { name: "Новое название" });
    const products = productManager.getProducts();
    expect(products[0].name).toBe("Новое название");
  });

  it("должен обновлять цену товара", () => {
    productManager.editProduct(1, { originalPrice: 200 });
    const products = productManager.getProducts();
    expect(products[0].originalPrice).toBe(200);
    expect(products[0].pricePerUnit).toBe(0.2);
    expect(products[0].pricePerLarge).toBe(200);
  });

  it("должен обновлять количество товара", () => {
    productManager.editProduct(1, { originalQuantity: 2000 });
    const products = productManager.getProducts();
    expect(products[0].originalQuantity).toBe(2000);
    expect(products[0].pricePerUnit).toBe(0.05);
    expect(products[0].pricePerLarge).toBe(50);
  });

  it("должен возвращать false для несуществующего товара", () => {
    const result = productManager.editProduct(999, { name: "Тест" });
    expect(result).toBe(false);
  });

  it("должен пересчитывать цену за единицу", () => {
    productManager.editProduct(1, { originalPrice: 300, originalQuantity: 1500 });
    const products = productManager.getProducts();
    expect(products[0].pricePerUnit).toBe(0.2);
    expect(products[0].pricePerLarge).toBe(200);
  });

  it("должен обновлять единицу измерения", () => {
    productManager.editProduct(1, { unit: "мл", largeUnit: "л", factor: 1000 });
    const products = productManager.getProducts();
    expect(products[0].unit).toBe("мл");
    expect(products[0].largeUnit).toBe("л");
    expect(products[0].factor).toBe(1000);
  });

  it("должен пересчитывать цену за большую единицу при изменении factor", () => {
    productManager.editProduct(1, { factor: 100 });
    const products = productManager.getProducts();
    // pricePerUnit = 100 / 1000 = 0.1 (не меняется)
    expect(products[0].pricePerUnit).toBe(0.1);
    // pricePerLarge = 0.1 * 100 = 10 (было 100)
    expect(products[0].pricePerLarge).toBe(10);
  });

  it("должен обновлять все поля включая единицу измерения", () => {
    productManager.editProduct(1, {
      name: "Новое название",
      originalPrice: 200,
      originalQuantity: 500,
      unit: "шт",
      largeUnit: "100 шт",
      factor: 100,
    });
    const products = productManager.getProducts();
    expect(products[0].name).toBe("Новое название");
    expect(products[0].originalPrice).toBe(200);
    expect(products[0].originalQuantity).toBe(500);
    expect(products[0].unit).toBe("шт");
    expect(products[0].largeUnit).toBe("100 шт");
    expect(products[0].factor).toBe(100);
    // Пересчёт: 200 / 500 = 0.4 за шт, 0.4 * 100 = 40 за 100 шт
    expect(products[0].pricePerUnit).toBe(0.4);
    expect(products[0].pricePerLarge).toBe(40);
  });
});
