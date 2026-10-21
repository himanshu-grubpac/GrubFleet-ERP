import { BadRequestException, ConflictException } from '@nestjs/common';
import { GlobalHttpExceptionFilter } from './http-exception.filter';

function runFilter(exception: unknown): {
  statusCode: number;
  body: Record<string, unknown>;
} {
  const filter = new GlobalHttpExceptionFilter();
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({
        correlationId: 'corr-test-1',
        headers: {},
      }),
    }),
  };

  filter.catch(exception, host as never);

  expect(status).toHaveBeenCalledTimes(1);
  expect(json).toHaveBeenCalledTimes(1);
  const statusCall = status.mock.calls[0] as [number];
  const jsonCall = json.mock.calls[0] as [Record<string, unknown>];
  return { statusCode: statusCall[0], body: jsonCall[0] };
}

describe('GlobalHttpExceptionFilter', () => {
  it('passes through HttpException objects with message and code', () => {
    const { statusCode, body } = runFilter(
      new ConflictException({
        message: 'Role name already exists in this organization',
        code: 'ROLE_NAME_CONFLICT',
      }),
    );

    expect(statusCode).toBe(409);
    expect(body).toMatchObject({
      message: 'Role name already exists in this organization',
      code: 'ROLE_NAME_CONFLICT',
      statusCode: 409,
      correlationId: 'corr-test-1',
    });
  });

  it('adds structured validation details for ValidationPipe-style arrays', () => {
    const { statusCode, body } = runFilter(
      new BadRequestException({
        message: [
          'licenseNumber must contain at least one digit',
          'property hackField should not exist',
        ],
        error: 'Bad Request',
      }),
    );

    expect(statusCode).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toEqual({
      errors: [
        {
          field: 'licenseNumber',
          message: 'licenseNumber must contain at least one digit',
        },
        {
          field: 'hackField',
          message: 'property hackField should not exist',
        },
      ],
    });
  });

  it('maps unhandled postgres unique errors to 409', () => {
    const { statusCode, body } = runFilter({
      message: 'Failed query',
      cause: {
        code: '23505',
        constraint: 'lease_contracts_org_number_uidx',
      },
    });

    expect(statusCode).toBe(409);
    expect(body).toMatchObject({
      code: 'LEASE_CONTRACT_NUMBER_DUPLICATE',
      statusCode: 409,
    });
  });

  it('returns INTERNAL_ERROR for unknown non-http failures', () => {
    const { statusCode, body } = runFilter(new Error('unexpected'));

    expect(statusCode).toBe(500);
    expect(body).toMatchObject({
      message: 'Something went wrong',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    });
  });
});
