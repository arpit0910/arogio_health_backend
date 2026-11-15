"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthResourcesModule = void 0;
const common_1 = require("@nestjs/common");
const authentication_module_1 = require("../authentication/authentication.module");
const health_resources_controller_1 = require("./controllers/health-resources.controller");
const public_directory_controller_1 = require("./controllers/public-directory.controller");
const health_resources_service_1 = require("./services/health-resources.service");
let HealthResourcesModule = class HealthResourcesModule {
};
exports.HealthResourcesModule = HealthResourcesModule;
exports.HealthResourcesModule = HealthResourcesModule = __decorate([
    (0, common_1.Module)({
        imports: [authentication_module_1.AuthenticationModule],
        controllers: [health_resources_controller_1.HealthResourcesController, public_directory_controller_1.PublicHealthResourcesController],
        providers: [health_resources_service_1.HealthResourcesService],
        exports: [health_resources_service_1.HealthResourcesService],
    })
], HealthResourcesModule);
//# sourceMappingURL=health-resources.module.js.map