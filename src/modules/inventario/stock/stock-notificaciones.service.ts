import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailService } from '../../../common/mail/mail.service';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { Usuario } from '../../usuarios/entities/usuario.entity';

interface AvisoStockBajo {
  productoNombre: string;
  unidadMedida: string;
  cantidadActual: number;
  stockMinimo: number;
}

@Injectable()
export class StockNotificacionesService {
  private readonly logger = new Logger(StockNotificacionesService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    private readonly mailService: MailService,
  ) {}

  async notificarStockBajo(aviso: AvisoStockBajo): Promise<void> {
    const administradores = await this.usuariosRepo.find({
      where: { rol: RolUsuario.ADMINISTRADOR, activo: true },
      select: { id: true, correo: true },
    });
    if (administradores.length === 0) {
      this.logger.warn(
        `Stock bajo en "${aviso.productoNombre}" pero no hay administradores activos a quién notificar.`,
      );
      return;
    }

    const asunto = `Stock bajo: ${aviso.productoNombre}`;
    const html = `
      <p>El producto <strong>${aviso.productoNombre}</strong> alcanzó un nivel de existencias bajo.</p>
      <ul>
        <li>Cantidad actual: ${aviso.cantidadActual} ${aviso.unidadMedida}</li>
        <li>Stock mínimo configurado: ${aviso.stockMinimo} ${aviso.unidadMedida}</li>
      </ul>
      <p>Revise el inventario y registre una entrada si es necesario.</p>
    `;

    const resultados = await Promise.allSettled(
      administradores.map((admin) =>
        this.mailService.enviarCorreo({
          destinatario: admin.correo,
          asunto,
          html,
        }),
      ),
    );
    resultados.forEach((resultado, indice) => {
      if (resultado.status === 'rejected') {
        this.logger.error(
          `No se pudo notificar stock bajo a ${administradores[indice].correo}: ${resultado.reason}`,
        );
      }
    });
  }
}
