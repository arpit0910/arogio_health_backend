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
exports.JeevaAssistantController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../../../common/authentication/jwt-auth.guard");
const current_user_decorator_1 = require("../../../common/authentication/current-user.decorator");
const jeeva_assistant_service_1 = require("../services/jeeva-assistant.service");
let JeevaAssistantController = class JeevaAssistantController {
    chat;
    constructor(chat) {
        this.chat = chat;
    }
    reply(user, body) {
        return this.chat.reply(user.userId, body);
    }
};
exports.JeevaAssistantController = JeevaAssistantController;
__decorate([
    (0, common_1.Post)('messages'),
    (0, common_1.HttpCode)(200),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], JeevaAssistantController.prototype, "reply", null);
exports.JeevaAssistantController = JeevaAssistantController = __decorate([
    (0, swagger_1.ApiTags)('chat'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('chat'),
    __metadata("design:paramtypes", [jeeva_assistant_service_1.JeevaAssistantService])
], JeevaAssistantController);
//# sourceMappingURL=jeeva-assistant.controller.js.map