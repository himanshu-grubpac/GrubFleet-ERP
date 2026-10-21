import { getPhoneValidationError, isValidPhone } from '@grubpac/validation';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidPhone', async: false })
export class IsValidPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return isValidPhone(value);
  }

  defaultMessage(args: ValidationArguments): string {
    const value: unknown = args.value;
    if (typeof value === 'string') {
      return getPhoneValidationError(value) ?? 'Phone number format is invalid';
    }
    return 'Phone number format is invalid';
  }
}

export function IsValidPhone(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidPhoneConstraint,
    });
  };
}
