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
exports.DatabaseResetController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../../common/authentication/jwt-auth.guard");
const current_user_decorator_1 = require("../../../common/authentication/current-user.decorator");
const administration_guard_1 = require("../guards/administration.guard");
const database_reset_service_1 = require("../services/database-reset.service");
let DatabaseResetController = class DatabaseResetController {
    service;
    constructor(service) {
        this.service = service;
    }
    preview(user, body) {
        return this.service.preview(user.userId, body);
    }
    apply(user, body) {
        return this.service.apply(user.userId, body);
    }
};
exports.DatabaseResetController = DatabaseResetController;
__decorate([
    (0, common_1.Post)('preview'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DatabaseResetController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)('apply'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DatabaseResetController.prototype, "apply", null);
exports.DatabaseResetController = DatabaseResetController = __decorate([
    (0, common_1.Controller)('admin/database-reset'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, administration_guard_1.SuperAdministratorGuard),
    __metadata("design:paramtypes", [database_reset_service_1.DatabaseResetService])
], DatabaseResetController);
//# sourceMappingURL=database-reset.controller.js.map