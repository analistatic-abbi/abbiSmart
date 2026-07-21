import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '../../common/enums/rol.enum';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@ApiTags('Auditoría')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Consultar registros de auditoría (solo Administrador)' })
  async findAll(@Query() query: AuditQueryDto) {
    const result = await this.auditService.findAll(query);

    return {
      message: 'Registros de auditoría obtenidos correctamente',
      ...result,
    };
  }
}
