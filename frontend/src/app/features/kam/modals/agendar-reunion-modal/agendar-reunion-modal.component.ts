import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AbbiModalComponent } from '../../../../shared/components/abbi-modal/abbi-modal.component';

@Component({
  selector: 'app-agendar-reunion-modal',
  standalone: true,
  imports: [FormsModule, AbbiModalComponent],
  templateUrl: './agendar-reunion-modal.component.html',
  styleUrl: './agendar-reunion-modal.component.scss',
})
export class AgendarReunionModalComponent {
  readonly open = input(false);
  readonly loading = input(false);
  readonly fechaInicial = input('');

  readonly confirm = output<string>();
  readonly cancel = output<void>();

  protected readonly fecha = signal('');

  protected onConfirm(): void {
    const value = this.fecha().trim();
    if (!value) return;
    this.confirm.emit(value);
  }

  protected onCancel(): void {
    this.fecha.set('');
    this.cancel.emit();
  }

  protected syncFecha(): void {
    if (this.open() && this.fechaInicial()) {
      this.fecha.set(this.fechaInicial());
    }
  }
}
