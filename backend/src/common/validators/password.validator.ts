import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

const MIN_LENGTH = 8;
const COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          if (value.length < MIN_LENGTH) return false;
          return COMPLEXITY.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be at least ${MIN_LENGTH} characters long and include uppercase, lowercase, a number and a special character.`;
        },
      },
    });
  };
}

export { MIN_LENGTH as PASSWORD_MIN_LENGTH };
