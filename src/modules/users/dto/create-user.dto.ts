import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Rol } from '../../../common/enums/rol.enum';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsEmail()
  @MaxLength(255)
  correo: string;

  @IsEnum(Rol)
  rol: Rol;

  @IsOptional()
  @IsInt()
  paisId?: number;
}
