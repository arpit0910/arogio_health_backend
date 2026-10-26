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
exports.UpdateProfileDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const trim = ({ value }) => typeof value === 'string' ? value.trim() : value;
const normalizeUsername = ({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value;
const number = ({ value }) => typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
class UpdateProfileDto {
    fullName;
    username;
    heightValue;
    heightUnit;
    weightValue;
    weightUnit;
}
exports.UpdateProfileDto = UpdateProfileDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minLength: 2, maxLength: 100 }),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minLength: 3, maxLength: 30, pattern: '^[a-z0-9_]+$' }),
    (0, class_transformer_1.Transform)(normalizeUsername),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(30),
    (0, class_validator_1.Matches)(/^[a-z0-9_]+$/, {
        message: 'username may contain lowercase letters, numbers, and underscores only',
    }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 68,
        minimum: 20,
        maximum: 300,
        description: 'Height in the selected unit',
    }),
    (0, class_transformer_1.Transform)(number),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 1 }),
    (0, class_validator_1.Min)(20),
    (0, class_validator_1.Max)(300),
    __metadata("design:type", Number)
], UpdateProfileDto.prototype, "heightValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['cm', 'in'], example: 'in' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['cm', 'in']),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "heightUnit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 150.8,
        minimum: 2,
        maximum: 1102.3,
        description: 'Weight in the selected unit',
    }),
    (0, class_transformer_1.Transform)(number),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 1 }),
    (0, class_validator_1.Min)(2),
    (0, class_validator_1.Max)(1102.3),
    __metadata("design:type", Number)
], UpdateProfileDto.prototype, "weightValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['kg', 'lb'], example: 'lb' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['kg', 'lb']),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "weightUnit", void 0);
//# sourceMappingURL=update-profile.dto.js.map