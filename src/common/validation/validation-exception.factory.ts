import { BadRequestException, type ValidationError } from '@nestjs/common';

function flatten(errors: ValidationError[], parent = ''): Record<string, string[]> {
  return errors.reduce<Record<string, string[]>>((all, error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    if (error.constraints) all[field] = Object.values(error.constraints);
    return Object.assign(all, flatten(error.children ?? [], field));
  }, {});
}

export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  return new BadRequestException({
    code: 'VALIDATION_FAILED',
    message: 'Request validation failed',
    details: flatten(errors),
  });
}
