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
exports.RefreshTokenDto = exports.GoogleLoginDto = exports.LoginDto = exports.RegisterDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const normalizeEmail = ({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value;
const trim = ({ value }) => typeof value === 'string' ? value.trim() : value;
const number = ({ value }) => typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
class RegisterDto {
    email;
    password;
    fullName;
    heightValue;
    heightUnit;
    weightValue;
    weightUnit;
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'person@example.com' }),
    (0, class_transformer_1.Transform)(normalizeEmail),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(254),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ minLength: 12, maxLength: 128, writeOnly: true }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(12),
    (0, class_validator_1.MaxLength)(128),
    (0, class_validator_1.Matches)(/[a-z]/, { message: 'password must contain a lowercase letter' }),
    (0, class_validator_1.Matches)(/[A-Z]/, { message: 'password must contain an uppercase letter' }),
    (0, class_validator_1.Matches)(/[0-9]/, { message: 'password must contain a number' }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Arogio User', maxLength: 100 }),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], RegisterDto.prototype, "fullName", void 0);
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
], RegisterDto.prototype, "heightValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['cm', 'in'], example: 'in' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['cm', 'in']),
    __metadata("design:type", String)
], RegisterDto.prototype, "heightUnit", void 0);
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
], RegisterDto.prototype, "weightValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['kg', 'lb'], example: 'lb' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['kg', 'lb']),
    __metadata("design:type", String)
], RegisterDto.prototype, "weightUnit", void 0);
class LoginDto {
    email;
    password;
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'person@example.com' }),
    (0, class_transformer_1.Transform)(normalizeEmail),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(254),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ writeOnly: true }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
class GoogleLoginDto {
    idToken;
}
exports.GoogleLoginDto = GoogleLoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Google ID token issued for an allowed client', writeOnly: true }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(20),
    (0, class_validator_1.MaxLength)(8_192),
    __metadata("design:type", String)
], GoogleLoginDto.prototype, "idToken", void 0);
class RefreshTokenDto {
    refreshToken;
}
exports.RefreshTokenDto = RefreshTokenDto;
__decorate([
    (0, swagger_1.ApiProperty)({ writeOnly: true }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(40),
    (0, class_validator_1.MaxLength)(256),
    __metadata("design:type", String)
], RefreshTokenDto.prototype, "refreshToken", void 0);
//# sourceMappingURL=auth.dto.js.map