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

export function setupPWA(): void {
  // Service Worker registration with update detection
  // Skip SW registration in dev mode when PWA is disabled
  if (import.meta.env.DEV) {
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
        console.error("SW registration failed:", error);
      });
  }
}
