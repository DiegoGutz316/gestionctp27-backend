import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class IdempotencyKeyPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string' || !UUID.test(value)) {
      throw new BadRequestException(
        'El header Idempotency-Key es obligatorio y debe ser un UUID válido.',
      );
    }
    return value.toLowerCase();
  }
}
