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
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const current_user_decorator_1 = require("../../common/auth/current-user.decorator");
const jwt_auth_guard_1 = require("../../common/auth/jwt-auth.guard");
const users_service_1 = require("../users/users.service");
const wellness_service_1 = require("./wellness.service");
let ExportController = class ExportController {
    users;
    wellness;
    constructor(users, wellness) {
        this.users = users;
        this.wellness = wellness;
    }
    async get(user) {
        const [profile, wellness] = await Promise.all([
            this.users.getMe(user.userId),
            this.wellness.snapshot(user.userId),
        ]);
        return {
            exportedAt: new Date().toISOString(),
            scope: 'Profile and retained wellness snapshot. Water and medicine dose history is limited to 90 days. Device readings and chat are not included.',
            profile,
            wellness,
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
    __metadata("design:paramtypes", [users_service_1.UsersService,
        wellness_service_1.WellnessService])
], ExportController);
//# sourceMappingURL=export.controller.js.map