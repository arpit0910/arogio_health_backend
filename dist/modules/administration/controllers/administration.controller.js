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
exports.AdministrationController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../../../common/authentication/jwt-auth.guard");
const current_user_decorator_1 = require("../../../common/authentication/current-user.decorator");
const administration_guard_1 = require("../guards/administration.guard");
const administration_service_1 = require("../services/administration.service");
let AdministrationController = class AdministrationController {
    service;
    constructor(service) {
        this.service = service;
    }
    me(u) {
        return { id: u.userId, role: 'super_admin' };
    }
    analytics() {
        return this.service.analytics();
    }
    users(query) {
        return this.service.listUsers(query);
    }
    create(u, body) {
        return this.service.audit(u.userId, 'account.create', null, () => this.service.createUser(body));
    }
    user(u, id) {
        return this.service.audit(u.userId, 'account.view', id, () => this.service.user(id));
    }
    update(u, id, body) {
        return this.service.audit(u.userId, 'account.update', id, () => this.service.updateUser(id, body));
    }
    action(u, id, body) {
        return this.service.audit(u.userId, 'account.status', id, () => this.service.accountAction(u.userId, id, body));
    }
    records(u, id, type, page) {
        return this.service.audit(u.userId, 'records.view', id, () => this.service.records(id, type, page));
    }
    tracking(u, id, body) {
        return this.service.audit(u.userId, 'tracking.change', id, () => this.service.mutateWellness(id, body));
    }
    async image(id, response) {
        response.setHeader('Cache-Control', 'private, no-store');
        response.type('webp').send(await this.service.image(id));
    }
    banners() {
        return this.service.listBanners();
    }
    upload(u, file, body) {
        return this.service.audit(u.userId, 'banner.upload', null, () => this.service.upload(u.userId, file, body));
    }
    banner(u, id, body) {
        return this.service.audit(u.userId, 'banner.update', id, () => this.service.updateBanner(id, body));
    }
    remove(u, id) {
        return this.service.audit(u.userId, 'banner.delete', id, () => this.service.deleteBanner(id));
    }
    reviewFeedback(u, id, body) { return this.service.audit(u.userId, 'feedback.review', id, () => this.service.reviewFeedback(id, body)); }
    feedback(u) { return this.service.audit(u.userId, 'feedback.list', null, () => this.service.feedback()); }
    audit(page) {
        return this.service.auditLog(page);
    }
};
exports.AdministrationController = AdministrationController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "me", null);
__decorate([
    (0, common_1.Get)('analytics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "analytics", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "users", null);
__decorate([
    (0, common_1.Post)('users'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "user", null);
__decorate([
    (0, common_1.Patch)('users/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('users/:id/action'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "action", null);
__decorate([
    (0, common_1.Get)('users/:id/records/:type'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('type')),
    __param(3, (0, common_1.Query)('page', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "records", null);
__decorate([
    (0, common_1.Post)('users/:id/tracking'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "tracking", null);
__decorate([
    (0, common_1.Get)('banners/:id/image'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdministrationController.prototype, "image", null);
__decorate([
    (0, common_1.Get)('banners'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "banners", null);
__decorate([
    (0, common_1.Post)('banners'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', { limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 3 } })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "upload", null);
__decorate([
    (0, common_1.Patch)('banners/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "banner", null);
__decorate([
    (0, common_1.Delete)('banners/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)('feedback/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "reviewFeedback", null);
__decorate([
    (0, common_1.Get)('feedback'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "feedback", null);
__decorate([
    (0, common_1.Get)('audit'),
    __param(0, (0, common_1.Query)('page', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], AdministrationController.prototype, "audit", null);
exports.AdministrationController = AdministrationController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, administration_guard_1.SuperAdministratorGuard),
    __metadata("design:paramtypes", [administration_service_1.AdministrationService])
], AdministrationController);
//# sourceMappingURL=administration.controller.js.map