import { Field } from "@/utils/types";

export const fields: Field[] = [
    { name: "name", label: "Full Name" },
    { name: "email", label: "Email Address", validate: ["email"] },
    { name: "phone", label: "Phone Number" },
    { name: "password", label: "Password", type: "password" },
    { name: "country", label: "Country" },
    { name: "state", label: "State" },
    { name: "city", label: "City" },
    { name: "zipCode", label: "Zip Code" },
    { name: "bio", label: "Bio" }
]

export const PERMISSIONS = {
    dashboard: ["dashboard:view"],
    booking: ["booking:view", "booking:update"],
    product: ["product:create", "product:view", "product:update", "product:delete"],
    coach: ["coach:create", "coach:view", "coach:update", "coach:delete"],
    availability: ["availability:manage"],
};
