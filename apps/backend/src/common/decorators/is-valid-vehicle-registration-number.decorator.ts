import {
  getVehicleRegistrationValidationError,
  isValidVehicleRegistrationNumber,
} from '@grubpac/validation';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidVehicleRegistrationNumber', async: false })
export class IsValidVehicleRegistrationNumberConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return isValidVehicleRegistrationNumber(value);
  }

  defaultMessage(args: ValidationArguments): string {
    const value: unknown = args.value;
    if (typeof value === 'string') {
      return (
        getVehicleRegistrationValidationError(value) ??
        'Registration number is invalid'
      );
    }
    return 'Registration number is invalid';
  }
}

export function IsValidVehicleRegistrationNumber(
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidVehicleRegistrationNumberConstraint,
    });
  };
}
