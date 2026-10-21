import { buildValidationErrorDetails } from './validation-error.util';

describe('buildValidationErrorDetails', () => {
  it('parses field names from class-validator messages', () => {
    expect(
      buildValidationErrorDetails([
        'email must be an email',
        'property extraField should not exist',
      ]),
    ).toEqual({
      errors: [
        { field: 'email', message: 'email must be an email' },
        {
          field: 'extraField',
          message: 'property extraField should not exist',
        },
      ],
    });
  });
});
