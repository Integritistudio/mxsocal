import { apiInstance, API_ENDPOINTS } from "@/config/api";
import axios from "axios"

const uploadFiles = async (files) => {
    const formData = new FormData();
    formData.append("files", files);
    try {
        const res = await axios.post(API_ENDPOINTS.uploadFiles, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      
        });
        return res.data;
        
    } catch (error) {
        console.log("Error", error?.response?.data?.message);
        throw error.message
    }
}