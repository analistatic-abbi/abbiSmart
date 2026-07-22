import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstadoSolicitudEliminacion } from '../../common/enums/estado-solicitud-eliminacion.enum';
import { Usuario } from './usuario.entity';

@Entity('solicitudes_eliminacion')
export class SolicitudEliminacion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'entidad_tipo', type: 'varchar', length: 50 })
  entidadTipo: string;

  @Column({ name: 'entidad_id', type: 'bigint', unsigned: true })
  entidadId: number;

  @Column({ name: 'usuario_solicitante_id', type: 'bigint', unsigned: true })
  usuarioSolicitanteId: number;

  @Column({ type: 'text' })
  motivo: string;

  @Column({
    type: 'enum',
    enum: EstadoSolicitudEliminacion,
    default: EstadoSolicitudEliminacion.PENDIENTE,
  })
  estado: EstadoSolicitudEliminacion;

  @Column({ name: 'usuario_resuelve_id', type: 'bigint', unsigned: true, nullable: true })
  usuarioResuelveId: number | null;

  @Column({
    name: 'fecha_solicitud',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaSolicitud: Date;

  @Column({ name: 'fecha_resolucion', type: 'datetime', nullable: true })
  fechaResolucion: Date | null;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_solicitante_id' })
  usuarioSolicitante: Usuario;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_resuelve_id' })
  usuarioResuelve: Usuario | null;
}
