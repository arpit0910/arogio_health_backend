"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUniqueViolation = isUniqueViolation;
function isUniqueViolation(error, constraint) {
    const visited = new Set();
    let current = error;
    while (typeof current === 'object' && current !== null && !visited.has(current)) {
        visited.add(current);
        const candidate = current;
        if (candidate.code === '23505' && (!constraint || candidate.constraint === constraint))
            return true;
        current = candidate.cause;
    }
    return false;
}
//# sourceMappingURL=database-error.js.map