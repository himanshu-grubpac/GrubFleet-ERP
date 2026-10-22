import { validatePostalForCountry } from '@grubpac/validation';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidPostalForCountry', async: false })
export class IsValidPostalForCountryConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined || value === null || value === '') {
      return true;
    }
    if (typeof value !== 'string') {
      return false;
    }
    const countryField = args.constraints[0] as string;
    const country = (args.object as Record<string, unknown>)[countryField];
    if (typeof country !== 'string' || !country.trim()) {
      return false;
    }
    return validatePostalForCountry(country, value).ok;
  }

  defaultMessage(args: ValidationArguments): string {
    const value: unknown = args.value;
    const countryField = args.constraints[0] as string;
    const country = (args.object as Record<string, unknown>)[countryField];
    if (typeof value === 'string' && typeof country === 'string') {
      const result = validatePostalForCountry(country, value);
      if (!result.ok) {
        return result.message;
      }
    }
    return 'addressPincode format is invalid';
  }
}

export function IsValidPostalForCountry(
  countryProperty: string,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [countryProperty],
      validator: IsValidPostalForCountryConstraint,
    });
  };
}
