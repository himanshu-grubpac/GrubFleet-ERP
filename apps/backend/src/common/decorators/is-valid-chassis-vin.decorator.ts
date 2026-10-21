import {
  getChassisVinValidationError,
  isValidChassisVin,
} from '@grubpac/validation';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidChassisVin', async: false })
export class IsValidChassisVinConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return isValidChassisVin(value);
  }

  defaultMessage(args: ValidationArguments): string {
    const value: unknown = args.value;
    if (typeof value === 'string') {
      return (
        getChassisVinValidationError(value) ?? 'Chassis / VIN format is invalid'
      );
    }
    return 'Chassis / VIN format is invalid';
  }
}

export function IsValidChassisVin(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidChassisVinConstraint,
    });
  };
}
