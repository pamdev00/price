// Storage keys constants
export const STORAGE_KEYS = {
  PRODUCTS: "products",
  SESSIONS: "savedSessions",
  THEME: "theme",
  INSTALL_DISMISSED: "installDismissed",
  PRODUCT_TEMPLATES: "productTemplates",
} as const;

// Types
export interface Product {
  id: number;
  name: string;
  originalPrice: number;
  originalQuantity: number;
  unit: string;
  largeUnit: string;
  factor: number;
  pricePerUnit: number;
  pricePerLarge: number;
  addedAt: number;
}

export interface Unit {
  unit: string;
  large: string;
  factor: number;
}

export interface Session {
  name: string;
  products: Product[];
  savedAt: number;
}

export interface ToastTimer {
  id: number;
  timer: ReturnType<typeof setTimeout>;
}

export interface ProductTemplate {
  name: string; // Название товара (нормализованное)
  unit: string; // г, мл, шт
  largeUnit: string; // кг, л, 100 шт
  factor: number; // 1000 или 100
  usageCount: number; // Счётчик использований (для будущей сортировки)
  lastUsed: number; // Timestamp последнего использования
}
