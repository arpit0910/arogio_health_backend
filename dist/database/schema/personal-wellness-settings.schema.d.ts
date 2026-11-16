import type { ActivityTracking, CycleSettings, WaterPlan } from '../../modules/personal-wellness/domain/personal-wellness.domain';
export declare const personalWellnessSettings: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "personal_wellness_settings";
    schema: undefined;
    columns: {
        userId: import("drizzle-orm/pg-core").PgColumn<{
            name: "user_id";
            tableName: "personal_wellness_settings";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        activityTracking: import("drizzle-orm/pg-core").PgColumn<{
            name: "activity_tracking";
            tableName: "personal_wellness_settings";
            dataType: "json";
            columnType: "PgJsonb";
            data: ActivityTracking;
            driverParam: unknown;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: ActivityTracking;
        }>;
        waterPlan: import("drizzle-orm/pg-core").PgColumn<{
            name: "water_plan";
            tableName: "personal_wellness_settings";
            dataType: "json";
            columnType: "PgJsonb";
            data: WaterPlan;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: WaterPlan;
        }>;
        cycleSettings: import("drizzle-orm/pg-core").PgColumn<{
            name: "cycle_settings";
            tableName: "personal_wellness_settings";
            dataType: "json";
            columnType: "PgJsonb";
            data: CycleSettings;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: CycleSettings;
        }>;
        medicines: import("drizzle-orm/pg-core").PgColumn<{
            name: "medicines";
            tableName: "personal_wellness_settings";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                id: string;
                name: string;
                notes: string;
                enabled: boolean;
                form?: string;
                strength?: string;
                unit?: string;
                alertType?: "default" | "gentle" | "vibrate";
                recurrence?: "daily" | "weekly" | "cycle" | "sos";
                weekdays?: number[];
                startDate?: string;
                endDate?: string | null;
                cycleOnDays?: number;
                cycleOffDays?: number;
                stock?: number | null;
                lowStockThreshold?: number;
                stockDebits?: Record<string, number>;
                doses: {
                    time: string;
                    amount: string;
                    meal?: "any" | "before" | "after";
                }[];
            }[];
            driverParam: unknown;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: {
                id: string;
                name: string;
                notes: string;
                enabled: boolean;
                form?: string;
                strength?: string;
                unit?: string;
                alertType?: "default" | "gentle" | "vibrate";
                recurrence?: "daily" | "weekly" | "cycle" | "sos";
                weekdays?: number[];
                startDate?: string;
                endDate?: string | null;
                cycleOnDays?: number;
                cycleOffDays?: number;
                stock?: number | null;
                lowStockThreshold?: number;
                stockDebits?: Record<string, number>;
                doses: {
                    time: string;
                    amount: string;
                    meal?: "any" | "before" | "after";
                }[];
            }[];
        }>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "personal_wellness_settings";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
