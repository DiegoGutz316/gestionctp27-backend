import { Logger, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { buildDatabaseOptions } from './database/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { PermisosGuard } from './modules/auth/guards/permisos.guard';
import { PecuariaModule } from './modules/pecuaria/pecuaria.module';
import { AgricolaModule } from './modules/agricola/agricola.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { LibroCajaModule } from './modules/libro-caja/libro-caja.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { ComunicacionModule } from './modules/comunicacion/comunicacion.module';
import { LandingModule } from './modules/landing/landing.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { OriginCsrfGuard } from './common/http/origin-csrf.guard';
import { ThrottlerPorSesionGuard } from './common/throttler/throttler-por-sesion.guard';
import { MailModule } from './common/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...buildDatabaseOptions((key) => config.get<string>(key)),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: false,
        autoLoadEntities: true,
      }),
      // La app debe poder compilar y arrancar aunque la BD no esté disponible:
      // si la conexión falla se registra una advertencia en lugar de tumbar el proceso.
      dataSourceFactory: async (options) => {
        const dataSource = new DataSource(options!);
        try {
          await dataSource.initialize();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          new Logger('TypeORM').warn(
            `No se pudo conectar a la base de datos (la API arranca igualmente): ${message}`,
          );
          // @nestjs/typeorm vuelve a llamar a initialize() y reintenta hasta
          // tumbar el proceso; se neutraliza para que el arranque continúe.
          (dataSource as { initialize: () => Promise<DataSource> }).initialize =
            () => Promise.resolve(dataSource);
        }
        return dataSource;
      },
    }),
    MailModule,
    UsuariosModule,
    AuthModule,
    PecuariaModule,
    AgricolaModule,
    InventarioModule,
    LibroCajaModule,
    ReportesModule,
    ComunicacionModule,
    LandingModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    },
    // Cuenta el limite por sesion y no por IP: en el laboratorio del colegio
    // todas las maquinas salen con la misma IP publica.
    { provide: APP_GUARD, useClass: ThrottlerPorSesionGuard },
    { provide: APP_GUARD, useClass: OriginCsrfGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Backlog 1.6: autorizacion por matriz de permisos. Va despues de
    // JwtAuthGuard para que request.user ya tenga el rol.
    { provide: APP_GUARD, useClass: PermisosGuard },
  ],
})
export class AppModule {}
