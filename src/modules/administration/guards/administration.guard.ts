import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { userAccounts } from '../../../database/schema';
import type { RequestUser } from '../../../common/authentication/request-user';
@Injectable()
export class SuperAdministratorGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user: RequestUser }>();
    const [user] = await this.database.db
      .select({ role: userAccounts.role, status: userAccounts.status })
      .from(userAccounts)
      .where(eq(userAccounts.id, request.user.userId))
      .limit(1);
    if (user?.role !== 'super_admin' || user.status !== 'active')
      throw new ForbiddenException('Super-admin access is required');
    return true;
  }
}
