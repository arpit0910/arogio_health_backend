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
exports.MeditationAdminController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/auth/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/auth/current-user.decorator");
const meditation_service_1 = require("../meditation/meditation.service");
const admin_guard_1 = require("./admin.guard");
const admin_service_1 = require("./admin.service");
let MeditationAdminController = class MeditationAdminController {
    meditation;
    audit;
    constructor(meditation, audit) {
        this.meditation = meditation;
        this.audit = audit;
    }
    list(query) {
        return this.meditation.list(query, true);
    }
    get(id) {
        return this.meditation.get(id);
    }
    create(user, body) {
        return this.audit.audit(user.userId, 'meditation.create', null, () => this.meditation.save(null, user.userId, body));
    }
    update(user, id, body) {
        return this.audit.audit(user.userId, 'meditation.update', id, () => this.meditation.save(id, user.userId, body));
    }
    remove(user, id) {
        return this.audit.audit(user.userId, 'meditation.delete', id, () => this.meditation.remove(id));
    }
};
exports.MeditationAdminController = MeditationAdminController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MeditationAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MeditationAdminController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MeditationAdminController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], MeditationAdminController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MeditationAdminController.prototype, "remove", null);
exports.MeditationAdminController = MeditationAdminController = __decorate([
    (0, common_1.Controller)('admin/meditation'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.SuperAdminGuard),
    __metadata("design:paramtypes", [meditation_service_1.MeditationService,
        admin_service_1.AdminService])
], MeditationAdminController);
//# sourceMappingURL=meditation-admin.controller.js.map