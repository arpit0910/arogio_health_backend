"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HospitalsModule = void 0;
const common_1 = require("@nestjs/common");
const authentication_module_1 = require("../authentication/authentication.module");
const administration_guard_1 = require("../administration/guards/administration.guard");
const hospitals_service_1 = require("./services/hospitals.service");
const hospitals_controller_1 = require("./controllers/hospitals.controller");
let HospitalsModule = class HospitalsModule {
};
exports.HospitalsModule = HospitalsModule;
exports.HospitalsModule = HospitalsModule = __decorate([
    (0, common_1.Module)({
        imports: [authentication_module_1.AuthenticationModule],
        controllers: [hospitals_controller_1.PublicHospitalsController, hospitals_controller_1.HospitalsAdministrationController],
        providers: [hospitals_service_1.HospitalsService, administration_guard_1.SuperAdministratorGuard],
        exports: [hospitals_service_1.HospitalsService],
    })
], HospitalsModule);
//# sourceMappingURL=hospitals.module.js.map