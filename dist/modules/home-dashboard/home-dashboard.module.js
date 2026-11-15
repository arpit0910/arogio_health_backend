"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeDashboardModule = void 0;
const common_1 = require("@nestjs/common");
const authentication_module_1 = require("../authentication/authentication.module");
const home_dashboard_controller_1 = require("./controllers/home-dashboard.controller");
const home_dashboard_service_1 = require("./services/home-dashboard.service");
const stormglass_weather_1 = require("./integrations/stormglass.weather");
const care_directory_module_1 = require("../care-directory/care-directory.module");
const discovery_controller_1 = require("./controllers/discovery.controller");
let HomeDashboardModule = class HomeDashboardModule {
};
exports.HomeDashboardModule = HomeDashboardModule;
exports.HomeDashboardModule = HomeDashboardModule = __decorate([
    (0, common_1.Module)({
        imports: [authentication_module_1.AuthenticationModule, care_directory_module_1.CareDirectoryModule],
        controllers: [home_dashboard_controller_1.HomeDashboardController, discovery_controller_1.DiscoveryController],
        providers: [home_dashboard_service_1.HomeDashboardService, stormglass_weather_1.StormglassWeather],
    })
], HomeDashboardModule);
//# sourceMappingURL=home-dashboard.module.js.map