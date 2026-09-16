import {
  registerDecorator,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'dosDecimalesSiembra', async: false })
class DosDecimalesSiembraConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      Math.abs(value * 100 - Math.round(value * 100)) < Number.EPSILON * 100
    );
  }
}

export function TieneMaximoDosDecimales(
  opciones?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      target: target.constructor,
      propertyName: String(propertyName),
      options: opciones,
      validator: DosDecimalesSiembraConstraint,
    });
  };
}
