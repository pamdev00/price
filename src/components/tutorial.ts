import { TutorialSlide, STORAGE_KEYS } from '../constants';

// Массив слайдов инструкции
const TUTORIAL_SLIDES: TutorialSlide[] = [
  {
    id: 1,
    title: 'Добро пожаловать! 👋',
    text: 'ЦенаЗа1 поможет вам сравнить цены и найти самый выгодный товар.',
    emoji: '👋'
  },
  {
    id: 2,
    title: 'Добавьте первый товар',
    text: 'Введите <strong>название</strong>, <strong>цену</strong> и <strong>количество</strong> товара. Например: «Молоко 100 ₽ за 1000 г».',
    emoji: '📝'
  },
  {
    id: 3,
    title: 'Выберите единицу измерения',
    text: 'Нажмите на кнопку: <strong>граммы</strong>, <strong>миллилитры</strong> или <strong>штуки</strong>. Приложение само рассчитает цену за единицу.',
    emoji: '⚖️'
  },
  {
    id: 4,
    title: 'Сравните и выберите лучшее',
    text: 'Добавьте несколько товаров. Самый выгодный будет отмечен значком <strong>🏆 Лучшая цена</strong>.',
    emoji: '🏆'
  },
  {
    id: 5,
    title: 'Готово к использованию!',
    text: 'Если нужна помощь — нажмите на <strong>?</strong> в верхнем правом углу. Приятных покупок! 🛒',
    emoji: '🎉'
  }
];

export class TutorialManager {
  private modal: HTMLDivElement | null = null;
  private currentSlide: number = 0;
  private slides: TutorialSlide[] = TUTORIAL_SLIDES;
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;
  private animationsDisabled: boolean = false; // Флаг для отключения анимаций в тестах

  constructor() {
    this.checkFirstVisit();
  }

  // Проверка первого запуска
  private checkFirstVisit(): void {
    const tutorialSeen = localStorage.getItem(STORAGE_KEYS.TUTORIAL_SEEN);
    if (!tutorialSeen) {
      // Показать с задержкой 500ms чтобы приложение успело загрузиться
      setTimeout(() => {
        this.show();
      }, 500);
    }
  }

  // Показать инструкцию
  show(): void {
    this.currentSlide = 0;
    this.createModal();
    this.renderSlide();
  }

