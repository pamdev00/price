import { afterEach } from 'vitest'
import { GlobalWindow } from 'happy-dom'

let window: GlobalWindow

afterEach(() => {
  // Создаём новый window для изоляции тестов
  window = new GlobalWindow()
  global.window = window as any
  global.document = window.document
  global.navigator = window.navigator
})
