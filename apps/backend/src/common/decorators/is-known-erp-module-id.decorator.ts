import { isKnownErpModuleId } from '../../modules/auth/authorization/constants/erp-module-registry';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isKnownErpModuleId', async: false })
export class IsKnownErpModuleIdConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return isKnownErpModuleId(value.trim());
  }

  defaultMessage(): string {
    return 'moduleId must be a known ERP module id';
  }
}

export function IsKnownErpModuleId(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsKnownErpModuleIdConstraint,
    });
  };
}
