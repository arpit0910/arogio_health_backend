"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicineDueOn = medicineDueOn;
exports.doseQuantity = doseQuantity;
const personal_wellness_domain_1 = require("./personal-wellness.domain");
function medicineDueOn(m, day) {
    if (!(0, personal_wellness_domain_1.validDay)(day) || (m.startDate && day < m.startDate) || (m.endDate && day > m.endDate))
        return false;
    if (m.recurrence === 'sos')
        return false;
    if (m.recurrence === 'weekly')
        return (m.weekdays ?? []).includes(new Date(day + 'T12:00:00Z').getUTCDay());
    if (m.recurrence === 'cycle') {
        if (!m.startDate)
            return false;
        const on = m.cycleOnDays ?? 1, off = m.cycleOffDays ?? 1;
        return (0, personal_wellness_domain_1.daysBetween)(m.startDate, day) % (on + off) < on;
    }
    return true;
}
function doseQuantity(amount) {
    if (!/^\d+(?:\.\d+)?(?:\s+[^\d].*)?$/.test(amount.trim()))
        return null;
    const value = Number.parseFloat(amount);
    return Number.isFinite(value) && value > 0 ? value : null;
}
//# sourceMappingURL=medicine-rules.js.map