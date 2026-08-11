import { Component, HostListener, inject } from '@angular/core';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  protected readonly dialog = inject(ConfirmDialogService);

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.dialog.state()) {
      this.dialog.resolve(false);
    }
  }

  protected cancelar(): void {
    this.dialog.resolve(false);
  }

  protected confirmar(): void {
    this.dialog.resolve(true);
  }
}