  // Создать модальное окно
  private createModal(): void {
    if (this.modal) {
      return;
    }

    // Overlay
    this.modal = document.createElement('div');
    this.modal.className = 'modal-overlay tutorial-modal show';
    this.modal.innerHTML = `
      <div class="modal tutorial-content">
        <button class="tutorial-close" aria-label="Закрыть">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="tutorial-slide-container">
          <!-- Слайды рендерятся здесь -->
        </div>
        <div class="tutorial-navigation">
          <button class="tutorial-btn tutorial-skip">Пропустить</button>
          <div class="tutorial-dots">
            <!-- Индикаторы слайдов -->
          </div>
          <div class="tutorial-buttons">
            <button class="tutorial-btn tutorial-back" style="display: none;">Назад</button>
            <button class="tutorial-btn tutorial-next accent">Далее</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.attachEventListeners();
  }

  // Рендер текущего слайда с анимацией
  private renderSlide(direction: 'next' | 'prev' | 'none' = 'none'): void {
    if (!this.modal) return;

    const slide = this.slides[this.currentSlide];
    const container = this.modal.querySelector('.tutorial-slide-container') as HTMLElement;

    if (!container) return;

    // Если анимации отключены (для тестов) - рендерим сразу
    if (this.animationsDisabled || direction === 'none') {
      container.innerHTML = `
        ${slide.emoji ? `<div class="tutorial-emoji">${slide.emoji}</div>` : ''}
        <h2 class="tutorial-title">${slide.title}</h2>
        <p class="tutorial-text">${slide.text}</p>
        ${slide.imageSrc ? `<img src="${slide.imageSrc}" alt="${slide.title}" class="tutorial-image">` : ''}
      `;
    } else {
      // Определяем классы анимации
      const exitClass = direction === 'next' ? 'tutorial-slide-exit' :
                        direction === 'prev' ? 'tutorial-slide-exit-back' : '';
      const enterClass = direction === 'next' ? 'tutorial-slide-enter' :
                         direction === 'prev' ? 'tutorial-slide-enter-back' : '';

      // Анимированный переход
      // Добавляем класс выхода
      container.classList.add(exitClass);

      // После окончания анимации выхода меняем содержимое и анимируем вход
      setTimeout(() => {
        // Проверяем что модал всё ещё существует
        if (!this.modal || !container.isConnected) return;

        container.innerHTML = `
          ${slide.emoji ? `<div class="tutorial-emoji">${slide.emoji}</div>` : ''}
          <h2 class="tutorial-title">${slide.title}</h2>
          <p class="tutorial-text">${slide.text}</p>
          ${slide.imageSrc ? `<img src="${slide.imageSrc}" alt="${slide.title}" class="tutorial-image">` : ''}
        `;

        // Удаляем класс выхода и добавляем вход
        container.classList.remove(exitClass);
        container.classList.add(enterClass);

        // Удаляем класс входа после окончания анимации
        setTimeout(() => {
          if (container.isConnected) {
            container.classList.remove(enterClass);
          }
        }, 300);
      }, 300);
    }

    this.updateNavigation();
    this.updateDots();
  }

  // Обновить навигацию
  private updateNavigation(): void {
    if (!this.modal) return;

    const backBtn = this.modal.querySelector('.tutorial-back') as HTMLButtonElement;
    const nextBtn = this.modal.querySelector('.tutorial-next') as HTMLButtonElement;

    // Кнопка "Назад" - скрыта на первом слайде
    if (backBtn) {
      backBtn.style.display = this.currentSlide === 0 ? 'none' : 'inline-block';
    }

    // Кнопка "Далее" / "Начать работу"
    if (nextBtn) {
      const isLastSlide = this.currentSlide === this.slides.length - 1;
      nextBtn.textContent = isLastSlide ? 'Начать работу' : 'Далее';
    }
  }

  // Обновить индикаторы (точки)
  private updateDots(): void {
    if (!this.modal) return;

    const dotsContainer = this.modal.querySelector('.tutorial-dots');
    if (!dotsContainer) return;

    dotsContainer.innerHTML = this.slides
      .map((_, index) => `
        <span class="tutorial-dot ${index === this.currentSlide ? 'active' : ''}"></span>
      `)
      .join('');
  }

  // Обработчики событий
  private attachEventListeners(): void {
    if (!this.modal) return;

    // Закрыть
    const closeBtn = this.modal.querySelector('.tutorial-close');
    closeBtn?.addEventListener('click', () => this.close());

    // Пропустить
    const skipBtn = this.modal.querySelector('.tutorial-skip');
    skipBtn?.addEventListener('click', () => this.close());

    // Назад
    const backBtn = this.modal.querySelector('.tutorial-back');
    backBtn?.addEventListener('click', () => this.prevSlide());

    // Далее
    const nextBtn = this.modal.querySelector('.tutorial-next');
    nextBtn?.addEventListener('click', () => this.nextSlide());

    // Закрытие по клику на overlay
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Keyboard navigation
    this.keyboardHandler = this.handleKeyboard.bind(this);
    document.addEventListener('keydown', this.keyboardHandler);
  }

  // Keyboard navigation
  private handleKeyboard(e: KeyboardEvent): void {
    if (!this.modal) return;

    switch (e.key) {
      case 'ArrowRight':
        this.nextSlide();
        break;
      case 'ArrowLeft':
        this.prevSlide();
        break;
      case 'Escape':
        this.close();
        break;
    }
  }

  // Следующий слайд
  private nextSlide(): void {
    if (this.currentSlide < this.slides.length - 1) {
      this.currentSlide++;
      this.renderSlide('next');
    } else {
      // Последний слайд - закрыть
      this.close();
    }
  }

  // Предыдущий слайд
  private prevSlide(): void {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.renderSlide('prev');
    }
  }

  // Закрыть инструкцию
  close(): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }

    // Отметить что инструкция была показана
    localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, 'true');

    // Удалить keyboard listener
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }

  // Добавить новый слайд (для будущего расширения)
  addSlide(slide: TutorialSlide): void {
    this.slides.push(slide);
  }

  // Отключить анимации (для тестов)
  disableAnimations(): void {
    this.animationsDisabled = true;
  }

  // Очистить флаг "инструкция просмотрена" (для тестирования)
  reset(): void {
    localStorage.removeItem(STORAGE_KEYS.TUTORIAL_SEEN);
  }
}
