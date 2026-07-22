import { ApiProperty } from '@nestjs/swagger';

export class UbicacionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  paisId: number;

  @ApiProperty()
  departamento: string;

  @ApiProperty()
  municipioProvincia: string;
}
