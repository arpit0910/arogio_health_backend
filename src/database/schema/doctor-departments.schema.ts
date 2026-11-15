import { index, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { doctors } from './doctors.schema';
import { medicalDepartments } from './medical-departments.schema';
export const doctorDepartments = pgTable(
  'doctor_departments',
  {
    doctor_id: uuid('doctor_id')
      .notNull()
      .references(() => doctors.id, { onDelete: 'cascade' }),
    department_id: uuid('department_id')
      .notNull()
      .references(() => medicalDepartments.id),
  },
  (t) => [
    primaryKey({ columns: [t.doctor_id, t.department_id] }),
    index('doctor_departments_department').on(t.department_id),
  ],
);
