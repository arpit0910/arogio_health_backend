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
exports.WellnessController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/auth/current-user.decorator");
const jwt_auth_guard_1 = require("../../common/auth/jwt-auth.guard");
const wellness_service_1 = require("./wellness.service");
let WellnessController = class WellnessController {
    service;
    constructor(service) {
        this.service = service;
    }
    medicine(u, id, body) {
        return this.service.saveMedicine(u.userId, id, body);
    }
    removeMedicine(u, id) {
        return this.service.deleteMedicine(u.userId, id);
    }
    get(u) {
        return this.service.snapshot(u.userId);
    }
    plan(u, body) {
        return this.service.savePlan(u.userId, body);
    }
    log(u, id, body) {
        return this.service.saveLog(u.userId, id, body);
    }
    removeLog(u, id) {
        return this.service.deleteLog(u.userId, id);
    }
    task(u, id, body) {
        return this.service.saveTask(u.userId, id, body);
    }
    clearWater(u) {
        return this.service.clear(u.userId, 'water');
    }
    cycle(u, body) {
        return this.service.saveCycleSettings(u.userId, body);
    }
    period(u, id, body) {
        return this.service.savePeriod(u.userId, id, body);
    }
    removePeriod(u, id) {
        return this.service.deletePeriod(u.userId, id);
    }
    entry(u, day, body) {
        return this.service.saveEntry(u.userId, day, body);
    }
    removeEntry(u, day) {
        return this.service.deleteEntry(u.userId, day);
    }
    clearCycle(u) {
        return this.service.clear(u.userId, 'cycle');
    }
};
exports.WellnessController = WellnessController;
__decorate([
    (0, common_1.Put)('medicines/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], WellnessController.prototype, "medicine", null);
__decorate([
    (0, common_1.Delete)('medicines/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WellnessController.prototype, "removeMedicine", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WellnessController.prototype, "get", null);
__decorate([
    (0, common_1.Put)('water/plan'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], WellnessController.prototype, "plan", null);
__decorate([
    (0, common_1.Put)('water/logs/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], WellnessController.prototype, "log", null);
__decorate([
    (0, common_1.Delete)('water/logs/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WellnessController.prototype, "removeLog", null);
__decorate([
    (0, common_1.Put)('water/tasks/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], WellnessController.prototype, "task", null);
__decorate([
    (0, common_1.Delete)('water/data'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WellnessController.prototype, "clearWater", null);
__decorate([
    (0, common_1.Put)('cycle/settings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], WellnessController.prototype, "cycle", null);
__decorate([
    (0, common_1.Put)('cycle/periods/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], WellnessController.prototype, "period", null);
__decorate([
    (0, common_1.Delete)('cycle/periods/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WellnessController.prototype, "removePeriod", null);
__decorate([
    (0, common_1.Put)('cycle/entries/:day'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('day')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], WellnessController.prototype, "entry", null);
__decorate([
    (0, common_1.Delete)('cycle/entries/:day'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('day')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WellnessController.prototype, "removeEntry", null);
__decorate([
    (0, common_1.Delete)('cycle/data'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WellnessController.prototype, "clearCycle", null);
exports.WellnessController = WellnessController = __decorate([
    (0, swagger_1.ApiTags)('wellness'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('wellness'),
    __metadata("design:paramtypes", [wellness_service_1.WellnessService])
], WellnessController);
//# sourceMappingURL=wellness.controller.js.map