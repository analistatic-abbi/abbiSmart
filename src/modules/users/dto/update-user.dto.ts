import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { Rol } from '../../../common/enums/rol.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;

  @IsOptional()
  @IsInt()
  paisId?: number | null;
}
