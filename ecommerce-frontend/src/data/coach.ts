import { Field } from "@/utils/types";

export const fields: Field[] = [
    { name: "firstName", label: "First Name" },
    { name: "lastName", label: "Last Name" },
    { name: "email", label: "Email Address", validate: ["email"] },
    { name: "phone", label: "Phone Number" },
    { name: "country", label: "Country" },
    { name: "state", label: "State" },
    { name: "city", label: "City" },
    { name: "zipCode", label: "Zip Code" },
    { name: "experience", label: "Experience (Years)", type: "number" },
    { name: "facebook", label: "Facebook", validate: ["link"] },
    { name: "xcom", label: "X.com", validate: ["link"] },
    { name: "linkedin", label: "LinkedIn", validate: ["link"] },
    { name: "instagram", label: "Instagram", validate: ["link"] },
    { name: "bio", label: "Bio" }
];