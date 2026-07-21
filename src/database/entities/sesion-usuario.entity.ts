import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Pais } from './pais.entity';
import { Usuario } from './usuario.entity';

@Entity('sesiones_usuario')
export class SesionUsuario {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'bigint', unsigned: true, name: 'usuario_id' })
  usuarioId: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.sesiones)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ type: 'bigint', unsigned: true, name: 'pais_sesion_id' })
  paisSesionId: number;

  @ManyToOne(() => Pais, (pais) => pais.sesiones)
  @JoinColumn({ name: 'pais_sesion_id' })
  paisSesion: Pais;

  @Column({ type: 'varchar', length: 255, name: 'token_sesion' })
  tokenSesion: string;

  @Column({
    type: 'datetime',
    name: 'fecha_inicio',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaInicio: Date;

  @Column({ type: 'datetime', name: 'fecha_expiracion' })
  fechaExpiracion: Date;
}
