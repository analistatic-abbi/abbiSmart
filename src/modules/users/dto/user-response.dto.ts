import { EstadoUsuario } from '../../../common/enums/estado-usuario.enum';
import { Rol } from '../../../common/enums/rol.enum';
import { Usuario } from '../../../database/entities/usuario.entity';

export class UserResponseDto {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  estado: EstadoUsuario;
  paisId: number | null;
  fechaCreacion: Date;

  static fromEntity(usuario: Usuario): UserResponseDto {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      estado: usuario.estado,
      paisId: usuario.paisId,
      fechaCreacion: usuario.fechaCreacion,
    };
  }
}
