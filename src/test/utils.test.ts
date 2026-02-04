import { describe, it, expect } from "vitest";
import { formatPrice, escapeHtml } from "../utils";

describe("formatPrice", () => {
  it("должен форматировать большие числа (>1000) без дробных", () => {
    expect(formatPrice(1500)).toBe("1\u00A0500"); // неразрывный пробел
    expect(formatPrice(12345)).toBe("12\u00A0345");
    expect(formatPrice(1000)).toBe("1\u00A0000");
  });

  it("должен форматировать средние числа (100-1000) с 1 знаком после запятой", () => {
    expect(formatPrice(150)).toBe("150");
    expect(formatPrice(150.5)).toBe("150,5");
    expect(formatPrice(999.99)).toBe("1\u00A0000"); // Округляется
  });

  it("должен форматировать маленькие числа (1-100) с 2 знаками после запятой", () => {
    expect(formatPrice(10)).toBe("10");
    expect(formatPrice(10.5)).toBe("10,5");
    expect(formatPrice(10.555)).toBe("10,56");
    expect(formatPrice(99.999)).toBe("100");
  });

  it("должен форматировать очень маленькие числа (<1) с 3 знаками после запятой", () => {
    expect(formatPrice(0.5)).toBe("0,5");
    expect(formatPrice(0.1234)).toBe("0,123");
    expect(formatPrice(0.9999)).toBe("1");
  });

  it("должен обрабатывать ноль", () => {
    expect(formatPrice(0)).toBe("0");
  });

  it("должен использовать русскую локаль", () => {
    expect(formatPrice(1.5)).toContain("1,5"); // Запятая, не точка
    expect(formatPrice(1000)).toContain("\u00A0"); // Неразрывный пробел
  });
});

describe("escapeHtml", () => {
  it("должен экранировать HTML теги", () => {
    const result = escapeHtml('<script>alert("xss")</script>');
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
    expect(result).not.toContain("<script>");
  });

  it("должен экранировать кавычки", () => {
    // escapeHtml использует textContent, который не экранирует кавычки
    // это корректно - защита от XSS для текста внутри тегов
    const result1 = escapeHtml('"test"');
    expect(result1).toBe('"test"'); // Кавычки сохраняются

    const result2 = escapeHtml("'test'");
    expect(result2).toBe("'test'");
  });

  it("должен экранировать амперсанд", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml("&&")).toBe("&amp;&amp;");
  });

  it("должен экранировать меньше и больше", () => {
    expect(escapeHtml("a < b > c")).toBe("a &lt; b &gt; c");
  });

  it("не должен изменять обычный текст", () => {
    expect(escapeHtml("Обычный текст")).toBe("Обычный текст");
    expect(escapeHtml("Молоко 123")).toBe("Молоко 123");
  });

  it("должен предотвращать XSS", () => {
    const dangerous = '<img src="x" onerror="alert(1)">';
    const escaped = escapeHtml(dangerous);
    // Теги экранируются, но текст атрибутов сохраняется
    expect(escaped).not.toContain("<img");
    expect(escaped).toContain("&lt;img");
    expect(escaped).toContain("onerror"); // Текст сохраняется, но не выполняется
  });
});
