import { ToastTimer } from "../constants";

let toastTimers: ToastTimer[] = [];

function removeToast(toastId: number): void {
  const container = document.getElementById("toastContainer") as HTMLDivElement;
  const toast = container.querySelector(`[data-id="${toastId}"]`);
  if (toast) {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 300);
  }
  toastTimers = toastTimers.filter((t) => t.id !== toastId);
}

export function showUndoToast(message: string, undoCallback: () => void): void {
  const container = document.getElementById("toastContainer") as HTMLDivElement;
  const toastId = Date.now();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.dataset.id = toastId.toString();
  toast.innerHTML = `
    <div class="toast-content">
      <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
      <span class="toast-text">${message}</span>
    </div>
    <button class="toast-undo">Отменить</button>
    <div class="toast-progress"></div>
  `;

  container.appendChild(toast);

  const undoBtn = toast.querySelector(".toast-undo") as HTMLButtonElement;
  const timer = setTimeout(() => {
    removeToast(toastId);
  }, 3000);

  toastTimers.push({ id: toastId, timer });

  undoBtn.addEventListener("click", () => {
    clearTimeout(timer);
    toastTimers = toastTimers.filter((t) => t.id !== toastId);
    undoCallback();
    removeToast(toastId);
    if (navigator.vibrate) {
      navigator.vibrate(5);
    }
  });
}

export function showInfoToast(message: string): void {
  const container = document.getElementById("toastContainer") as HTMLDivElement;
  const toastId = Date.now();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.dataset.id = toastId.toString();
  toast.innerHTML = `
    <div class="toast-content">
      <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
      <span class="toast-text">${message}</span>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => removeToast(toastId), 2500);
}

export function showError(message: string, inputField: HTMLInputElement | null = null): void {
  // Подсветка проблемного поля
  if (inputField) {
    inputField.classList.add("input-error");
    // Убираем подсветку при вводе
    const removeHighlight = () => {
      inputField.classList.remove("input-error");
      inputField.removeEventListener("input", removeHighlight);
    };
    inputField.addEventListener("input", removeHighlight);
  }

  const container = document.getElementById("toastContainer") as HTMLDivElement;
  const toastId = Date.now();

  const toast = document.createElement("div");
  toast.className = "toast toast-error";
  toast.dataset.id = toastId.toString();
  toast.innerHTML = `
    <div class="toast-content">
      <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span class="toast-text">${message}</span>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => removeToast(toastId), 3000);
}

export function showConfirm(
  title: string,
  text: string,
  onConfirm: () => void,
  confirmBtnText = "Удалить",
  isDanger = true
): void {
  const modal = document.getElementById("confirmModal") as HTMLDivElement;
  const titleEl = document.getElementById("confirmTitle") as HTMLHeadingElement;
  const textEl = document.getElementById("confirmText") as HTMLParagraphElement;
  const cancelBtn = document.getElementById("confirmCancel") as HTMLButtonElement;
  const okBtn = document.getElementById("confirmOk") as HTMLButtonElement;

  titleEl.textContent = title;
  textEl.textContent = text;
  okBtn.textContent = confirmBtnText;

  // Меняем стиль кнопки
  if (isDanger) {
    okBtn.classList.add("danger");
    okBtn.classList.remove("confirm");
  } else {
    okBtn.classList.remove("danger");
    okBtn.classList.add("confirm");
  }

  modal.classList.add("show");

  const cleanup = () => {
    modal.classList.remove("show");
    cancelBtn.removeEventListener("click", handleCancel);
    okBtn.removeEventListener("click", handleOk);
    modal.removeEventListener("click", handleBackdrop);
  };

  const handleCancel = () => cleanup();
  const handleOk = () => {
    cleanup();
    onConfirm();
  };
  const handleBackdrop = (e: MouseEvent) => {
    if (e.target === modal) cleanup();
  };

  cancelBtn.addEventListener("click", handleCancel);
  okBtn.addEventListener("click", handleOk);
  modal.addEventListener("click", handleBackdrop);
}

export function initSwipeHandlers(): void {
  const cards = document.querySelectorAll<HTMLDivElement>(".product-card");

  cards.forEach((card) => {
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    const threshold = 80; // Minimum swipe distance to trigger delete

    card.addEventListener(
      "touchstart",
      (e) => {
        // Don't start swipe if touching delete button
        if ((e.target as HTMLElement)?.closest(".delete-btn")) return;

        startX = e.touches[0].clientX;
        isDragging = true;
        card.classList.add("swiping");
      },
      { passive: true }
    );

    card.addEventListener(
      "touchmove",
      (e) => {
        if (!isDragging) return;

        currentX = e.touches[0].clientX - startX;

        // Apply resistance at edges
        const resistance = 0.4;
        const translateX = currentX * resistance;

        card.style.transform = `translateX(${translateX}px)`;
      },
      { passive: true }
    );

    card.addEventListener("touchend", () => {
      if (!isDragging) return;
      isDragging = false;
      card.classList.remove("swiping");

      const translateX = currentX * 0.4;

      if (Math.abs(translateX) > threshold) {
        // Trigger delete
        const direction = translateX < 0 ? "swipe-left" : "swipe-right";
        card.classList.add("removing", direction);

        const productId = parseInt(card.dataset.id || "0");
        const event = new CustomEvent("swipe-delete", { detail: { productId } });
        card.dispatchEvent(event);
      } else {
        // Snap back
        card.style.transform = "";
      }

      currentX = 0;
    });

    // Mouse support for desktop testing
    card.addEventListener("mousedown", (e) => {
      if (e.target instanceof HTMLElement && e.target.closest(".delete-btn")) return;

      startX = e.clientX;
      isDragging = true;
      card.classList.add("swiping");

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        currentX = e.clientX - startX;
        const resistance = 0.4;
        card.style.transform = `translateX(${currentX * resistance}px)`;
      };

      const onMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        card.classList.remove("swiping");

        const translateX = currentX * 0.4;

        if (Math.abs(translateX) > threshold) {
          const direction = translateX < 0 ? "swipe-left" : "swipe-right";
          card.classList.add("removing", direction);

          const productId = parseInt(card.dataset.id || "0");
          const event = new CustomEvent("swipe-delete", { detail: { productId } });
          card.dispatchEvent(event);
        } else {
          card.style.transform = "";
        }

        currentX = 0;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  });
}
