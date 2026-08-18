export interface MailConfig {
  apiKey: string;
  senderEmail: string;
  senderName: string;
}

/**
 * Configuración del envío de correo vía Brevo (API transaccional v3).
 * Ver .env.example: BREVO_API_KEY, MAIL_FROM_EMAIL, MAIL_FROM_NAME.
 */
export function buildMailConfig(
  get: (key: string) => string | undefined,
): MailConfig {
  return {
    apiKey: get('BREVO_API_KEY') ?? '',
    senderEmail: get('MAIL_FROM_EMAIL') ?? '',
    senderName: get('MAIL_FROM_NAME') ?? 'CTP 27 de Abril',
  };
}
