"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareDirectoryModule = void 0;
const common_1 = require("@nestjs/common");
const authentication_module_1 = require("../authentication/authentication.module");
const health_resources_module_1 = require("../health-resources/health-resources.module");
const administration_guard_1 = require("../administration/guards/administration.guard");
const care_directory_service_1 = require("./services/care-directory.service");
const care_directory_controller_1 = require("./controllers/care-directory.controller");
let CareDirectoryModule = class CareDirectoryModule {
};
exports.CareDirectoryModule = CareDirectoryModule;
exports.CareDirectoryModule = CareDirectoryModule = __decorate([
    (0, common_1.Module)({
        imports: [authentication_module_1.AuthenticationModule, health_resources_module_1.HealthResourcesModule],
        controllers: [care_directory_controller_1.CareDirectoryController, care_directory_controller_1.CareDirectoryAdministrationController, care_directory_controller_1.CareDirectorySearchController],
        providers: [care_directory_service_1.CareDirectoryService, administration_guard_1.SuperAdministratorGuard],
        exports: [care_directory_service_1.CareDirectoryService],
    })
], CareDirectoryModule);
//# sourceMappingURL=care-directory.module.js.map