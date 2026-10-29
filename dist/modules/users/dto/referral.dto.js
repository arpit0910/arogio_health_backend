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
exports.ApplyReferralDto = exports.normalizeReferralCode = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const normalizeReferralCode = ({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value;
exports.normalizeReferralCode = normalizeReferralCode;
class ApplyReferralDto {
    referralCode;
}
exports.ApplyReferralDto = ApplyReferralDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'A1B2C3D4E5F6', description: 'The code from the friend who invited you' }),
    (0, class_transformer_1.Transform)(exports.normalizeReferralCode),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[A-F0-9]{12}$/),
    __metadata("design:type", String)
], ApplyReferralDto.prototype, "referralCode", void 0);
//# sourceMappingURL=referral.dto.js.map