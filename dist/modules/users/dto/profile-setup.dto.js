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
exports.ProfileSetupDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ProfileSetupDto {
    setupDeferred;
    heightValue;
    heightUnit;
    weightValue;
    weightUnit;
    dateOfBirth;
    activityLevel;
    healthGoals;
    gender;
    location;
    referralSource;
    healthReminders;
    tipsAndInsights;
    productUpdates;
    step;
    complete;
}
exports.ProfileSetupDto = ProfileSetupDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Defer profile setup without marking it complete' }),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProfileSetupDto.prototype, "setupDeferred", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 20, maximum: 300 }),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 1 }),
    (0, class_validator_1.Min)(20),
    (0, class_validator_1.Max)(300),
    __metadata("design:type", Number)
], ProfileSetupDto.prototype, "heightValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['cm', 'in'] }),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsIn)(['cm', 'in']),
    __metadata("design:type", String)
], ProfileSetupDto.prototype, "heightUnit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 2, maximum: 1102.3 }),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 1 }),
    (0, class_validator_1.Min)(2),
    (0, class_validator_1.Max)(1102.3),
    __metadata("design:type", Number)
], ProfileSetupDto.prototype, "weightValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['kg', 'lb'] }),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsIn)(['kg', 'lb']),
    __metadata("design:type", String)
], ProfileSetupDto.prototype, "weightUnit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/),
    __metadata("design:type", String)
], ProfileSetupDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsIn)(['sedentary', 'lightly_active', 'moderately_active', 'very_active']),
    __metadata("design:type", String)
], ProfileSetupDto.prototype, "activityLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayUnique)(),
    (0, class_validator_1.IsIn)([
        'weight_management',
        'fitness_activity',
        'lose_weight',
        'gain_weight',
        'stay_fit',
        'manage_condition',
        'better_eating',
        'improve_sleep',
        'manage_stress',
    ], { each: true }),
    __metadata("design:type", Array)
], ProfileSetupDto.prototype, "healthGoals", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsIn)(['female', 'male', 'other', 'prefer_not_to_say']),
    __metadata("design:type", String)
], ProfileSetupDto.prototype, "gender", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ProfileSetupDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ProfileSetupDto.prototype, "referralSource", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProfileSetupDto.prototype, "healthReminders", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProfileSetupDto.prototype, "tipsAndInsights", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProfileSetupDto.prototype, "productUpdates", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(7),
    __metadata("design:type", Number)
], ProfileSetupDto.prototype, "step", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.ValidateIf)((_object, value) => value !== undefined),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProfileSetupDto.prototype, "complete", void 0);
//# sourceMappingURL=profile-setup.dto.js.map