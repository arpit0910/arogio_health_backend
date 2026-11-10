"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const directory_module_1 = require("../directory/directory.module");
const admin_guard_1 = require("../admin/admin.guard");
const care_service_1 = require("./care.service");
const care_controller_1 = require("./care.controller");
let CareModule = class CareModule {
};
exports.CareModule = CareModule;
exports.CareModule = CareModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, directory_module_1.DirectoryModule],
        controllers: [care_controller_1.CareController, care_controller_1.CareAdminController, care_controller_1.CareSearchController],
        providers: [care_service_1.CareService, admin_guard_1.SuperAdminGuard],
    })
], CareModule);
//# sourceMappingURL=care.module.js.map