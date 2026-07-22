import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class EliminarEntidadQueryDto {
  @ApiPropertyOptional({
    description:
      'Forzar eliminación aunque existan dependientes (solo Administrador)',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  confirmarDependientes?: boolean;
}
