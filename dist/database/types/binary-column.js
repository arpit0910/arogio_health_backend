"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.binaryColumn = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.binaryColumn = (0, pg_core_1.customType)({
    dataType() {
        return 'bytea';
    },
});
//# sourceMappingURL=binary-column.js.map