import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SearchableSelectOption<T = number | string> {
  value: T;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './searchable-select.component.html',
  styleUrl: './searchable-select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
})
export class SearchableSelectComponent<T = number | string> implements ControlValueAccessor {
  readonly options = input<SearchableSelectOption<T>[]>([]);
  readonly placeholder = input('Seleccione...');
  readonly searchPlaceholder = input('Buscar...');
  readonly emptyMessage = input('Sin resultados');
  readonly minOptionsForSearch = input(8);

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  protected readonly open = signal(false);
  protected readonly search = signal('');
  protected readonly selectedValue = signal<T | null>(null);
  protected readonly isDisabled = signal(false);

  protected readonly showSearch = computed(() => this.options().length >= this.minOptionsForSearch());

  protected readonly selectedLabel = computed(() => {
    const value = this.selectedValue();
    if (value === null || value === undefined || value === '') {
      return '';
    }
    return this.options().find((option) => this.sameValue(option.value, value))?.label ?? '';
  });

  protected readonly filteredOptions = computed(() => {
    const query = this.search().trim().toLowerCase();
    const options = this.options();
    if (!query) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(query));
  });

  private onChange: (value: T | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: T | null): void {
    this.selectedValue.set(value ?? null);
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
    if (isDisabled) {
      this.open.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.close();
    }
  }

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  protected toggle(): void {
    if (this.isDisabled()) {
      return;
    }
    if (this.open()) {
      this.close();
      return;
    }
    this.open.set(true);
    this.search.set('');
    queueMicrotask(() => this.searchInput?.nativeElement.focus());
  }

  protected selectOption(option: SearchableSelectOption<T>): void {
    if (option.disabled) {
      return;
    }
    this.selectedValue.set(option.value);
    this.onChange(option.value);
    this.close();
  }

  protected clearSelection(event: MouseEvent): void {
    event.stopPropagation();
    this.selectedValue.set(null);
    this.onChange(null);
    this.close();
  }

  protected isSelected(option: SearchableSelectOption<T>): boolean {
    const value = this.selectedValue();
    if (value === null || value === undefined || value === '') {
      return false;
    }
    return this.sameValue(option.value, value);
  }

  private close(): void {
    this.open.set(false);
    this.search.set('');
    this.onTouched();
  }

  private sameValue(a: T, b: T): boolean {
    return a === b || String(a) === String(b);
  }
}
