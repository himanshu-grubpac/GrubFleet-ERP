import {
  isValidIso31661Alpha2Country,
  normalizeCountryCode,
} from '@grubpac/validation';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isIso31661Alpha2Country', async: false })
export class IsIso31661Alpha2CountryConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    const normalized = normalizeCountryCode(value);
    if (!/^[A-Z]{2}$/.test(normalized)) {
      return false;
    }
    return isValidIso31661Alpha2Country(normalized);
  }

  defaultMessage(): string {
    return 'addressCountry must be a valid ISO 3166-1 alpha-2 country code';
  }
}

export function IsIso31661Alpha2Country(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsIso31661Alpha2CountryConstraint,
    });
  };
}
