import { getCprNoValidationError, isValidCprNo } from '@grubpac/validation';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidCprNo', async: false })
export class IsValidCprNoConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return isValidCprNo(value);
  }

  defaultMessage(args: ValidationArguments): string {
    const value: unknown = args.value;
    if (typeof value === 'string') {
      return getCprNoValidationError(value) ?? 'CPR number format is invalid';
    }
    return 'CPR number format is invalid';
  }
}

export function IsValidCprNo(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidCprNoConstraint,
    });
  };
}
