export declare const doctorDepartments: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "doctor_departments";
    schema: undefined;
    columns: {
        doctor_id: import("drizzle-orm/pg-core").PgColumn<{
            name: "doctor_id";
            tableName: "doctor_departments";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        department_id: import("drizzle-orm/pg-core").PgColumn<{
            name: "department_id";
            tableName: "doctor_departments";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
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
