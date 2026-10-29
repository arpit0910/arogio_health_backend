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
exports.AuthResponseDto = exports.TokenPairDto = exports.SafeUserDto = void 0;
exports.toSafeUser = toSafeUser;
const swagger_1 = require("@nestjs/swagger");
class SafeUserDto {
    role;
    referralCode;
    hasReferrer;
    profileSetup;
    profileCompletedAt;
    id;
    fullName;
    username;
    email;
    mobileNumber;
    heightValue;
    heightUnit;
    weightValue;
    weightUnit;
    bmi;
    status;
    createdAt;
    updatedAt;
}
exports.SafeUserDto = SafeUserDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['user', 'super_admin'] }),
    __metadata("design:type", String)
], SafeUserDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Permanent unique code for inviting friends' }),
    __metadata("design:type", String)
], SafeUserDto.prototype, "referralCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether this account has recorded a referrer' }),
    __metadata("design:type", Boolean)
], SafeUserDto.prototype, "hasReferrer", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], SafeUserDto.prototype, "profileSetup", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], SafeUserDto.prototype, "profileCompletedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    __metadata("design:type", String)
], SafeUserDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], SafeUserDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], SafeUserDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], SafeUserDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], SafeUserDto.prototype, "mobileNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, example: 68, description: 'Entered height' }),
    __metadata("design:type", Object)
], SafeUserDto.prototype, "heightValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, enum: ['cm', 'in'] }),
    __metadata("design:type", Object)
], SafeUserDto.prototype, "heightUnit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, example: 150.8, description: 'Entered weight' }),
    __metadata("design:type", Object)
], SafeUserDto.prototype, "weightValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, enum: ['kg', 'lb'] }),
    __metadata("design:type", Object)
], SafeUserDto.prototype, "weightUnit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        nullable: true,
        example: 23,
        description: 'BMI derived from height and weight',
    }),
    __metadata("design:type", Object)
], SafeUserDto.prototype, "bmi", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['active', 'disabled', 'pending'] }),
    __metadata("design:type", String)
], SafeUserDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'date-time' }),
    __metadata("design:type", Date)
], SafeUserDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'date-time' }),
    __metadata("design:type", Date)
], SafeUserDto.prototype, "updatedAt", void 0);
class TokenPairDto {
    accessToken;
    refreshToken;
    tokenType;
    expiresIn;
}
exports.TokenPairDto = TokenPairDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Short-lived Arogio API bearer token' }),
    __metadata("design:type", String)
], TokenPairDto.prototype, "accessToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'One-time rotating refresh token' }),
    __metadata("design:type", String)
], TokenPairDto.prototype, "refreshToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Bearer' }),
    __metadata("design:type", String)
], TokenPairDto.prototype, "tokenType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 900, description: 'Access token lifetime in seconds' }),
    __metadata("design:type", Number)
], TokenPairDto.prototype, "expiresIn", void 0);
class AuthResponseDto extends TokenPairDto {
    user;
}
exports.AuthResponseDto = AuthResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: SafeUserDto }),
    __metadata("design:type", SafeUserDto)
], AuthResponseDto.prototype, "user", void 0);
function toSafeUser(user) {
    const bmi = user.heightCm && user.weightKg
        ? Math.round((user.weightKg / (user.heightCm / 100) ** 2) * 10) / 10
        : null;
    return {
        role: user.role,
        referralCode: user.referralCode,
        hasReferrer: Boolean(user.referredByUserId),
        profileSetup: user.profileSetup,
        profileCompletedAt: user.profileCompletedAt,
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        mobileNumber: user.mobileNumber,
        heightValue: user.heightValue,
        heightUnit: user.heightUnit,
        weightValue: user.weightValue,
        weightUnit: user.weightUnit,
        bmi,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
//# sourceMappingURL=auth-response.dto.js.map