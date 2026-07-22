import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { CumpleIndicador } from '../../common/enums/cumple-indicador.enum';
import { IndicadorCodigo } from '../../common/enums/indicador-codigo.enum';
import { ParametroFinanciero } from './parametro-financiero.entity';
import { Proceso } from './proceso.entity';

@Entity('proceso_indicadores')
@Unique('uk_proceso_indicador', ['procesoId', 'indicadorCodigo'])
export class ProcesoIndicador {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'proceso_id', type: 'bigint', unsigned: true })
  procesoId: number;

  @Column({
    name: 'indicador_codigo',
    type: 'enum',
    enum: IndicadorCodigo,
  })
  indicadorCodigo: IndicadorCodigo;

  @Column({
    name: 'valor_requerido',
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
  })
  valorRequerido: string | null;

  @Column({
    name: 'parametro_financiero_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  parametroFinancieroId: number | null;

  @Column({
    type: 'enum',
    enum: CumpleIndicador,
    nullable: true,
  })
  cumple: CumpleIndicador | null;

  @ManyToOne(() => Proceso, (proceso) => proceso.indicadores, { nullable: false })
  @JoinColumn({ name: 'proceso_id' })
  proceso: Proceso;

  @ManyToOne(() => ParametroFinanciero, { nullable: true })
  @JoinColumn({ name: 'parametro_financiero_id' })
  parametroFinanciero: ParametroFinanciero | null;
}
