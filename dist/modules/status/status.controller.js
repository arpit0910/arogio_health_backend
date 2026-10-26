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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const request_activity_service_1 = require("./request-activity.service");
let StatusController = class StatusController {
    activity;
    constructor(activity) {
        this.activity = activity;
    }
    diagnostics() {
        return this.activity.snapshot();
    }
    ping() {
        return { service: 'arogio-health-api', status: 'ok', timestamp: new Date().toISOString() };
    }
};
exports.StatusController = StatusController;
__decorate([
    (0, common_1.Get)('diagnostics'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StatusController.prototype, "diagnostics", null);
__decorate([
    (0, common_1.Get)('diagnostics/ping'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StatusController.prototype, "ping", null);
exports.StatusController = StatusController = __decorate([
    (0, swagger_1.ApiExcludeController)(),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [request_activity_service_1.RequestActivityService])
], StatusController);
//# sourceMappingURL=status.controller.js.map