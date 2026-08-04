import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Publico } from './modules/auth/decorators/publico.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Publico()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
