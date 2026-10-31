// Клиентские проверки ролей (без серверных импортов). Настоящая проверка — на сервере в API.
export const isSupRole = (role: string) => role === 'founder' || role === 'manager';
export const canManageUsersRole = (role: string) => role === 'founder' || role === 'it';
