"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdministrationModule = void 0;
const health_resources_module_1 = require("../health-resources/health-resources.module");
const meditation_library_module_1 = require("../meditation-library/meditation-library.module");
const meditation_library_administration_controller_1 = require("./controllers/meditation-library-administration.controller");
const health_resources_administration_controller_1 = require("./controllers/health-resources-administration.controller");
const common_1 = require("@nestjs/common");
const authentication_module_1 = require("../authentication/authentication.module");
const user_accounts_module_1 = require("../user-accounts/user-accounts.module");
const personal_wellness_module_1 = require("../personal-wellness/personal-wellness.module");
const password_hashing_service_1 = require("../authentication/services/password-hashing.service");
const administration_controller_1 = require("./controllers/administration.controller");
const administration_guard_1 = require("./guards/administration.guard");
const administration_service_1 = require("./services/administration.service");
const database_reset_service_1 = require("./services/database-reset.service");
const database_reset_controller_1 = require("./controllers/database-reset.controller");
let AdministrationModule = class AdministrationModule {
};
exports.AdministrationModule = AdministrationModule;
exports.AdministrationModule = AdministrationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            meditation_library_module_1.MeditationLibraryModule,
            health_resources_module_1.HealthResourcesModule,
            authentication_module_1.AuthenticationModule,
            user_accounts_module_1.UserAccountsModule,
            personal_wellness_module_1.PersonalWellnessModule,
        ],
        controllers: [
            administration_controller_1.AdministrationController,
            health_resources_administration_controller_1.HealthResourcesAdministrationController,
            meditation_library_administration_controller_1.MeditationLibraryAdministrationController,
            database_reset_controller_1.DatabaseResetController,
        ],
        providers: [
            administration_guard_1.SuperAdministratorGuard,
            administration_service_1.AdministrationService,
            password_hashing_service_1.PasswordHashingService,
            database_reset_service_1.DatabaseResetService,
        ],
    })
], AdministrationModule);
//# sourceMappingURL=administration.module.js.map