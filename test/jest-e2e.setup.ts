/**
 * Variables de entorno requeridas para que AppModule compile en e2e cuando
 * no hay un .env presente (checkout limpio / CI). Solo aplica en tests: en
 * producción sigue exigiéndose un JWT_SECRET real via `getOrThrow`.
 */
process.env.JWT_SECRET ??= 'test-jwt-secret-not-for-production';
