import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { users } from '../../database/schema';
import type { RequestUser } from '../../common/auth/request-user';
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user: RequestUser }>();
    const [user] = await this.database.db
      .select({ role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, request.user.userId))
      .limit(1);
    if (user?.role !== 'super_admin' || user.status !== 'active')
      throw new ForbiddenException('Super-admin access is required');
    return true;
  }
}
