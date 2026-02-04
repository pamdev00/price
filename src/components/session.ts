import { Session, Product } from "../constants";
import { loadSessions, saveSessions } from "../services/storage";
import { showConfirm, showUndoToast, showInfoToast } from "./ui";
import { formatPrice, escapeHtml } from "../utils";

export class SessionManager {
  private savedSessions: Session[];

  constructor() {
    this.savedSessions = loadSessions();
  }

  getSessions(): Session[] {
    return this.savedSessions;
  }

  saveSession(name: string, products: Product[]): void {
    const session: Session = {
      name: name || `Сравнение ${this.savedSessions.length + 1}`,
      products: [...products],
      savedAt: Date.now(),
    };

    this.savedSessions.unshift(session);

    // Keep only last 200 sessions
    if (this.savedSessions.length > 200) {
      this.savedSessions = this.savedSessions.slice(0, 200);
    }

    // Проверяем, хватает ли места в localStorage
    try {
      saveSessions(this.savedSessions);
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch (_e) {
      // Если места нет - удаляем самые старые сессии
      const sessionsToRemove = Math.min(20, this.savedSessions.length - 1);
      this.savedSessions.splice(this.savedSessions.length - sessionsToRemove, sessionsToRemove);

      try {
        saveSessions(this.savedSessions);

        // Показываем сообщение о том, что старые сессии были удалены
        showConfirm(
          "Хранилище заполнено",
          `Для сохранения нового сравнения было удалено ${sessionsToRemove} старых. Хотите открыть историю и удалить больше?`,
          () => {
            // Скролл к истории
            document.querySelector(".history-section")?.scrollIntoView({ behavior: "smooth" });
          },
          "Открыть историю",
          false
        );
      } catch (_e2) {
        // Если всё ещё не хватает места - удаляем ещё больше
        this.savedSessions.splice(0, this.savedSessions.length - 50);
        saveSessions(this.savedSessions);

        showInfoToast("Недостаточно места. Удалено много старых сессий.");
      }
    }
  }

  loadSession(
    index: number,
    currentProducts: Product[],
    onLoad: (products: Product[]) => void
  ): void {
    const session = this.savedSessions[index];
    if (!session) return;

    const doLoad = () => {
      let products = [...session.products];
      let nextId = Date.now();
      products = products.map((p) => ({ ...p, id: ++nextId, addedAt: nextId }));
      onLoad(products);

      const resultsSection = document.getElementById("resultsSection");
      resultsSection?.scrollIntoView({ behavior: "smooth", block: "start" });

      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    };

    if (currentProducts.length > 0) {
      showConfirm(
        "Загрузить сравнение?",
        `Загрузить «${session.name}»? Текущее сравнение будет заменено.`,
        doLoad,
        "Загрузить",
        false
      );
    } else {
      doLoad();
    }
  }

  deleteSession(index: number, onDelete: () => void): void {
    const session = this.savedSessions[index];
    if (!session) return;

    showConfirm(
      "Удалить из истории?",
      `Удалить «${session.name}»? Это действие можно отменить в течение 3 секунд.`,
      () => {
        const backup = { ...session };
        this.savedSessions.splice(index, 1);
        saveSessions(this.savedSessions);
        onDelete();

        if (navigator.vibrate) {
          navigator.vibrate([10, 50, 10]);
        }

        showUndoToast(`«${session.name}» удалён`, () => {
          this.savedSessions.splice(index, 0, backup);
          saveSessions(this.savedSessions);
          onDelete();
        });
      }
    );
  }

  renderHistory(): void {
    const historyList = document.getElementById("historyList") as HTMLDivElement;

    if (this.savedSessions.length === 0) {
      historyList.innerHTML = '<div class="history-empty">Сохранённых сравнений пока нет</div>';
      return;
    }

    historyList.innerHTML = this.savedSessions
      .map((session, index) => {
        const date = new Date(session.savedAt);
        const dateStr = date.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        const bestPrice = session.products.reduce<Product | null>(
          (best, p) => (p.pricePerUnit < (best?.pricePerUnit ?? Infinity) ? p : best),
          null
        );

        return `
          <div class="history-card" data-index="${index}">
            <div class="history-card-header">
              <div class="history-card-name">${escapeHtml(session.name)}</div>
              <div class="history-card-date">${dateStr}</div>
            </div>
            <div class="history-card-info">
              <span>📦 ${session.products.length} товаров</span>
              ${bestPrice ? `<span>🏆 от ${formatPrice(bestPrice.pricePerUnit)} ₽/${bestPrice.unit}</span>` : ""}
            </div>
            <div class="history-card-actions">
              <button class="history-action-btn load-btn" data-index="${index}">Загрузить</button>
              <button class="history-action-btn danger delete-history-btn" data-index="${index}">Удалить</button>
            </div>
          </div>
        `;
      })
      .join("");
  }
}
