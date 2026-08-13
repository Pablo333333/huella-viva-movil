export type UserRole = 'ADMIN_TERRITORIAL' | 'EMPRESA' | 'ESTADO' | 'COMUNIDAD';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  communityId?: string | null;
}

export function isAdminRole(role?: string | null): boolean {
  return role === 'ADMIN_TERRITORIAL' || role === 'EMPRESA' || role === 'ESTADO';
}

export function isCommunityRole(role?: string | null): boolean {
  return role === 'COMUNIDAD';
}

export function getRoleLabel(role?: string | null): string {
  switch (role) {
    case 'ADMIN_TERRITORIAL':
      return 'Administrador territorial';
    case 'EMPRESA':
      return 'Actor corporativo';
    case 'ESTADO':
      return 'Representante gubernamental';
    case 'COMUNIDAD':
      return 'Liderazgo comunal';
    default:
      return 'Usuario';
  }
}
