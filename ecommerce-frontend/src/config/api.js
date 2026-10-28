import axios from 'axios';
// Keep admin requests on the same origin as the login session cookie.
const BASE_URL = '/api/admin';

export const API_ENDPOINTS = {
    SIGN_IN: `${BASE_URL}/auth/login`,
    SIGN_UP: `${BASE_URL}/auth/register`,
    SIGN_OUT: `${BASE_URL}/auth/logout`,
    USER: `${BASE_URL}/user`,
    USER_BY_ID: (id) => `${BASE_URL}/user/${id}`,
    ME: `${BASE_URL}/auth/me`,
    PRODUCTS: `${BASE_URL}/products`,
    PRODUCT_BY_ID: (id) => `${BASE_URL}/products/${id}`,
    PRODUCT_AVAILABILITY: (id) => `${BASE_URL}/products/${id}/availability`,
    COACH: `${BASE_URL}/coach`,
    COACH_BY_ID: (id) => `${BASE_URL}/coach/${id}`,
    UPLOAD: `${BASE_URL}/upload`
};

export default {
    BASE_URL,
};

export const getAuthHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
});

export const getJsonHeaders = (token) => ({
    'Content-Type': 'application/json',
    ...getAuthHeaders(token),
});

export const getFormDataHeaders = (token) => ({
    ...getAuthHeaders(token),
});

export const apiInstance = async (endpoint, options = {}) => {
    const response = await axios({
        url: endpoint,
        withCredentials: true,
        ...options,
    });
    const status = response.status;
    if(status === 401) {
        throw new Error('Unauthorized');
    }
    return response.data;
};
