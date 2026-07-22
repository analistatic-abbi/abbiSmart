import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateConfiguracionDto {
  @ApiProperty({ example: '7' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  valor: string;
}
