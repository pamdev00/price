import { ProductTemplate } from "../constants";
import { loadProductTemplates } from "../services/storage";
import { escapeHtml } from "../utils";

export class AutocompleteManager {
  private input: HTMLInputElement;
  private dropdown: HTMLDivElement | null = null;
  private templates: ProductTemplate[] = [];
  private selectedIndex: number = -1;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private onSelect: (template: ProductTemplate) => void;

  constructor(
    inputElement: HTMLInputElement,
    onSelectCallback: (template: ProductTemplate) => void
  ) {
    this.input = inputElement;
    this.onSelect = onSelectCallback;
    this.templates = loadProductTemplates();
    this.init();
  }

  private init(): void {
    // Input event с debounce
    this.input.addEventListener("input", (e) => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);

      this.debounceTimer = setTimeout(() => {
        this.handleInput((e.target as HTMLInputElement).value);
      }, 250);
    });

    // Keyboard navigation
    this.input.addEventListener("keydown", (e) => this.handleKeydown(e));

    // Закрытие на клик вне
    document.addEventListener("click", (e) => {
      if (!this.input.contains(e.target as Node) && !this.dropdown?.contains(e.target as Node)) {
        this.close();
      }
    });
  }

  private handleInput(value: string): void {
    const query = value.trim();

    if (query.length < 2) {
      this.close();
      return;
    }

    // Фильтрация (case-insensitive)
    const filtered = this.templates.filter((t) =>
      t.name.toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length === 0) {
      this.close();
      return;
    }

    this.render(filtered);
  }

  private render(items: ProductTemplate[]): void {
    if (!this.dropdown) {
      this.dropdown = document.createElement("div");
      this.dropdown.className = "autocomplete-dropdown";

      // Позиционирование под input
      const inputRect = this.input.getBoundingClientRect();
      this.dropdown.style.top = `${inputRect.bottom + window.scrollY}px`;
      this.dropdown.style.left = `${inputRect.left + window.scrollX}px`;
      this.dropdown.style.width = `${inputRect.width}px`;

      document.body.appendChild(this.dropdown);
    }

    this.selectedIndex = -1;

    this.dropdown.innerHTML = items
      .map(
        (item, index) => `
        <div class="autocomplete-item" data-index="${index}">
          <span class="autocomplete-name">${escapeHtml(item.name)}</span>
          <span class="autocomplete-unit">${escapeHtml(item.unit === "г" ? "гр" : item.unit)}</span>
        </div>
      `
      )
      .join("");

    // Event listeners на items
    this.dropdown.querySelectorAll(".autocomplete-item").forEach((el, index) => {
      el.addEventListener("click", () => {
        this.selectItem(items[index]);
      });
    });
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (!this.dropdown) return;

    const items = this.dropdown.querySelectorAll(".autocomplete-item");

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
        this.highlightItem(items);
        break;

      case "ArrowUp":
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.highlightItem(items);
        break;

      case "Enter":
        e.preventDefault();
        if (this.selectedIndex >= 0) {
          const index = parseInt(items[this.selectedIndex].getAttribute("data-index") || "0");
          const filtered = this.templates.filter((t) =>
            t.name.toLowerCase().includes(this.input.value.toLowerCase())
          );
          this.selectItem(filtered[index]);
        }
        break;

      case "Escape":
        this.close();
        break;
    }
  }

  private highlightItem(items: NodeListOf<Element>): void {
    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.classList.add("selected");
        item.scrollIntoView({ block: "nearest" });
      } else {
        item.classList.remove("selected");
      }
    });
  }

  private selectItem(template: ProductTemplate): void {
    this.onSelect(template);
    this.close();
  }

  close(): void {
    if (this.dropdown) {
      this.dropdown.remove();
      this.dropdown = null;
    }
    this.selectedIndex = -1;
  }

  refresh(): void {
    this.templates = loadProductTemplates();
  }
}
