import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-abbi-modal',
  standalone: true,
  templateUrl: './abbi-modal.component.html',
  styleUrl: './abbi-modal.component.scss',
})
export class AbbiModalComponent {
  readonly title = input.required<string>();
  readonly open = input(false);
  readonly loading = input(false);
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly showActions = input(true);

  readonly confirm = output<void>();
  readonly cancel = output<void>();

  protected onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('abbi-modal__backdrop')) {
      this.cancel.emit();
    }
  }
}
