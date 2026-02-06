// Детекция Telegram браузера
function isTelegramBrowser(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("telegram") || window.location.search.includes("tgWebAppPlatform");
}

// Получить версию приложения из meta тега
function getAppVersion(): string | null {
  const meta = document.querySelector('meta[name="app-version"]');
  return meta ? meta.getAttribute("content") : null;
}

// Сохранить/получить версию из localStorage
const VERSION_KEY = "app_version";

function getStoredVersion(): string | null {
  return localStorage.getItem(VERSION_KEY);
}

function setStoredVersion(version: string): void {
  localStorage.setItem(VERSION_KEY, version);
}

function showUpdateToast(onUpdate: () => void): void {
  const container = document.getElementById("toastContainer") as HTMLDivElement;
  const toastId = Date.now();

  const toast = document.createElement("div");
  toast.className = "toast toast-pwa";
  toast.dataset.id = toastId.toString();
  toast.innerHTML = `
    <div class="toast-content">
      <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round">
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        <polyline points="22 2 15 22 11 13 2 9 22 2"></polyline>
      </svg>
      <span class="toast-text">Доступна новая версия!</span>
    </div>
    <button class="toast-update">Обновить</button>
  `;

  container.appendChild(toast);

  const updateBtn = toast.querySelector(".toast-update") as HTMLButtonElement;
  updateBtn.addEventListener("click", () => {
    onUpdate();
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 300);
  });
}

// Альтернативная проверка обновлений для Telegram (через fetch с cache-busting)
function checkForUpdatesAlternative(): void {
  const currentVersion = getAppVersion();
  const storedVersion = getStoredVersion();

  // Проверяем версию при каждой загрузке
  if (currentVersion && storedVersion && currentVersion !== storedVersion) {
    showUpdateToast(() => {
      setStoredVersion(currentVersion);
      // Очистить кеш и перезагрузить
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
      window.location.reload();
    });
  } else if (currentVersion) {
    setStoredVersion(currentVersion);
  }

  // Периодическая проверка через fetch (каждые 5 минут в Telegram)
  setInterval(
    () => {
      // Проверяем HTML с cache-busting параметром
      fetch(`${window.location.pathname}?v=${Date.now()}`, {
        method: "HEAD",
        cache: "no-cache",
      })
        .then(() => {
          // Если запрос успешен, перепроверяем версию
          const newVersion = getAppVersion();
          const stored = getStoredVersion();
          if (newVersion && stored && newVersion !== stored) {
            showUpdateToast(() => {
              setStoredVersion(newVersion);
              if ("caches" in window) {
                caches.keys().then((names) => {
                  names.forEach((name) => caches.delete(name));
                });
              }
              window.location.reload();
            });
          }
        })
        .catch(() => {
          // Игнорируем ошибки сети
        });
    },
    5 * 60 * 1000
  ); // Каждые 5 минут
}

export function setupPWA(): void {
  // Service Worker registration with update detection
  // Skip SW registration in dev mode when PWA is disabled
  if (import.meta.env.DEV) {
    return;
  }

  // Для Telegram браузера используем альтернативный метод
  if (isTelegramBrowser()) {
    checkForUpdatesAlternative();
    return;
  }

  if ("serviceWorker" in navigator) {
    let updateToastShown = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Refresh the page when new SW takes control
      if (!updateToastShown) {
        window.location.reload();
      }
    });

    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { type: "classic" })
      .then((registration) => {
        // Check for updates every hour
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        );

        // Listen for waiting SW (new version available)
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New SW is waiting, show update toast
                if (!updateToastShown) {
                  updateToastShown = true;
                  showUpdateToast(() => {
                    // Tell the waiting SW to skip waiting
                    if (registration.waiting) {
                      registration.waiting.postMessage({ type: "SKIP_WAITING" });
                    }
                  });
                }
              }
            });
          }
        });
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error("SW registration failed:", error);
        // Если Service Worker не работает, используем альтернативный метод
        checkForUpdatesAlternative();
      });
  } else {
    // Service Worker не поддерживается - используем альтернативный метод
    checkForUpdatesAlternative();
  }
}
