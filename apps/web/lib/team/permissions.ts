export const teamRoles = ["owner", "admin", "manager", "editor", "viewer"] as const;
export type TeamRole = (typeof teamRoles)[number];

export const permissions = ["billing:manage", "analytics:view", "members:manage", "leads:manage", "clients:manage", "projects:manage", "content:edit", "workspace:read", "settings:manage"] as const;
export type Permission = (typeof permissions)[number];

const permissionMatrix: Record<TeamRole, readonly Permission[]> = {
  owner: permissions,
  admin: ["billing:manage", "analytics:view", "members:manage", "projects:manage", "content:edit", "workspace:read", "settings:manage"],
  manager: ["analytics:view", "leads:manage", "clients:manage", "projects:manage", "content:edit", "workspace:read"],
  editor: ["content:edit", "workspace:read"],
  viewer: ["workspace:read"],
};

export function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === "string" && teamRoles.includes(value as TeamRole);
}

export function canManageMembers(role?: string | null) {
  return hasPermission(role, "members:manage");
}

export function canManageProjects(role?: string | null) {
  return hasPermission(role, "projects:manage");
}

export function canEditAssets(role?: string | null) {
  return hasPermission(role, "content:edit");
}

export function canGenerateContent(role?: string | null) {
  return hasPermission(role, "content:edit");
}

export function hasPermission(role: string | null | undefined, permission: Permission) {
  return isTeamRole(role) && permissionMatrix[role].includes(permission);
}

export const canManageBilling = (role?: string | null) => hasPermission(role, "billing:manage");
export const canViewAnalytics = (role?: string | null) => hasPermission(role, "analytics:view");
export const canManageLeads = (role?: string | null) => hasPermission(role, "leads:manage");
export const canManageClients = (role?: string | null) => hasPermission(role, "clients:manage");
export const canManageSettings = (role?: string | null) => hasPermission(role, "settings:manage");

export function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function roleBadgeClass(role: string) {
  if (role === "owner") return "border-[#FBBF24]/30 bg-[#FBBF24]/10 text-[#FDE68A]";
  if (role === "admin") return "border-cyberBlue/30 bg-cyberBlue/[0.08] text-cyberBlue";
  if (role === "manager") return "border-[#34D399]/30 bg-[#34D399]/10 text-[#86EFAC]";
  if (role === "editor") return "border-violetGlow/30 bg-violetGlow/10 text-violetGlow";
  if (role === "viewer") return "border-white/10 bg-white/[0.04] text-mist";
  return "border-white/10 bg-white/[0.04] text-mist";
}
