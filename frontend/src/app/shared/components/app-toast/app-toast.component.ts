import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './app-toast.component.html',
  styleUrl: './app-toast.component.scss',
})
export class AppToastComponent {
  protected readonly toast = inject(ToastService);

  protected dismiss(id: number): void {
    this.toast.dismiss(id);
  }
}
