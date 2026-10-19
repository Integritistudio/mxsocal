import { apiInstance, API_ENDPOINTS } from "@/config/api";

export const addCoach = async (coachData: any): Promise<any> => {
    return await apiInstance(API_ENDPOINTS.COACH, {
        method: "POST",
        data: coachData,
    });
}

export const fetchCoaches = async (): Promise<any> => {
    return await apiInstance(API_ENDPOINTS.COACH, {
        method: "GET",
    });
}

export const fetchCoachById = async (id: string): Promise<any> => {
    return await apiInstance(API_ENDPOINTS.COACH_BY_ID(id), {
        method: "GET",
    });
}

export const updateCoachById = async (id: string, coachData: any): Promise<any> => {
    return await apiInstance(API_ENDPOINTS.COACH_BY_ID(id), {
        method: "PATCH",
        data: coachData
    })
}

export const deleteCoachById = async (id: string): Promise<any> => {
    return await apiInstance(API_ENDPOINTS.COACH_BY_ID(id), {
        method: "DELETE"
    })
} 