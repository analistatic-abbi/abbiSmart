import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AbbiModalComponent } from '../../../../shared/components/abbi-modal/abbi-modal.component';
import {
  SearchableSelectComponent,
  SearchableSelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { KamContactoProceso } from '../../../../core/models/kam.model';
import { FormatoEncuestaListItem } from '../../../../core/models/formato-encuesta.model';

@Component({
  selector: 'app-asignar-formato-modal',
  standalone: true,
  imports: [FormsModule, AbbiModalComponent, SearchableSelectComponent],
  templateUrl: './asignar-formato-modal.component.html',
  styleUrl: './asignar-formato-modal.component.scss',
})
export class AsignarFormatoModalComponent {
  readonly open = input(false);
  readonly loading = input(false);
  readonly contactos = input<KamContactoProceso[]>([]);
  readonly formatos = input<FormatoEncuestaListItem[]>([]);

  readonly confirm = output<{ formatoEncuestaId: number; contactoId: number }>();
  readonly cancel = output<void>();

  protected readonly contactoId = signal<number | null>(null);
  protected readonly formatoId = signal<number | null>(null);

  protected readonly contactoOptions = computed<SearchableSelectOption<number>[]>(() =>
    this.contactos().map((c) => ({
      value: c.contactoId,
      label: c.cargo ? `${c.nombre} · ${c.cargo}` : c.nombre,
    })),
  );

  protected readonly formatoOptions = computed(() =>
    this.formatos().map((f) => ({ value: f.id, label: f.nombre })),
  );

  protected onConfirm(): void {
    const formatoEncuestaId = this.formatoId();
    const contactoId = this.contactoId();
    if (!formatoEncuestaId || !contactoId) return;
    this.confirm.emit({ formatoEncuestaId, contactoId });
  }

  protected onCancel(): void {
    this.contactoId.set(null);
    this.formatoId.set(null);
    this.cancel.emit();
  }

  protected resetOnOpen(): void {
    if (this.open()) {
      this.contactoId.set(null);
      this.formatoId.set(null);
    }
  }
}
