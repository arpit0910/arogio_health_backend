"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeMeasurements = normalizeMeasurements;
const common_1 = require("@nestjs/common");
const api_error_1 = require("../errors/api-error");
const round = (value) => Math.round(value * 10) / 10;
function normalizeMeasurements(input) {
    const hasHeight = input.heightValue !== undefined || input.heightUnit !== undefined;
    const hasWeight = input.weightValue !== undefined || input.weightUnit !== undefined;
    if (hasHeight && (input.heightValue === undefined || input.heightUnit === undefined)) {
        throw new api_error_1.ApiError('VALIDATION_FAILED', 'Height value and unit must be provided together', common_1.HttpStatus.BAD_REQUEST);
    }
    if (hasWeight && (input.weightValue === undefined || input.weightUnit === undefined)) {
        throw new api_error_1.ApiError('VALIDATION_FAILED', 'Weight value and unit must be provided together', common_1.HttpStatus.BAD_REQUEST);
    }
    if (input.heightValue !== undefined &&
        input.heightUnit !== undefined &&
        (input.heightValue < (input.heightUnit === 'cm' ? 50 : 20) ||
            input.heightValue > (input.heightUnit === 'cm' ? 300 : 120))) {
        throw new api_error_1.ApiError('VALIDATION_FAILED', 'Height is outside the supported range', common_1.HttpStatus.BAD_REQUEST);
    }
    if (input.weightValue !== undefined &&
        input.weightUnit !== undefined &&
        (input.weightValue < (input.weightUnit === 'kg' ? 2 : 4.4) ||
            input.weightValue > (input.weightUnit === 'kg' ? 500 : 1102.3))) {
        throw new api_error_1.ApiError('VALIDATION_FAILED', 'Weight is outside the supported range', common_1.HttpStatus.BAD_REQUEST);
    }
    const normalized = {};
    if (input.heightValue !== undefined && input.heightUnit !== undefined) {
        normalized.heightValue = input.heightValue;
        normalized.heightUnit = input.heightUnit;
        normalized.heightCm = round(input.heightUnit === 'in' ? input.heightValue * 2.54 : input.heightValue);
    }
    if (input.weightValue !== undefined && input.weightUnit !== undefined) {
        normalized.weightValue = input.weightValue;
        normalized.weightUnit = input.weightUnit;
        normalized.weightKg = round(input.weightUnit === 'lb' ? input.weightValue * 0.45359237 : input.weightValue);
    }
    return normalized;
}
//# sourceMappingURL=measurements.js.map