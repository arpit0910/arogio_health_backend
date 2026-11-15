"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicalDepartmentsModule = void 0;
const common_1 = require("@nestjs/common");
const authentication_module_1 = require("../authentication/authentication.module");
const administration_guard_1 = require("../administration/guards/administration.guard");
const medical_departments_service_1 = require("./services/medical-departments.service");
const medical_departments_controller_1 = require("./controllers/medical-departments.controller");
let MedicalDepartmentsModule = class MedicalDepartmentsModule {
};
exports.MedicalDepartmentsModule = MedicalDepartmentsModule;
exports.MedicalDepartmentsModule = MedicalDepartmentsModule = __decorate([
    (0, common_1.Module)({
        imports: [authentication_module_1.AuthenticationModule],
        controllers: [medical_departments_controller_1.PublicMedicalDepartmentsController, medical_departments_controller_1.MedicalDepartmentsAdministrationController],
        providers: [medical_departments_service_1.MedicalDepartmentsService, administration_guard_1.SuperAdministratorGuard],
        exports: [medical_departments_service_1.MedicalDepartmentsService],
    })
], MedicalDepartmentsModule);
//# sourceMappingURL=medical-departments.module.js.map