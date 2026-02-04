import { STORAGE_KEYS } from "../constants";

export function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: "light" | "dark"): void {
  const html = document.documentElement;
  html.setAttribute("data-theme", theme);

  // Update meta theme-color
  const metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.content = theme === "dark" ? "#0a0a0f" : "#f8fafc";
  }
}

export function setTheme(theme: "light" | "dark"): void {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  applyTheme(theme);

  const themeBtns = document.querySelectorAll<HTMLButtonElement>(".theme-btn");
  themeBtns.forEach((btn) => {
    const btnTheme = btn.dataset.theme as "light" | "dark" | undefined;
    btn.classList.toggle("active", btnTheme === theme);
  });
}

export function initTheme(): void {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as "light" | "dark" | null;
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    setTheme(getSystemTheme());
  }

  // Theme button clicks
  const themeBtns = document.querySelectorAll<HTMLButtonElement>(".theme-btn");
  themeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.theme as "light" | "dark";
      setTheme(theme);
    });
  });
}
