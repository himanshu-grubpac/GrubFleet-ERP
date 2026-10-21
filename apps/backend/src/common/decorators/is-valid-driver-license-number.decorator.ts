import {
  getDriverLicenseValidationError,
  isValidDriverLicenseNumber,
} from '@grubpac/validation';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidDriverLicenseNumber', async: false })
export class IsValidDriverLicenseNumberConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return isValidDriverLicenseNumber(value);
  }

  defaultMessage(args: ValidationArguments): string {
    const value: unknown = args.value;
    if (typeof value === 'string') {
      return (
        getDriverLicenseValidationError(value) ?? 'License number is invalid'
      );
    }
    return 'License number is invalid';
  }
}

export function IsValidDriverLicenseNumber(
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidDriverLicenseNumberConstraint,
    });
  };
}
