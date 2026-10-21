import { validateIsoCalendarDate } from '@grubpac/validation';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export type IsoCalendarDateValidationOptions = {
  allowFuture?: boolean;
};

@ValidatorConstraint({ name: 'isIsoCalendarDate', async: false })
export class IsIsoCalendarDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined || value === null || value === '') {
      return true;
    }
    if (typeof value !== 'string') {
      return false;
    }
    const options = (args.constraints[0] ?? {}) as IsoCalendarDateValidationOptions;
    return validateIsoCalendarDate(value, options).ok;
  }

  defaultMessage(args: ValidationArguments): string {
    const value: unknown = args.value;
    const options = (args.constraints[0] ?? {}) as IsoCalendarDateValidationOptions;
    if (typeof value === 'string') {
      const result = validateIsoCalendarDate(value, options);
      if (!result.ok) {
        return result.message;
      }
    }
    return 'Must be an ISO 8601 calendar date (YYYY-MM-DD)';
  }
}

export function IsIsoCalendarDate(
  options?: IsoCalendarDateValidationOptions,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [options ?? {}],
      validator: IsIsoCalendarDateConstraint,
    });
  };
}
