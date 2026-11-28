import { customType } from 'drizzle-orm/pg-core';
export const binaryColumn = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});
