"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const users_module_1 = require("../users/users.module");
const wellness_module_1 = require("../wellness/wellness.module");
const password_service_1 = require("../auth/password.service");
const admin_controller_1 = require("./admin.controller");
const admin_guard_1 = require("./admin.guard");
const admin_service_1 = require("./admin.service");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, users_module_1.UsersModule, wellness_module_1.WellnessModule],
        controllers: [admin_controller_1.AdminController],
        providers: [admin_guard_1.SuperAdminGuard, admin_service_1.AdminService, password_service_1.PasswordService],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map