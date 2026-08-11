import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-table-pagination',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './table-pagination.component.html',
  styleUrl: './table-pagination.component.scss',
})
export class TablePaginationComponent {
  readonly page = input(1);
  readonly limit = input(20);
  readonly total = input(0);
  readonly limitOptions = input([10, 20, 50, 100]);

  readonly pageChange = output<number>();
  readonly limitChange = output<number>();

  protected readonly from = computed(() => {
    if (this.total() === 0) return 0;
    return (this.page() - 1) * this.limit() + 1;
  });

  protected readonly to = computed(() =>
    Math.min(this.page() * this.limit(), this.total()),
  );

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.limit())),
  );

  protected previous(): void {
    if (this.page() > 1) this.pageChange.emit(this.page() - 1);
  }

  protected next(): void {
    if (this.page() < this.totalPages()) this.pageChange.emit(this.page() + 1);
  }

  protected onLimitChange(value: string): void {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed > 0) {
      this.limitChange.emit(parsed);
      this.pageChange.emit(1);
    }
  }
}
