import { HttpStatus } from '@nestjs/common';

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: HttpStatus,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = ApiError.name;
  }
}
