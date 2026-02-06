import { afterEach } from "vitest";
import { GlobalWindow } from "happy-dom";

let window: GlobalWindow;

afterEach(() => {
  // Создаём новый window для изоляции тестов
  window = new GlobalWindow();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.window = window as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.document = window.document as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.navigator = window.navigator as any;
});
