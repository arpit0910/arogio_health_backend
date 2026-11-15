"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeditationLibraryModule = void 0;
const common_1 = require("@nestjs/common");
const authentication_module_1 = require("../authentication/authentication.module");
const meditation_library_controller_1 = require("./controllers/meditation-library.controller");
const meditation_library_service_1 = require("./services/meditation-library.service");
let MeditationLibraryModule = class MeditationLibraryModule {
};
exports.MeditationLibraryModule = MeditationLibraryModule;
exports.MeditationLibraryModule = MeditationLibraryModule = __decorate([
    (0, common_1.Module)({
        imports: [authentication_module_1.AuthenticationModule],
        controllers: [meditation_library_controller_1.MeditationLibraryController, meditation_library_controller_1.PublicMeditationLibraryController],
        providers: [meditation_library_service_1.MeditationLibraryService],
        exports: [meditation_library_service_1.MeditationLibraryService],
    })
], MeditationLibraryModule);
//# sourceMappingURL=meditation-library.module.js.map