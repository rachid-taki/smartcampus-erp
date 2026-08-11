import api from "./../api/axios";

export const getSuperAdminStats = async () => {
    const res: any = await api.get("/superadmin/stats");
    return res?.data?.stats ?? res?.stats ?? null;
};

export const getUsers = async (filters?: { search?: string; role?: string; actif?: string }) => {
    const res: any = await api.get("/superadmin/users", { params: filters });
    return res?.data?.users ?? res?.users ?? [];
};

export const createUser = async (userData: any) => {
    const res: any = await api.post("/superadmin/users", userData);
    return res?.data?.user ?? res?.user;
};

export const updateUser = async (id: string, userData: any) => {
    const res: any = await api.patch(`/superadmin/users/${id}`, userData);
    return res?.data?.user ?? res?.user;
};

export const toggleUserStatus = async (id: string) => {
    const res: any = await api.patch(`/superadmin/users/${id}/toggle-status`);
    return res?.data ?? res;
};

export const resetUserPassword = async (id: string, newPassword: string) => {
    const res: any = await api.post(`/superadmin/users/${id}/reset-password`, { newPassword });
    return res?.data ?? res;
};

export const getRoles = async () => {
    const res: any = await api.get("/superadmin/roles");
    return res?.data?.roles ?? res?.roles ?? [];
};

export const createRole = async (roleData: { nom_role: string; description: string }) => {
    const res: any = await api.post("/superadmin/roles", roleData);
    return res?.data?.role ?? res?.role;
};

export const getPermissions = async () => {
    const res: any = await api.get("/superadmin/permissions");
    return res?.data?.permissions ?? res?.permissions ?? [];
};

export const getRolePermissions = async (roleId: string) => {
    const res: any = await api.get(`/superadmin/roles/${roleId}/permissions`);
    return res?.data?.permissions ?? res?.permissions ?? [];
};

export const updateRolePermissions = async (roleId: string, permissionIds: string[]) => {
    const res: any = await api.put(`/superadmin/roles/${roleId}/permissions`, { permissionIds });
    return res?.data ?? res;
};
export const getAuditLogs = async (filters?: {
    module?: string;
    entite?: string;
    action?: string;
    search?: string;
}) => {
    const res: any = await api.get("/superadmin/audit", { params: filters });
    return res?.data?.logs ?? res?.logs ?? [];
};

export const getAuditStats = async () => {
    const res: any = await api.get("/superadmin/audit/stats");
    return res?.data?.stats ?? res?.stats ?? null;
};

export const extractUsersFromFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res: any = await api.post("/superadmin/users/bulk/extract", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res?.data?.students ?? res?.students ?? [];
};

export const bulkCreateUsers = async (students: any[]) => {
    const res: any = await api.post("/superadmin/users/bulk/create", { students });
    return res?.data?.results ?? res?.results;
};

export const getRecentActivity = async () => {
    const res: any = await api.get("/superadmin/activity");
    return res?.data?.activity ?? res?.activity ?? [];
};