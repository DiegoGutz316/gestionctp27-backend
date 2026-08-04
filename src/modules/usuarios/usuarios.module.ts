import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosController } from './controllers/usuarios.controller';
import { Rol } from './entities/rol.entity';
import { Usuario } from './entities/usuario.entity';
import { UsuariosService } from './services/usuarios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Rol])],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
