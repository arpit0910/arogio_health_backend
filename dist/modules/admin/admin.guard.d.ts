import { CanActivate, ExecutionContext } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
export declare class SuperAdminGuard implements CanActivate {
    private readonly database;
    constructor(database: DatabaseService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
