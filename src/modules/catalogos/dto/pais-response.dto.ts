import { ApiProperty } from '@nestjs/swagger';

export class PaisResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  activo: boolean;
}
