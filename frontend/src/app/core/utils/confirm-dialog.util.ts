import { ConfirmDialogService } from '../services/confirm-dialog.service';

export function confirmarGuardado(
  dialog: ConfirmDialogService,
  message = '¿Desea guardar los cambios realizados?',
  confirmLabel = 'Guardar',
): Promise<boolean> {
  return dialog.confirm({
    title: 'Confirmar guardado',
    message,
    confirmLabel,
  });
}

export function confirmarCreacion(
  dialog: ConfirmDialogService,
  message = '¿Desea crear el registro?',
  confirmLabel = 'Crear',
): Promise<boolean> {
  return dialog.confirm({
    title: 'Confirmar creación',
    message,
    confirmLabel,
  });
}

export function confirmarAccion(
  dialog: ConfirmDialogService,
  config: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'primary' | 'danger';
  },
): Promise<boolean> {
  return dialog.confirm(config);
}
