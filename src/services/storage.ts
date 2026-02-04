import { STORAGE_KEYS, Product, Session, ProductTemplate } from "../constants";
import { showInfoToast } from "../components/ui";

export function loadProducts(): Product[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || "[]");
}

export function saveProducts(products: Product[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (_e) {
    showInfoToast("Недостаточно места в хранилище. Попробуйте удалить старые сравнения.");
  }
}

export function loadSessions(): Session[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || "[]");
}

export function saveSessions(sessions: Session[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (_e) {
    throw new Error("Storage quota exceeded");
  }
}

export function loadProductTemplates(): ProductTemplate[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCT_TEMPLATES) || "[]");
}

export function saveProductTemplates(templates: ProductTemplate[]): void {
  // Ограничение 200 шаблонов
  if (templates.length > 200) {
    templates.sort((a, b) => b.lastUsed - a.lastUsed);
    templates = templates.slice(0, 200);
  }
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCT_TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    console.error("Failed to save templates:", e);
  }
}

export function addProductTemplate(
  name: string,
  unit: string,
  largeUnit: string,
  factor: number
): void {
  const templates = loadProductTemplates();
  const normalizedName = name.trim().toLowerCase();

  // Проверка на дубликат (название + единица)
  const existingIndex = templates.findIndex(
    (t) => t.name.toLowerCase() === normalizedName && t.unit === unit
  );

  if (existingIndex >= 0) {
    // Обновить существующий
    templates[existingIndex].usageCount++;
    templates[existingIndex].lastUsed = Date.now();
  } else {
    // Добавить новый
    templates.push({
      name: name.trim(),
      unit,
      largeUnit,
      factor,
      usageCount: 1,
      lastUsed: Date.now(),
    });
  }

  saveProductTemplates(templates);
}
