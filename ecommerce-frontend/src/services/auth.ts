import { apiInstance, API_ENDPOINTS } from "../config/api";

export const signIn = async (email: string, password: string): Promise<any> => {
    const data = { email, password };
    return await apiInstance(`${API_ENDPOINTS.SIGN_IN.replace(/\/login$/, "")}/admin/login`, {
        method: "POST",
        data,
    });
};

export const logout = async (): Promise<any> => {
    return await apiInstance("/api/customer/logout", {
        method: "POST",
    });
}

export const getProfile = async (): Promise<any> => {
    return await apiInstance("/api/customer/me", {
        method: "GET",
    });
};

export const updateProfile = async (profileData: any): Promise<any> => {
    return await apiInstance("/api/customer/profile", {
        method: "PUT",
        data: profileData,
    });
}