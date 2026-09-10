import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { LibroCajaPolicy } from '../libro-caja.policy';
import { ActualizarInformacionColegioDto } from './dto/actualizar-informacion-colegio.dto';
import { InformacionColegio } from './entities/informacion-colegio.entity';
import {
  mapearInformacionColegio,
  type InformacionColegioRespuesta,
} from './respuestas/colegio.mapper';

const NOMBRE_COLEGIO_PREDETERMINADO = 'CTP 27 de abril';

@Injectable()
export class ColegioService {
  constructor(
    @InjectRepository(InformacionColegio)
    private readonly colegioRepo: Repository<InformacionColegio>,
    private readonly policy: LibroCajaPolicy,
  ) {}

  async obtener(): Promise<InformacionColegioRespuesta> {
    return mapearInformacionColegio(await this.obtenerOCrear());
  }

  async actualizar(
    dto: ActualizarInformacionColegioDto,
    actor: UsuarioAutenticado,
  ): Promise<InformacionColegioRespuesta> {
    this.policy.exigirAdministrador(actor);
    const colegio = await this.obtenerOCrear();
    colegio.nombre = dto.nombre;
    colegio.numeroCuentaBancaria = dto.numeroCuentaBancaria;
    colegio.entidadDeposito = dto.entidadDeposito;
    colegio.actualizadoPor = actor.id;
    return mapearInformacionColegio(await this.colegioRepo.save(colegio));
  }

  private async obtenerOCrear(): Promise<InformacionColegio> {
    const existente = await this.colegioRepo.findOne({ where: { id: 1 } });
    if (existente) return existente;

    const creado = this.colegioRepo.create({
      id: 1,
      nombre: NOMBRE_COLEGIO_PREDETERMINADO,
      numeroCuentaBancaria: '',
      entidadDeposito: '',
      actualizadoPor: null,
    });
    try {
      return await this.colegioRepo.save(creado);
    } catch {
      const recienCreado = await this.colegioRepo.findOne({ where: { id: 1 } });
      if (recienCreado) return recienCreado;
      throw new NotFoundException('No se encontró la información del colegio.');
    }
  }
}
