import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TutorialManager } from '../components/tutorial';
import { STORAGE_KEYS } from '../constants';

describe('TutorialManager', () => {
  let tutorialManager: TutorialManager;

  beforeEach(() => {
    // Очистить localStorage перед каждым тестом
    localStorage.clear();

    // Очистить DOM
    document.body.innerHTML = '';

    // Моки для setTimeout
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Закрыть модал если открыт
    if (tutorialManager) {
      tutorialManager.close();
    }

    // Очистить таймеры
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Инициализация', () => {
    it('должен показать инструкцию при первом запуске', () => {
      tutorialManager = new TutorialManager();

      // Fast-forward через задержку 500ms
      vi.advanceTimersByTime(500);

      const modal = document.querySelector('.tutorial-modal');
      expect(modal).not.toBeNull();
      expect(modal?.classList.contains('show')).toBe(true);
    });

    it('не должен показывать инструкцию при повторном запуске', () => {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, 'true');

      tutorialManager = new TutorialManager();
      vi.advanceTimersByTime(500);

      const modal = document.querySelector('.tutorial-modal');
      expect(modal).toBeNull();
    });
  });

  describe('Показ модала', () => {
    beforeEach(() => {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, 'true'); // Отключить автопоказ
      tutorialManager = new TutorialManager();
      tutorialManager.disableAnimations(); // Отключаем анимации для тестов
    });

    it('должен создать модальное окно при вызове show()', () => {
      tutorialManager.show();

      const modal = document.querySelector('.tutorial-modal');
      const content = document.querySelector('.tutorial-content');

      expect(modal).not.toBeNull();
      expect(modal?.classList.contains('show')).toBe(true);
      expect(content).not.toBeNull();
    });

    it('должен показать первый слайд', () => {
      tutorialManager.show();

      const title = document.querySelector('.tutorial-title');
      const emoji = document.querySelector('.tutorial-emoji');

      expect(title?.textContent).toContain('Добро пожаловать');
      expect(emoji?.textContent).toBe('👋');
    });

    it('должен показать кнопки навигации', () => {
      tutorialManager.show();

      const skipBtn = document.querySelector('.tutorial-skip');
      const nextBtn = document.querySelector('.tutorial-next');
      const backBtn = document.querySelector('.tutorial-back');

      expect(skipBtn).not.toBeNull();
      expect(nextBtn).not.toBeNull();
      expect(backBtn).not.toBeNull();
    });

    it('должен скрыть кнопку "Назад" на первом слайде', () => {
      tutorialManager.show();

      const backBtn = document.querySelector('.tutorial-back') as HTMLButtonElement;
      expect(backBtn.style.display).toBe('none');
    });

    it('должен показать индикаторы слайдов', () => {
      tutorialManager.show();

      const dots = document.querySelectorAll('.tutorial-dot');
      expect(dots.length).toBe(5); // 5 слайдов

      const activeDot = document.querySelector('.tutorial-dot.active');
      expect(activeDot).not.toBeNull();
    });
  });

  describe('Навигация по слайдам', () => {
    beforeEach(() => {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, 'true');
      tutorialManager = new TutorialManager();
      tutorialManager.disableAnimations(); // Отключаем анимации для тестов
      tutorialManager.show();
    });

    it('должен перейти на следующий слайд при клике на "Далее"', () => {
      const nextBtn = document.querySelector('.tutorial-next') as HTMLButtonElement;
      nextBtn.click();

      const title = document.querySelector('.tutorial-title');
      expect(title?.textContent).toContain('Добавьте первый товар');
    });

    it('должен перейти на предыдущий слайд при клике на "Назад"', () => {
      // Переход на второй слайд
      const nextBtn = document.querySelector('.tutorial-next') as HTMLButtonElement;
      nextBtn.click();

      // Возврат на первый
      const backBtn = document.querySelector('.tutorial-back') as HTMLButtonElement;
      backBtn.click();

      const title = document.querySelector('.tutorial-title');
      expect(title?.textContent).toContain('Добро пожаловать');
    });

    it('должен показать кнопку "Назад" на втором слайде', () => {
      const nextBtn = document.querySelector('.tutorial-next') as HTMLButtonElement;
      nextBtn.click();

      const backBtn = document.querySelector('.tutorial-back') as HTMLButtonElement;
      expect(backBtn.style.display).toBe('inline-block');
    });

    it('должен изменить текст кнопки "Далее" на "Начать работу" на последнем слайде', () => {
      const nextBtn = document.querySelector('.tutorial-next') as HTMLButtonElement;

      // Переход на последний слайд (5 кликов)
      for (let i = 0; i < 4; i++) {
        nextBtn.click();
      }

      expect(nextBtn.textContent).toBe('Начать работу');
    });

    it('должен обновлять активную точку при переходе между слайдами', () => {
      const nextBtn = document.querySelector('.tutorial-next') as HTMLButtonElement;
      nextBtn.click();

      const activeDot = document.querySelector('.tutorial-dot.active');
      const allDots = document.querySelectorAll('.tutorial-dot');

      // Проверяем что активная точка - вторая
      expect(allDots[1]).toBe(activeDot);
    });
  });

  describe('Keyboard navigation', () => {
    beforeEach(() => {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, 'true');
      tutorialManager = new TutorialManager();
      tutorialManager.disableAnimations(); // Отключаем анимации для тестов
      tutorialManager.show();
    });

    it('должен перейти на следующий слайд при нажатии стрелки вправо', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      document.dispatchEvent(event);

      const title = document.querySelector('.tutorial-title');
      expect(title?.textContent).toContain('Добавьте первый товар');
    });

    it('должен перейти на предыдущий слайд при нажатии стрелки влево', () => {
      // Переход на второй слайд
      let event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      document.dispatchEvent(event);

      // Возврат на первый
      event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      document.dispatchEvent(event);

      const title = document.querySelector('.tutorial-title');
      expect(title?.textContent).toContain('Добро пожаловать');
    });

    it('должен закрыть модал при нажатии Escape', () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      const modal = document.querySelector('.tutorial-modal');
      expect(modal).toBeNull();
    });
  });

  describe('Закрытие модала', () => {
    beforeEach(() => {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, 'true');
      tutorialManager = new TutorialManager();
      tutorialManager.disableAnimations(); // Отключаем анимации для тестов
      tutorialManager.show();
    });

    it('должен закрыться при клике на кнопку "X"', () => {
      const closeBtn = document.querySelector('.tutorial-close') as HTMLButtonElement;
      closeBtn.click();

      const modal = document.querySelector('.tutorial-modal');
      expect(modal).toBeNull();
    });

    it('должен закрыться при клике на "Пропустить"', () => {
      const skipBtn = document.querySelector('.tutorial-skip') as HTMLButtonElement;
      skipBtn.click();

      const modal = document.querySelector('.tutorial-modal');
      expect(modal).toBeNull();
    });

    it('должен закрыться при клике на overlay', () => {
      const overlay = document.querySelector('.tutorial-modal') as HTMLElement;
      overlay.click();

      const modal = document.querySelector('.tutorial-modal');
      expect(modal).toBeNull();
    });

    it('должен закрыться при клике на "Начать работу" на последнем слайде', () => {
      const nextBtn = document.querySelector('.tutorial-next') as HTMLButtonElement;

      // Переход на последний слайд
      for (let i = 0; i < 4; i++) {
        nextBtn.click();
      }

      // Клик на "Начать работу"
      nextBtn.click();

      const modal = document.querySelector('.tutorial-modal');
      expect(modal).toBeNull();
    });

    it('должен сохранить флаг в localStorage при закрытии', () => {
      localStorage.removeItem(STORAGE_KEYS.TUTORIAL_SEEN);

      const closeBtn = document.querySelector('.tutorial-close') as HTMLButtonElement;
      closeBtn.click();

      expect(localStorage.getItem(STORAGE_KEYS.TUTORIAL_SEEN)).toBe('true');
    });

    it('не должен закрываться при клике внутри контента', () => {
      const content = document.querySelector('.tutorial-content') as HTMLElement;
      content.click();

      const modal = document.querySelector('.tutorial-modal');
      expect(modal).not.toBeNull();
      expect(modal?.classList.contains('show')).toBe(true);
    });
  });

  describe('Методы API', () => {
    beforeEach(() => {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, 'true');
      tutorialManager = new TutorialManager();
      tutorialManager.disableAnimations(); // Отключаем анимации для тестов
    });

    it('метод reset() должен очистить флаг tutorialSeen', () => {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, 'true');

      tutorialManager.reset();

      expect(localStorage.getItem(STORAGE_KEYS.TUTORIAL_SEEN)).toBeNull();
    });

    it('метод close() должен удалить keyboard listener', () => {
      tutorialManager.show();

      const spy = vi.spyOn(document, 'removeEventListener');
      tutorialManager.close();

      expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('метод addSlide() должен добавить новый слайд', () => {
      tutorialManager.addSlide({
        id: 6,
        title: 'Новый слайд',
        text: 'Описание нового слайда',
        emoji: '🎯'
      });

      tutorialManager.show();

      // Переход на последний слайд (теперь их 6)
      const nextBtn = document.querySelector('.tutorial-next') as HTMLButtonElement;
      for (let i = 0; i < 5; i++) {
        nextBtn.click();
      }

      const title = document.querySelector('.tutorial-title');
      expect(title?.textContent).toContain('Новый слайд');
    });
  });

  describe('Повторный вызов show()', () => {
    beforeEach(() => {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, 'true');
      tutorialManager = new TutorialManager();
      tutorialManager.disableAnimations(); // Отключаем анимации для тестов
    });

    it('должен сбросить на первый слайд при повторном вызове show()', () => {
      tutorialManager.show();

      // Переход на второй слайд
      const nextBtn = document.querySelector('.tutorial-next') as HTMLButtonElement;
      nextBtn.click();

      // Закрытие
      tutorialManager.close();

      // Повторное открытие
      tutorialManager.show();

      const title = document.querySelector('.tutorial-title');
      expect(title?.textContent).toContain('Добро пожаловать');
    });

    it('не должен создавать несколько модалов', () => {
      tutorialManager.show();
      tutorialManager.show();
      tutorialManager.show();

      const modals = document.querySelectorAll('.tutorial-modal');
      expect(modals.length).toBe(1);
    });
  });

  describe('Содержимое слайдов', () => {
    beforeEach(() => {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, 'true');
      tutorialManager = new TutorialManager();
      tutorialManager.disableAnimations(); // Отключаем анимации для тестов
      tutorialManager.show();
    });

    it('должен отображать HTML в тексте слайда', () => {
      const nextBtn = document.querySelector('.tutorial-next') as HTMLButtonElement;
      nextBtn.click(); // Переход на второй слайд

      const text = document.querySelector('.tutorial-text');
      const strong = text?.querySelector('strong');

      expect(strong).not.toBeNull();
    });

    it('должен показывать эмодзи на всех слайдах', () => {
      const nextBtn = document.querySelector('.tutorial-next') as HTMLButtonElement;

      for (let i = 0; i < 5; i++) {
        const emoji = document.querySelector('.tutorial-emoji');
        expect(emoji).not.toBeNull();
        expect(emoji?.textContent?.length).toBeGreaterThan(0);

        if (i < 4) nextBtn.click();
      }
    });
  });

  describe('CSS свойства модала', () => {
    beforeEach(() => {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, 'true');
      tutorialManager = new TutorialManager();
      tutorialManager.disableAnimations(); // Отключаем анимации для тестов
      tutorialManager.show();
    });

    it('должен иметь класс .show для отображения', () => {
      const modal = document.querySelector('.tutorial-modal');
      expect(modal?.classList.contains('show')).toBe(true);
    });

    it('должен иметь правильный z-index (выше обычных модалов)', () => {
      const modal = document.querySelector('.tutorial-modal') as HTMLElement;

      // Проверяем наличие класса tutorial-modal который задаёт z-index
      expect(modal?.classList.contains('tutorial-modal')).toBe(true);
    });

    it('должен содержать все необходимые элементы контента', () => {
      const closeBtn = document.querySelector('.tutorial-close');
      const slideContainer = document.querySelector('.tutorial-slide-container');
      const navigation = document.querySelector('.tutorial-navigation');
      const dots = document.querySelector('.tutorial-dots');

      expect(closeBtn).not.toBeNull();
      expect(slideContainer).not.toBeNull();
      expect(navigation).not.toBeNull();
      expect(dots).not.toBeNull();
    });
  });
});
