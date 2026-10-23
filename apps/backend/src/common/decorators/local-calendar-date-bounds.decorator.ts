import {
  getLocalCalendarDateToday,
  getLocalCalendarYear,
  getLocalCalendarYearMonth,
  isYearMonthAfterCurrentLocal,
} from '@grubpac/validation';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

@ValidatorConstraint({ name: 'isNotAfterLocalToday', async: false })
export class IsNotAfterLocalTodayConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (isEmpty(value)) return true;
    if (typeof value !== 'string') return false;
    return value.slice(0, 10) <= getLocalCalendarDateToday();
  }

  defaultMessage(): string {
    return 'Date must not be after today';
  }
}

export function IsNotAfterLocalToday(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsNotAfterLocalTodayConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isNotBeforeLocalToday', async: false })
export class IsNotBeforeLocalTodayConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (isEmpty(value)) return true;
    if (typeof value !== 'string') return false;
    return value.slice(0, 10) >= getLocalCalendarDateToday();
  }

  defaultMessage(): string {
    return 'Date must not be before today';
  }
}

export function IsNotBeforeLocalToday(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsNotBeforeLocalTodayConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isIsoDateOnOrAfterProperty', async: false })
export class IsIsoDateOnOrAfterPropertyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (isEmpty(value)) return true;
    if (typeof value !== 'string') return false;
    const siblingName = args.constraints[0] as string;
    const sibling = (args.object as Record<string, unknown>)[siblingName];
    if (isEmpty(sibling) || typeof sibling !== 'string') return true;
    return value.slice(0, 10) >= sibling.slice(0, 10);
  }

  defaultMessage(args: ValidationArguments): string {
    const siblingName = args.constraints[0] as string;
    return `${args.property} must be on or after ${siblingName}`;
  }
}

export function IsIsoDateOnOrAfterProperty(
  propertyName: string,
  validationOptions?: ValidationOptions,
) {
  return (object: object, decoratedProperty: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: decoratedProperty,
      options: validationOptions,
      constraints: [propertyName],
      validator: IsIsoDateOnOrAfterPropertyConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'maxCurrentLocalCalendarYear', async: false })
export class MaxCurrentLocalCalendarYearConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (isEmpty(value)) return true;
    if (typeof value !== 'number' || !Number.isInteger(value)) return false;
    return value <= getLocalCalendarYear();
  }

  defaultMessage(): string {
    return `Year must not be after ${getLocalCalendarYear()}`;
  }
}

export function MaxCurrentLocalCalendarYear(
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: MaxCurrentLocalCalendarYearConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isYearMonthNotAfterCurrentLocal', async: false })
export class IsYearMonthNotAfterCurrentLocalConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (isEmpty(value)) return true;
    if (typeof value !== 'string') return false;
    return !isYearMonthAfterCurrentLocal(value);
  }

  defaultMessage(): string {
    return `Billing period must not be after ${getLocalCalendarYearMonth()}`;
  }
}

/** Rejects YYYY-MM after the current local month. Other strings are left to existing length rules. */
export function IsYearMonthNotAfterCurrentLocal(
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsYearMonthNotAfterCurrentLocalConstraint,
    });
  };
}
