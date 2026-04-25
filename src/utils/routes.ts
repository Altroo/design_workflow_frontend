// Site root
export const SITE_ROOT = `${process.env.NEXT_PUBLIC_DOMAIN_URL_PREFIX}/`;
export const BACKEND_SITE_ADMIN = `${process.env.NEXT_PUBLIC_API_URL}/gestion-interne-gf62`;
// Auth
export const AUTH_LOGIN = `${SITE_ROOT}/login`;
// Auth forgot password
export const AUTH_RESET_PASSWORD = `${SITE_ROOT}/reset-password`;
export const AUTH_RESET_PASSWORD_ENTER_CODE = `${SITE_ROOT}/reset-password/enter-code`;
export const AUTH_RESET_PASSWORD_SET_PASSWORD = `${SITE_ROOT}/reset-password/set-password`;
export const AUTH_RESET_PASSWORD_COMPLETE = `${SITE_ROOT}/reset-password/set-password-complete`;
// Dashboard
export const DASHBOARD = `${SITE_ROOT}dashboard`;
export const DASHBOARD_OVERVIEW = `${SITE_ROOT}dashboard/overview`;
export const DASHBOARD_BOARD = `${SITE_ROOT}dashboard/board`;
export const DASHBOARD_MY_WORK = `${SITE_ROOT}dashboard/my-work`;
export const DASHBOARD_PROJECTS = `${SITE_ROOT}dashboard/projects`;
export const DASHBOARD_PROJECT_VIEW = (id: number | string) => `${SITE_ROOT}dashboard/projects/${id}`;
export const DASHBOARD_TASK_VIEW = (id: number | string) => `${SITE_ROOT}dashboard/tasks/${id}`;
export const DASHBOARD_TEAM = `${SITE_ROOT}dashboard/team`;
export const DASHBOARD_REPORTS_TIME = `${SITE_ROOT}dashboard/reports/time`;
export const DASHBOARD_NOTIFICATIONS = `${SITE_ROOT}dashboard/notifications`;
export const DASHBOARD_CHAT = `${SITE_ROOT}dashboard/chat`;
// Settings
export const DASHBOARD_EDIT_PROFILE = `${SITE_ROOT}dashboard/settings/edit-profile`;
export const DASHBOARD_PASSWORD = `${SITE_ROOT}dashboard/settings/password`;
// Users (staff only)
export const USERS_LIST = `${SITE_ROOT}dashboard/users`;
export const USERS_ADD = `${SITE_ROOT}dashboard/users/new`;
export const USERS_VIEW = (id: number) => `${SITE_ROOT}dashboard/users/${id}`;
export const USERS_EDIT = (id: number) => `${SITE_ROOT}dashboard/users/${id}/edit`;
