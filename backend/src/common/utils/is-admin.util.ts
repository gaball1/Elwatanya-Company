import { JwtPayload } from '../decorators/current-user.decorator';

const ADMIN_ROLE_NAMES = ['SUPER_ADMIN', 'ADMIN', 'GENERAL_MANAGER'];
const ADMIN_USER_ROLES = ['CEO'];

export function isAdminUser(user: JwtPayload | undefined): boolean {
  if (!user) return false;
  if (user.roleNames?.some((r) => ADMIN_ROLE_NAMES.includes(r))) return true;
  if (ADMIN_USER_ROLES.includes(user.role)) return true;
  return false;
}
