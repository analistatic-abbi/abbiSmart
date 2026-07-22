import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { IndicadorCodigo } from '../../common/enums/indicador-codigo.enum';
import { ReglaCumplimiento } from '../../common/enums/regla-cumplimiento.enum';
import { Pais } from './pais.entity';
import { Usuario } from './usuario.entity';

@Entity('parametros_financieros')
@Unique('uk_parametro_anio', ['paisId', 'indicadorCodigo', 'anio'])
export class ParametroFinanciero {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'pais_id', type: 'bigint', unsigned: true })
  paisId: number;

  @Column({
    name: 'indicador_codigo',
    type: 'enum',
    enum: IndicadorCodigo,
  })
  indicadorCodigo: IndicadorCodigo;

  @Column({ type: 'smallint', unsigned: true })
  anio: number;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  valor: string;

  @Column({
    name: 'regla_cumplimiento',
    type: 'enum',
    enum: ReglaCumplimiento,
  })
  reglaCumplimiento: ReglaCumplimiento;

  @Column({ name: 'usuario_modifico_id', type: 'bigint', unsigned: true })
  usuarioModificoId: number;

  @Column({
    name: 'fecha_modificacion',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaModificacion: Date;

  @ManyToOne(() => Pais, { nullable: false })
  @JoinColumn({ name: 'pais_id' })
  pais: Pais;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_modifico_id' })
  usuarioModifico: Usuario;
}
