import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';
import { Rol } from '../../common/enums/rol.enum';
import { Pais } from './pais.entity';
import { SesionUsuario } from './sesion-usuario.entity';
import { TokenActivacion } from './token-activacion.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 255 })
  correo: string;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'varchar', length: 255, name: 'password_hash', nullable: true })
  passwordHash: string | null;

  @Column({ type: 'enum', enum: Rol })
  rol: Rol;

  @Column({ type: 'bigint', unsigned: true, name: 'pais_id', nullable: true })
  paisId: number | null;

  @ManyToOne(() => Pais, (pais) => pais.usuarios, { nullable: true })
  @JoinColumn({ name: 'pais_id' })
  pais: Pais | null;

  @Column({
    type: 'enum',
    enum: EstadoUsuario,
    default: EstadoUsuario.INACTIVO,
  })
  estado: EstadoUsuario;

  @Column({
    type: 'tinyint',
    unsigned: true,
    name: 'intentos_fallidos',
    default: 0,
  })
  intentosFallidos: number;

  @Column({
    type: 'datetime',
    name: 'fecha_creacion',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @Column({ type: 'boolean', default: false })
  eliminado: boolean;

  @Column({ type: 'datetime', name: 'fecha_eliminacion', nullable: true })
  fechaEliminacion: Date | null;

  @Column({
    type: 'bigint',
    unsigned: true,
    name: 'eliminado_por_id',
    nullable: true,
  })
  eliminadoPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'eliminado_por_id' })
  eliminadoPor: Usuario | null;

  @OneToMany(() => SesionUsuario, (sesion) => sesion.usuario)
  sesiones: SesionUsuario[];

  @OneToMany(() => TokenActivacion, (token) => token.usuario)
  tokensActivacion: TokenActivacion[];
}
