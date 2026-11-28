import { BadRequestException, type ValidationError } from '@nestjs/common';
export declare function validationExceptionFactory(errors: ValidationError[]): BadRequestException;
