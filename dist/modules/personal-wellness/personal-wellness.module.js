"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonalWellnessModule = void 0;
const common_1 = require("@nestjs/common");
const authentication_module_1 = require("../authentication/authentication.module");
const personal_wellness_controller_1 = require("./controllers/personal-wellness.controller");
const personal_wellness_service_1 = require("./services/personal-wellness.service");
const export_controller_1 = require("./controllers/export.controller");
const user_accounts_module_1 = require("../user-accounts/user-accounts.module");
let PersonalWellnessModule = class PersonalWellnessModule {
};
exports.PersonalWellnessModule = PersonalWellnessModule;
exports.PersonalWellnessModule = PersonalWellnessModule = __decorate([
    (0, common_1.Module)({
        exports: [personal_wellness_service_1.PersonalWellnessService],
        imports: [authentication_module_1.AuthenticationModule, user_accounts_module_1.UserAccountsModule],
        controllers: [personal_wellness_controller_1.PersonalWellnessController, export_controller_1.ExportController],
        providers: [personal_wellness_service_1.PersonalWellnessService],
    })
], PersonalWellnessModule);
//# sourceMappingURL=personal-wellness.module.js.map