export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
  } else if (price >= 100) {
    return price.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
  } else if (price >= 1) {
    return price.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
  } else {
    return price.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
  }
}

export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
