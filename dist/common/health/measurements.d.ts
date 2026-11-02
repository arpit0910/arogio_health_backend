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
export declare function normalizeMeasurements(input: MeasurementInput): NormalizedMeasurements;
export {};
