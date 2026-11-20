// The signed-in user as the rest of the app sees it, built from Lexicon's /api/auth/me or login response.
//
// role and permissions are decided by Lexicon (PermissionManager) and only *displayed* here: the servers
// enforce every permission again on each request, so hiding a button is a convenience, never the check.

export function toSessionUser(data) {
  return {
    id: data.id,
    username: data.username,
    displayName: data.displayName,
    role: data.role || 'USER',
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
  };
}

/** Whether the server listed `permission` for this user (display only). */
export function hasPermission(user, permission) {
  return !!user && Array.isArray(user.permissions) && user.permissions.includes(permission);
}
