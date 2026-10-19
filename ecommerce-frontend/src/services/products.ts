import { apiInstance, API_ENDPOINTS } from "@/config/api";

export const addProduct = async (productData: any): Promise<any> => {
    return await apiInstance(API_ENDPOINTS.PRODUCTS, {
        method: "POST",
        data: productData,
    });
}

export const fetchProducts = async (): Promise<any> => {
    return await apiInstance(API_ENDPOINTS.PRODUCTS, {
        method: "GET",
    });
}

export const fetchProductById = async (id: string): Promise<any> => {
    return await apiInstance(API_ENDPOINTS.PRODUCT_BY_ID(id), {
        method: "GET",
    });
}

export const addAvailabilityToProduct = async (id: string, availabilityData: any): Promise<any> => {
    return await apiInstance(API_ENDPOINTS.PRODUCT_AVAILABILITY(id), {
        method: "POST",
        data: availabilityData,
    });
}

export const getProductAvailability = async (id: string): Promise<any> => {
    return await apiInstance(API_ENDPOINTS.PRODUCT_AVAILABILITY(id), {
        method: "GET",
    });
}


