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
exports.SupportController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const zod_1 = require("zod");
const drizzle_orm_1 = require("drizzle-orm");
const jwt_auth_guard_1 = require("../../../common/authentication/jwt-auth.guard");
const current_user_decorator_1 = require("../../../common/authentication/current-user.decorator");
const database_service_1 = require("../../../database/database.service");
const support_feedback_schema_1 = require("../../../database/schema/support-feedback.schema");
let SupportController = class SupportController {
    database;
    constructor(database) {
        this.database = database;
    }
    list(user) {
        return this.database.db.select().from(support_feedback_schema_1.supportFeedback).where((0, drizzle_orm_1.eq)(support_feedback_schema_1.supportFeedback.userId, user.userId)).orderBy((0, drizzle_orm_1.desc)(support_feedback_schema_1.supportFeedback.createdAt)).limit(30);
    }
    async create(user, id, body) {
        const input = zod_1.z.object({ subject: zod_1.z.string().trim().min(3).max(120), message: zod_1.z.string().trim().min(10).max(2000) }).strict().safeParse(body);
        if (!zod_1.z.uuid().safeParse(id).success || !input.success)
            throw new common_1.BadRequestException('Enter a subject and a message of 10–2,000 characters.');
        const value = { id, userId: user.userId, ...input.data };
        const [inserted] = await this.database.db.insert(support_feedback_schema_1.supportFeedback).values(value).onConflictDoNothing().returning();
        if (inserted)
            return inserted;
        const [existing] = await this.database.db.select().from(support_feedback_schema_1.supportFeedback).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(support_feedback_schema_1.supportFeedback.id, id), (0, drizzle_orm_1.eq)(support_feedback_schema_1.supportFeedback.userId, user.userId)));
        if (!existing || existing.subject !== value.subject || existing.message !== value.message)
            throw new common_1.ConflictException('This feedback ID is already in use. Start a new message.');
        return existing;
    }
};
exports.SupportController = SupportController;
__decorate([
    (0, common_1.Get)('feedback'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "list", null);
__decorate([
    (0, common_1.Put)('feedback/:id'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], SupportController.prototype, "create", null);
exports.SupportController = SupportController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('support'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], SupportController);
//# sourceMappingURL=support.controller.js.map