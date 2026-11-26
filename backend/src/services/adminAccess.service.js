import { employeeWorkWindow } from '../../../shared/employeeWorkSchedule.js';
import { AccessRole } from '../models/AccessRole.js';
import { isSuperAdmin } from '../../../shared/adminAccess.js';

export const accessProfile = async user => {
  if (!user || user.role !== 'admin') return {};
  if (isSuperAdmin(user)) return { isEmployee: false, isSuperAdmin: true, permissions: {} };
  const role = user.accessRoleId ? await AccessRole.findById(user.accessRoleId).lean() : null;
  return { isEmployee: true, isSuperAdmin: false, accessRoleId: user.accessRoleId,
    accessRoleName: role?.name || 'Unassigned', accessRoleActive: role?.isActive === true,
    workSchedule: role?.workSchedule, workScheduleRevision: role?.workScheduleRevision || 0, employeeWorkWindow: employeeWorkWindow(role?.workSchedule),
    permissions: role?.isActive ? role.permissions : {} };
};
