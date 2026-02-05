import { Product, Unit } from "../constants";
import { saveProducts, addProductTemplate } from "../services/storage";
import { showUndoToast, initSwipeHandlers, showEditModal } from "./ui";
import { formatPrice, escapeHtml } from "../utils";

export class ProductManager {
  private products: Product[];
  private currentUnit: Unit;
  private sortBy: "price" | "added";

  constructor(initialProducts: Product[] = []) {
    this.products = initialProducts;
    this.currentUnit = { unit: "г", large: "кг", factor: 1000 };
    this.sortBy = "price";
  }

  setUnit(unit: Unit): void {
    this.currentUnit = unit;
  }

  setSortBy(sortBy: "price" | "added"): void {
    this.sortBy = sortBy;
  }

  getProducts(): Product[] {
    return this.products;
  }

  addProduct(name: string, price: number, quantity: number): boolean {
    // Валидация с проверкой на NaN
    if (isNaN(price) || price <= 0) {
      return false;
    }
    if (isNaN(quantity) || quantity <= 0) {
      return false;
    }

    const pricePerUnit = price / quantity;
    const pricePerLarge = pricePerUnit * this.currentUnit.factor;

    const product: Product = {
      id: Date.now(),
      name: name || `Товар ${this.products.length + 1}`,
      originalPrice: price,
      originalQuantity: quantity,
      unit: this.currentUnit.unit,
      largeUnit: this.currentUnit.large,
      factor: this.currentUnit.factor,
      pricePerUnit,
      pricePerLarge,
      addedAt: Date.now(),
    };

    this.products.push(product);
    saveProducts(this.products);

    // Сохранение как шаблон
    addProductTemplate(
      product.name,
      this.currentUnit.unit,
      this.currentUnit.large,
      this.currentUnit.factor
    );

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    return true;
  }

  deleteProduct(id: number, onDelete?: () => void): void {
    const product = this.products.find((p) => p.id === id);
    if (!product) return;

    const productIndex = this.products.findIndex((p) => p.id === id);
    const productBackup = { ...product };

    // Удаляем из массива
    this.products.splice(productIndex, 1);
    saveProducts(this.products);

    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }

    if (onDelete) {
      onDelete();
    }

    // Показываем toast с возможностью отмены
    showUndoToast(`«${product.name}» удалён`, () => {
      // Восстанавливаем товар
      this.products.splice(productIndex, 0, productBackup);
      saveProducts(this.products);
      if (onDelete) {
        onDelete();
      }
    });
  }

  editProduct(
    id: number,
    edits: {
      name?: string;
      originalPrice?: number;
      originalQuantity?: number;
      unit?: string;
      largeUnit?: string;
      factor?: number;
    }
  ): boolean {
    const product = this.products.find((p) => p.id === id);
    if (!product) return false;

    // Применяем только переданные поля
    let needsRecalculation = false;

    if (edits.name !== undefined) {
      product.name = edits.name;
    }
    if (edits.originalPrice !== undefined) {
      product.originalPrice = edits.originalPrice;
      needsRecalculation = true;
    }
    if (edits.originalQuantity !== undefined) {
      product.originalQuantity = edits.originalQuantity;
      needsRecalculation = true;
    }
    if (edits.unit !== undefined) {
      product.unit = edits.unit;
    }
    if (edits.largeUnit !== undefined) {
      product.largeUnit = edits.largeUnit;
    }
    if (edits.factor !== undefined) {
      product.factor = edits.factor;
      needsRecalculation = true;
    }

    // Пересчитываем цены если изменились цена, количество или factor
    if (needsRecalculation) {
      const pricePerUnit = product.originalPrice / product.originalQuantity;
      const pricePerLarge = pricePerUnit * product.factor;

      product.pricePerUnit = pricePerUnit;
      product.pricePerLarge = pricePerLarge;
    }

    saveProducts(this.products);

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    return true;
  }

  private openEditModal(productId: number): void {
    const product = this.products.find((p) => p.id === productId);
    if (!product) return;

    showEditModal(product, (edits) => {
      this.editProduct(productId, edits);
      this.renderProducts();
    });
  }

  setupProductEventListeners(): void {
    // Используем делегирование событий для кликов на карточки
    const productsList = document.getElementById("productsList") as HTMLDivElement;

    productsList.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const card = target.closest(".product-card") as HTMLDivElement;

      // Игнорируем клик на кнопку удаления или если карточка в процессе свайпа
      if (!card || target.closest(".delete-btn") || card.classList.contains("swiping")) {
        return;
      }

      const productId = parseInt(card.dataset.id || "0");
      if (productId > 0) {
        this.openEditModal(productId);
      }
    });
  }

  clearAll(onClear?: () => void): void {
    if (this.products.length === 0) return;

    const backup = [...this.products];
    this.products = [];
    saveProducts(this.products);

    if (onClear) {
      onClear();
    }

    showUndoToast("Все товары удалены", () => {
      this.products = backup;
      saveProducts(this.products);
      if (onClear) {
        onClear();
      }
    });
  }

  renderProducts(): void {
    const productsList = document.getElementById("productsList") as HTMLDivElement;
    const resultsSection = document.getElementById("resultsSection") as HTMLDivElement;
    const emptyState = document.getElementById("emptyState") as HTMLDivElement;
    const itemCount = document.getElementById("itemCount") as HTMLSpanElement;

    if (this.products.length === 0) {
      resultsSection.style.display = "none";
      emptyState.style.display = "block";
      return;
    }

    resultsSection.style.display = "block";
    emptyState.style.display = "none";
    itemCount.textContent = this.products.length.toString();

    // Sort products
    const sorted = [...this.products];
    if (this.sortBy === "price") {
      sorted.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
    } else {
      // По добавлению - новые сверху
      sorted.sort((a, b) => b.addedAt - a.addedAt);
    }

    // Find best deal
    const bestDealId = sorted.reduce<Product | null>(
      (best, current) => (current.pricePerUnit < (best?.pricePerUnit ?? Infinity) ? current : best),
      null
    )?.id;

    productsList.innerHTML = sorted
      .map(
        (product) => `
      <div class="product-card ${
        product.id === bestDealId && this.products.length > 1 ? "best-deal" : ""
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
        ${product.id === bestDealId && this.products.length > 1 ? '<div class="best-badge">🏆 Лучшая цена</div>' : ""}
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
            <div class="price-label">${product.unit === "шт" ? "За" : "За 1"} ${product.largeUnit}</div>
            <div class="price-value">${formatPrice(product.pricePerLarge)} <small>₽</small></div>
          </div>
        </div>
      </div>
    `
      )
      .join("");

    // Add event listeners to delete buttons
    document.querySelectorAll<HTMLButtonElement>("[data-delete-id]").forEach((btn) => {
      const id = parseInt(btn.dataset.deleteId || "0");
      btn.addEventListener("click", () => this.deleteProduct(id, () => this.renderProducts()));
    });

    // Initialize swipe handlers with custom event listener
    initSwipeHandlers();

    // Listen for swipe-delete events
    document.querySelectorAll<HTMLDivElement>(".product-card").forEach((card) => {
      card.addEventListener("swipe-delete", ((e: CustomEvent) => {
        const productId = e.detail.productId;
        setTimeout(() => {
          this.deleteProduct(productId, () => this.renderProducts());
        }, 300);
      }) as EventListener);
    });
  }
}
