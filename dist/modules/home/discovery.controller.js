"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoveryController = void 0;
const common_1 = require("@nestjs/common");
const care_service_1 = require("../care/care.service");
let DiscoveryController = class DiscoveryController {
    care;
    constructor(care) {
        this.care = care;
    }
    async discovery() {
        const [hospitals, doctors] = await Promise.allSettled([
            this.care.list({ kind: 'hospital', city: 'Jaipur', limit: 3 }),
            this.care.list({ kind: 'doctor', city: 'Jaipur', limit: 3 }),
        ]);
        const section = (result) => result.status === 'fulfilled'
            ? { status: 'available', items: result.value.items }
            : { status: 'unavailable', items: [] };
        return {
            coverage: 'Jaipur',
            hospitals: section(hospitals),
            doctors: section(doctors),
            availability: 'contact-provider',
        };
    }
};
exports.DiscoveryController = DiscoveryController;
__decorate([
    (0, common_1.Get)('discovery'),
    (0, common_1.Header)('Cache-Control', 'no-store'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DiscoveryController.prototype, "discovery", null);
exports.DiscoveryController = DiscoveryController = __decorate([
    (0, common_1.Controller)('home'),
    __metadata("design:paramtypes", [care_service_1.CareService])
], DiscoveryController);
//# sourceMappingURL=discovery.controller.js.map