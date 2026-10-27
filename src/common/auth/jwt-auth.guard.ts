import { ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ApiError } from '../errors/api-error';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser>(
    error: unknown,
    user: TUser | false,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (error) throw error instanceof Error ? error : new Error('Authentication failed');
    if (user) return user;
    const request = context.switchToHttp().getRequest<Request>();
    if (!/^Bearer\s+\S+/i.test(request.headers.authorization ?? '')) {
      throw new ApiError(
        'ACCESS_TOKEN_REQUIRED',
        'Sign in and provide a Bearer access token.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if ((info as { name?: string } | undefined)?.name === 'TokenExpiredError') {
      throw new ApiError(
        'ACCESS_TOKEN_EXPIRED',
        'Your access token has expired. Refresh your session or sign in again.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    throw new ApiError(
      'INVALID_ACCESS_TOKEN',
      'The access token is invalid. Sign in again.',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
