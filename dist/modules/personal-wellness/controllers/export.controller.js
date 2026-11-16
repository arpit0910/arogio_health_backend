"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportController = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const database_service_1 = require("../../../database/database.service");
const schema_1 = require("../../../database/schema");
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const current_user_decorator_1 = require("../../../common/authentication/current-user.decorator");
const jwt_auth_guard_1 = require("../../../common/authentication/jwt-auth.guard");
const user_accounts_service_1 = require("../../user-accounts/services/user-accounts.service");
const personal_wellness_service_1 = require("../services/personal-wellness.service");
let ExportController = class ExportController {
    database;
    users;
    wellness;
    constructor(database, users, wellness) {
        this.database = database;
        this.users = users;
        this.wellness = wellness;
    }
    async get(user) {
        const [feedback, profile, wellness] = await Promise.all([
            this.database.db.select().from(schema_1.supportFeedback).where((0, drizzle_orm_1.eq)(schema_1.supportFeedback.userId, user.userId)).orderBy((0, drizzle_orm_1.desc)(schema_1.supportFeedback.createdAt)).limit(1000),
            this.users.getMe(user.userId),
            this.wellness.snapshot(user.userId),
        ]);
        return {
            exportedAt: new Date().toISOString(),
            scope: 'Profile, retained wellness snapshot and up to 1,000 recent support feedback records. Water and medicine dose history is limited to 90 days. Device readings and chat are not included.',
            profile,
            wellness,
            feedback,
        };
    }
};
exports.ExportController = ExportController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExportController.prototype, "get", null);
exports.ExportController = ExportController = __decorate([
    (0, common_1.Controller)('profile/export'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        user_accounts_service_1.UserAccountsService,
        personal_wellness_service_1.PersonalWellnessService])
], ExportController);
//# sourceMappingURL=export.controller.js.map