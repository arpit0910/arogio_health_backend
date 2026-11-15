"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JeevaAssistantModule = void 0;
const common_1 = require("@nestjs/common");
const authentication_module_1 = require("../authentication/authentication.module");
const jeeva_assistant_controller_1 = require("./controllers/jeeva-assistant.controller");
const jeeva_assistant_service_1 = require("./services/jeeva-assistant.service");
const jeeva_health_context_service_1 = require("./services/jeeva-health-context.service");
let JeevaAssistantModule = class JeevaAssistantModule {
};
exports.JeevaAssistantModule = JeevaAssistantModule;
exports.JeevaAssistantModule = JeevaAssistantModule = __decorate([
    (0, common_1.Module)({
        imports: [authentication_module_1.AuthenticationModule],
        controllers: [jeeva_assistant_controller_1.JeevaAssistantController],
        providers: [jeeva_assistant_service_1.JeevaAssistantService, jeeva_health_context_service_1.JeevaHealthContextService],
    })
], JeevaAssistantModule);
//# sourceMappingURL=jeeva-assistant.module.js.map