export declare const careProviderAffiliations: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "care_provider_affiliations";
    schema: undefined;
    columns: {
        doctorId: import("drizzle-orm/pg-core").PgColumn<{
            name: "doctor_id";
            tableName: "care_provider_affiliations";
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
        hospitalId: import("drizzle-orm/pg-core").PgColumn<{
            name: "hospital_id";
            tableName: "care_provider_affiliations";
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
