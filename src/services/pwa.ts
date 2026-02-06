// PWA Service Worker management with reliable update mechanism

let registration: ServiceWorkerRegistration | null = null;
let waitingWorker: ServiceWorker | null = null;
let updateToastShown = false;

function showUpdateToast(onUpdate: () => void): void {
  // Предотвращаем дублирование toast
  if (updateToastShown) return;
  updateToastShown = true;

  const container = document.getElementById("toastContainer") as HTMLDivElement;
  if (!container) return;

  const toastId = Date.now();

  const toast = document.createElement("div");
  toast.className = "toast toast-pwa";
  toast.dataset.id = toastId.toString();
  toast.innerHTML = `
    <div class="toast-content">
      <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
        <path d="M3 3v5h5"></path>
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
        <path d="M16 21h5v-5"></path>
      </svg>
      <span class="toast-text">Доступна новая версия!</span>
    </div>
    <button class="toast-update">Обновить</button>
  `;

  container.appendChild(toast);

  const updateBtn = toast.querySelector(".toast-update") as HTMLButtonElement;
  updateBtn.addEventListener("click", () => {
    // Показываем что идёт обновление
    updateBtn.textContent = "...";
    updateBtn.disabled = true;
    onUpdate();
  });
}

function applyUpdate(): void {
  if (waitingWorker) {
    // Отправляем сообщение waiting SW чтобы он активировался
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }
}

function checkForUpdates(): void {
  if (registration) {
    registration.update().catch(() => {
      // SW update check failed - silently ignore
    });
  }
}

function handleNewWorker(newWorker: ServiceWorker): void {
  newWorker.addEventListener("statechange", () => {
    if (newWorker.state === "installed") {
      // Новый SW установлен и ждёт активации
      if (navigator.serviceWorker.controller) {
        // Есть старый SW — значит это обновление
        waitingWorker = newWorker;
        showUpdateToast(applyUpdate);
      }
      // Если controller нет — это первая установка, ничего не делаем
    }
  });
}

export function setupPWA(): void {
  // В dev режиме пропускаем
  if (import.meta.env.DEV) {
    return;
  }

  if (!("serviceWorker" in navigator)) {
    return;
  }

  // Слушаем когда новый SW возьмёт контроль — перезагружаем страницу
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  // Регистрируем SW
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, { type: "classic" })
    .then((reg) => {
      registration = reg;

      // Проверяем есть ли уже waiting worker (например после предыдущего визита)
      if (reg.waiting) {
        waitingWorker = reg.waiting;
        showUpdateToast(applyUpdate);
        return;
      }

      // Слушаем новые установки
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (newWorker) {
          handleNewWorker(newWorker);
        }
      });
    })
    .catch(() => {
      // SW registration failed - silently ignore
    });

  // === КЛЮЧЕВОЕ: проверяем обновления когда пользователь возвращается в приложение ===
  // Это работает на мобильных когда приложение было в фоне!
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkForUpdates();
    }
  });

  // Также проверяем при восстановлении соединения
  window.addEventListener("online", () => {
    checkForUpdates();
  });

  // Дополнительно: проверка каждые 30 минут пока вкладка активна
  // (это страховка, основная проверка — visibilitychange)
  setInterval(
    () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    },
    30 * 60 * 1000
  );
}
