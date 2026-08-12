import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';
import { CreateSupportTicketInput } from './monday.types';

/** Column IDs del board HelpDesk ABBI (9150513634). */
const COL = {
  correo: 'text_mkr03417',
  cargo: 'text_mkqzk7mj',
  sede: 'text_mkr3khrw',
  tipoSolicitud: 'text_mkr3r4',
  descripcion: 'text_mkr3y6sw',
  estado: 'project_status',
  fecha: 'date_mkqzzea4',
  horaLlegada: 'hour_mm2edy5m',
} as const;

/** Estado "No iniciado" en project_status. */
const ESTADO_NO_INICIADO_INDEX = 5;

@Injectable()
export class MondayService {
  private readonly logger = new Logger(MondayService.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.configService.get<string>('monday.apiToken')?.trim());
  }

  async createSupportTicket(input: CreateSupportTicketInput): Promise<{ itemId: string }> {
    const apiToken = this.configService.get<string>('monday.apiToken')?.trim();
    if (!apiToken) {
      throw new BusinessException(
        ErrorCode.SOPORTE_MONDAY_NO_CONFIGURADO,
        'El servicio de soporte no está configurado. Contacte al administrador.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const apiUrl =
      this.configService.get<string>('monday.apiUrl') ?? 'https://api.monday.com/v2';
    const boardId = Number(
      this.configService.get<string>('monday.boardId') ?? '9150513634',
    );
    const groupId =
      this.configService.get<string>('monday.groupId') ?? 'new_group29179';

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const columnValues: Record<string, unknown> = {
      [COL.correo]: input.correo,
      [COL.cargo]: input.rol,
      [COL.tipoSolicitud]: input.tipoSolicitud,
      [COL.descripcion]: input.descripcion,
      [COL.estado]: { index: ESTADO_NO_INICIADO_INDEX },
      [COL.fecha]: { date: dateStr },
      [COL.horaLlegada]: {
        hour: now.getHours(),
        minute: now.getMinutes(),
      },
    };

    if (input.sede) {
      columnValues[COL.sede] = input.sede;
    }

    const query = `
      mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId
          group_id: $groupId
          item_name: $itemName
          column_values: $columnValues
        ) {
          id
        }
      }
    `;

    const variables = {
      boardId: String(boardId),
      groupId,
      itemName: input.nombre.slice(0, 255) || 'Solicitud de soporte',
      columnValues: JSON.stringify(columnValues),
    };

    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiToken,
          'API-Version': '2024-10',
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch (err) {
      this.logger.error(
        `Error de red al crear ticket en Monday: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BusinessException(
        ErrorCode.SOPORTE_MONDAY_ERROR,
        'No fue posible registrar la solicitud de soporte. Intente más tarde.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const body = (await response.json()) as {
      data?: { create_item?: { id?: string } };
      errors?: Array<{ message?: string }>;
      error_message?: string;
    };

    if (!response.ok || body.errors?.length || body.error_message) {
      this.logger.error(
        `Monday rechazó create_item (status=${response.status}): ${
          body.error_message ?? body.errors?.map((e) => e.message).join('; ') ?? 'sin detalle'
        }`,
      );
      throw new BusinessException(
        ErrorCode.SOPORTE_MONDAY_ERROR,
        'No fue posible registrar la solicitud de soporte. Intente más tarde.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const itemId = body.data?.create_item?.id;
    if (!itemId) {
      this.logger.error('Monday no devolvió id de ítem al crear ticket de soporte');
      throw new BusinessException(
        ErrorCode.SOPORTE_MONDAY_ERROR,
        'No fue posible registrar la solicitud de soporte. Intente más tarde.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    this.logger.log(`Ticket de soporte creado en Monday: ${itemId}`);
    return { itemId };
  }
}
