import { getGstinValidationError, isValidGstin } from '@grubpac/validation';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidGstin', async: false })
export class IsValidGstinConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null || value === '') {
      return true;
    }
    if (typeof value !== 'string') {
      return false;
    }
    return isValidGstin(value);
  }

  defaultMessage(args: ValidationArguments): string {
    const value: unknown = args.value;
    if (typeof value === 'string') {
      return getGstinValidationError(value) ?? 'Tax ID must be a valid GSTIN';
    }
    return 'Tax ID must be a valid GSTIN';
  }
}

export function IsValidGstin(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidGstinConstraint,
    });
  };
}
