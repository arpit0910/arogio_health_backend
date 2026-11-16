type Medicine = {
    recurrence?: 'daily' | 'weekly' | 'cycle' | 'sos';
    weekdays?: number[];
    startDate?: string;
    endDate?: string | null;
    cycleOnDays?: number;
    cycleOffDays?: number;
};
export declare function medicineDueOn(m: Pick<Medicine, 'recurrence' | 'weekdays' | 'startDate' | 'endDate' | 'cycleOnDays' | 'cycleOffDays'>, day: string): boolean;
export declare function doseQuantity(amount: string): number | null;
export {};
