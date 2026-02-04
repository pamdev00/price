import "./style.css";
import bridge from "@vkontakte/vk-bridge";
import { Unit, STORAGE_KEYS } from "./constants";
import { setupPWA } from "./services/pwa";
import { initTheme } from "./services/theme";
import { loadProducts, saveProducts } from "./services/storage";
import { ProductManager } from "./components/product";
import { SessionManager } from "./components/session";
import { showError, showConfirm, showInfoToast } from "./components/ui";
import { AutocompleteManager } from "./components/autocomplete";

// Initialize VK Bridge
bridge.send("VKWebAppInit");

// Setup PWA when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupPWA);
} else {
  setupPWA();
}

// Initialize theme
initTheme();

// Initialize managers
const productManager = new ProductManager(loadProducts());
const sessionManager = new SessionManager();

// App State
let deferredPrompt: Event | null = null;

// DOM Elements
const productNameInput = document.getElementById("productName") as HTMLInputElement;
const priceInput = document.getElementById("price") as HTMLInputElement;
const quantityInput = document.getElementById("quantity") as HTMLInputElement;
const addBtn = document.getElementById("addProduct") as HTMLButtonElement;
const clearAllBtn = document.getElementById("clearAll") as HTMLButtonElement;
const unitBtns = document.querySelectorAll<HTMLButtonElement>(".unit-btn");
const sortBtns = document.querySelectorAll<HTMLButtonElement>(".sort-btn");
const installBanner = document.getElementById("installBanner") as HTMLDivElement;
const installBtn = document.getElementById("installBtn") as HTMLButtonElement;
const installClose = document.getElementById("installClose") as HTMLButtonElement;
const saveSessionBtn = document.getElementById("saveSessionBtn") as HTMLButtonElement;
const saveModal = document.getElementById("saveModal") as HTMLDivElement;
const sessionNameInput = document.getElementById("sessionNameInput") as HTMLInputElement;
const modalCancel = document.getElementById("modalCancel") as HTMLButtonElement;
const modalConfirm = document.getElementById("modalConfirm") as HTMLButtonElement;

// Initialize autocomplete
const autocomplete = new AutocompleteManager(productNameInput, (template) => {
  // Заполнить название
  productNameInput.value = template.name;

  // Программно выбрать unit button
  unitBtns.forEach((btn) => {
    const btnUnit = btn.dataset.unit;
    if (btnUnit === template.unit) {
      btn.click(); // Используем существующий обработчик
    }
  });

  // Фокус на цену
  priceInput.focus();
});

// Unit Selection
unitBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    unitBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const unit = btn.dataset.unit;
    const large = btn.dataset.large;
    const factor = btn.dataset.factor;
    if (unit && large && factor) {
      const currentUnit: Unit = { unit, large, factor: parseInt(factor) };
      productManager.setUnit(currentUnit);
    }
  });
});

// Sort Selection
sortBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    sortBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const sortValue = btn.dataset.sort as "price" | "added" | undefined;
    if (sortValue) {
      productManager.setSortBy(sortValue);
      productManager.renderProducts();
    }
  });
});

// Add Product
addBtn.addEventListener("click", () => {
  const name = productNameInput.value.trim();
  const price = parseFloat(priceInput.value);
  const quantity = parseFloat(quantityInput.value);

  // Валидация
  if (isNaN(price) || price <= 0) {
    showError("Введите корректную цену", priceInput);
    priceInput.focus();
    return;
  }
  if (isNaN(quantity) || quantity <= 0) {
    showError("Введите корректное количество", quantityInput);
    quantityInput.focus();
    return;
  }

  const success = productManager.addProduct(name, price, quantity);
  if (success) {
    productManager.renderProducts();

    // Обновить список шаблонов
    autocomplete.refresh();

    // Clear inputs
    productNameInput.value = "";
    priceInput.value = "";
    quantityInput.value = "";
    productNameInput.focus();
  }
});

// Enter key support
[productNameInput, priceInput, quantityInput].forEach((input) => {
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addBtn.click();
  });
});

// Clear All
clearAllBtn.addEventListener("click", () => {
  showConfirm(
    "Удалить все товары?",
    `Будет удалено ${productManager.getProducts().length} товаров. Это действие можно отменить в течение 3 секунд.`,
    () => {
      productManager.clearAll(() => productManager.renderProducts());
    }
  );
});

// PWA Install
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show install banner after a delay
  setTimeout(() => {
    if (!localStorage.getItem(STORAGE_KEYS.INSTALL_DISMISSED)) {
      installBanner.classList.add("show");
    }
  }, 3000);
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  // @ts-expect-error deferredPrompt.userChoice is not fully typed in TypeScript - beforeinstallprompt event is not fully typed
  deferredPrompt.prompt();
  // @ts-expect-error deferredPrompt.userChoice is not fully typed in TypeScript
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === "accepted") {
    installBanner.classList.remove("show");
  }
  deferredPrompt = null;
});

installClose.addEventListener("click", () => {
  installBanner.classList.remove("show");
  localStorage.setItem(STORAGE_KEYS.INSTALL_DISMISSED, "true");
});

// Session Management
function showSaveModal(): void {
  if (productManager.getProducts().length === 0) {
    showInfoToast("Сначала добавьте товары для сравнения");
    return;
  }

  sessionNameInput.value = "";
  saveModal.classList.add("show");
  setTimeout(() => sessionNameInput.focus(), 100);
}

function hideSaveModal(): void {
  saveModal.classList.remove("show");
}

function saveSession(): void {
  const name = sessionNameInput.value.trim();
  sessionManager.saveSession(name, productManager.getProducts());
  sessionManager.renderHistory();
  hideSaveModal();
  setupHistoryEventListeners();
}

function setupHistoryEventListeners(): void {
  // Load buttons
  document.querySelectorAll<HTMLButtonElement>(".load-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index || "0");
      sessionManager.loadSession(index, productManager.getProducts(), (products) => {
        // Update product manager with loaded products
        const newManager = new ProductManager(products);
        Object.assign(productManager, newManager);
        saveProducts(products);
        productManager.renderProducts();
      });
    });
  });

  // Delete buttons
  document.querySelectorAll<HTMLButtonElement>(".delete-history-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index || "0");
      sessionManager.deleteSession(index, () => {
        sessionManager.renderHistory();
        setupHistoryEventListeners();
      });
    });
  });
}

saveSessionBtn.addEventListener("click", showSaveModal);
modalCancel.addEventListener("click", hideSaveModal);
modalConfirm.addEventListener("click", saveSession);

saveModal.addEventListener("click", (e) => {
  if (e.target === saveModal) hideSaveModal();
});

sessionNameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") saveSession();
});

// Shake animation
const style = document.createElement("style");
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-8px); }
    40%, 80% { transform: translateX(8px); }
  }
`;
document.head.appendChild(style);

// Initial render
productManager.renderProducts();
sessionManager.renderHistory();
setupHistoryEventListeners();
