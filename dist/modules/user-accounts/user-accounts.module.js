"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAccountsModule = void 0;
const common_1 = require("@nestjs/common");
const authentication_module_1 = require("../authentication/authentication.module");
const user_accounts_controller_1 = require("./controllers/user-accounts.controller");
const user_accounts_repository_1 = require("./repositories/user-accounts.repository");
const user_accounts_service_1 = require("./services/user-accounts.service");
const profile_controller_1 = require("./controllers/profile.controller");
let UserAccountsModule = class UserAccountsModule {
};
exports.UserAccountsModule = UserAccountsModule;
exports.UserAccountsModule = UserAccountsModule = __decorate([
    (0, common_1.Module)({
        exports: [user_accounts_service_1.UserAccountsService],
        imports: [authentication_module_1.AuthenticationModule],
        controllers: [profile_controller_1.ProfileController, user_accounts_controller_1.UserAccountsController],
        providers: [user_accounts_service_1.UserAccountsService, user_accounts_repository_1.UserAccountsRepository],
    })
], UserAccountsModule);
//# sourceMappingURL=user-accounts.module.js.map