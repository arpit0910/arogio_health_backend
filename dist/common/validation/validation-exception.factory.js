"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationExceptionFactory = validationExceptionFactory;
const common_1 = require("@nestjs/common");
function flatten(errors, parent = '') {
    return errors.reduce((all, error) => {
        const field = parent ? `${parent}.${error.property}` : error.property;
        if (error.constraints)
            all[field] = Object.values(error.constraints);
        return Object.assign(all, flatten(error.children ?? [], field));
    }, {});
}
function validationExceptionFactory(errors) {
    return new common_1.BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        details: flatten(errors),
    });
}
//# sourceMappingURL=validation-exception.factory.js.map