import { HttpStatus } from '@nestjs/common';
import { ApiError } from '../errors/api-error';

export type HeightUnit = 'cm' | 'in';
export type WeightUnit = 'kg' | 'lb';

type MeasurementInput = {
  heightValue?: number;
  heightUnit?: HeightUnit;
  weightValue?: number;
  weightUnit?: WeightUnit;
};

export type NormalizedMeasurements = MeasurementInput & {
  heightCm?: number;
  weightKg?: number;
};

const round = (value: number): number => Math.round(value * 10) / 10;

export function normalizeMeasurements(input: MeasurementInput): NormalizedMeasurements {
  const hasHeight = input.heightValue !== undefined || input.heightUnit !== undefined;
  const hasWeight = input.weightValue !== undefined || input.weightUnit !== undefined;

  if (hasHeight && (input.heightValue === undefined || input.heightUnit === undefined)) {
    throw new ApiError(
      'VALIDATION_FAILED',
      'Height value and unit must be provided together',
      HttpStatus.BAD_REQUEST,
    );
  }
  if (hasWeight && (input.weightValue === undefined || input.weightUnit === undefined)) {
    throw new ApiError(
      'VALIDATION_FAILED',
      'Weight value and unit must be provided together',
      HttpStatus.BAD_REQUEST,
    );
  }

  if (
    input.heightValue !== undefined &&
    input.heightUnit !== undefined &&
    (input.heightValue < (input.heightUnit === 'cm' ? 50 : 20) ||
      input.heightValue > (input.heightUnit === 'cm' ? 300 : 120))
  ) {
    throw new ApiError(
      'VALIDATION_FAILED',
      'Height is outside the supported range',
      HttpStatus.BAD_REQUEST,
    );
  }
  if (
    input.weightValue !== undefined &&
    input.weightUnit !== undefined &&
    (input.weightValue < (input.weightUnit === 'kg' ? 2 : 4.4) ||
      input.weightValue > (input.weightUnit === 'kg' ? 500 : 1102.3))
  ) {
    throw new ApiError(
      'VALIDATION_FAILED',
      'Weight is outside the supported range',
      HttpStatus.BAD_REQUEST,
    );
  }

  const normalized: NormalizedMeasurements = {};
  if (input.heightValue !== undefined && input.heightUnit !== undefined) {
    normalized.heightValue = input.heightValue;
    normalized.heightUnit = input.heightUnit;
    normalized.heightCm = round(
      input.heightUnit === 'in' ? input.heightValue * 2.54 : input.heightValue,
    );
  }
  if (input.weightValue !== undefined && input.weightUnit !== undefined) {
    normalized.weightValue = input.weightValue;
    normalized.weightUnit = input.weightUnit;
    normalized.weightKg = round(
      input.weightUnit === 'lb' ? input.weightValue * 0.45359237 : input.weightValue,
    );
  }
  return normalized;
}
