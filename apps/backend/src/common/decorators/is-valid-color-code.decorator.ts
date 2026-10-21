import {
  getColorCodeValidationError,
  isValidColorCode,
} from '@grubpac/validation';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidColorCode', async: false })
export class IsValidColorCodeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null || value === '') {
      return true;
    }
    if (typeof value !== 'string') {
      return false;
    }
    return isValidColorCode(value);
  }

  defaultMessage(args: ValidationArguments): string {
    const value: unknown = args.value;
    if (typeof value === 'string') {
      return (
        getColorCodeValidationError(value) ?? 'Color code format is invalid'
      );
    }
    return 'Color code format is invalid';
  }
}

export function IsValidColorCode(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidColorCodeConstraint,
    });
  };
}
