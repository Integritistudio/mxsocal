import { apiInstance, API_ENDPOINTS } from "@/config/api";

export const getManagers = async () => {
    return await apiInstance(`${API_ENDPOINTS.USER}?role=manager`, {
        method: "GET",
    });
};

export const addManager = async (payload: any) => {
    return await apiInstance(`${API_ENDPOINTS.USER}/staff`, {
        method: "POST",
        data: { ...payload, role: "manager" }
    });
};

export const getManagerById = async (id: string) => {
    return await apiInstance(API_ENDPOINTS.USER_BY_ID(id), {
        method: "GET"
    })
}

export const updateManager = async (id: string, data: any) => {
    const editableData = { ...data };
    delete editableData.password;
    delete editableData.role;
    return await apiInstance(API_ENDPOINTS.USER_BY_ID(id), {
        method: "PATCH",
        data: editableData
    })
}

export const deleteManager = async (id: string) => {
    return await apiInstance(API_ENDPOINTS.USER_BY_ID(id), {
        method: "DELETE"
    })
}