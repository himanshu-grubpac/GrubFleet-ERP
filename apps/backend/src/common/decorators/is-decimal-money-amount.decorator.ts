import { DECIMAL_MONEY_PATTERN_MESSAGE, isValidDecimalMoneyNumber } from '@grubpac/validation';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isDecimalMoneyAmount', async: false })
export class IsDecimalMoneyAmountConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'number' && isValidDecimalMoneyNumber(value);
  }

  defaultMessage(): string {
    return DECIMAL_MONEY_PATTERN_MESSAGE;
  }
}

export function IsDecimalMoneyAmount(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      constraints: [],
      validator: IsDecimalMoneyAmountConstraint,
    });
  };
}
