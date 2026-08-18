import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildMailConfig, MailConfig } from './mail.config';

interface EnviarCorreoParams {
  destinatario: string;
  asunto: string;
  html: string;
}

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly config: MailConfig;

  constructor(configService: ConfigService) {
    this.config = buildMailConfig((key) => configService.get<string>(key));

    if (!this.config.apiKey || !this.config.senderEmail) {
      this.logger.warn(
        'BREVO_API_KEY o MAIL_FROM_EMAIL no configurados: el envío de correo quedará deshabilitado.',
      );
    }
  }

  async enviarCorreo({
    destinatario,
    asunto,
    html,
  }: EnviarCorreoParams): Promise<void> {
    if (!this.config.apiKey || !this.config.senderEmail) {
      this.logger.warn(
        `Envío de correo omitido (sin configurar): destinatario=${destinatario}, asunto="${asunto}"`,
      );
      return;
    }

    const respuesta = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: this.config.senderEmail,
          name: this.config.senderName,
        },
        to: [{ email: destinatario }],
        subject: asunto,
        htmlContent: html,
      }),
    });

    if (!respuesta.ok) {
      const cuerpo = await respuesta.text();
      throw new Error(
        `Brevo respondió ${respuesta.status} al enviar correo a ${destinatario}: ${cuerpo}`,
      );
    }
  }
}
