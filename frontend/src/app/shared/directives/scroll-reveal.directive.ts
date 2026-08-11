import { Directive, ElementRef, inject, input, OnDestroy, OnInit } from '@angular/core';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  private readonly element = inject(ElementRef<HTMLElement>);

  readonly revealDelay = input(0, { alias: 'appScrollReveal' });

  private observer: IntersectionObserver | null = null;
  private revealTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const el = this.element.nativeElement;
    el.classList.add('scroll-reveal');

    if (this.prefersReducedMotion()) {
      el.classList.add('is-revealed');
      el.dispatchEvent(new CustomEvent('scrollReveal', { bubbles: true }));
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const delay = this.revealDelay();
          this.revealTimer = setTimeout(() => {
            el.classList.add('is-revealed');
            el.dispatchEvent(new CustomEvent('scrollReveal', { bubbles: true }));
          }, delay);

          this.observer?.unobserve(el);
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    if (this.revealTimer) {
      clearTimeout(this.revealTimer);
    }
    this.observer?.disconnect();
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
