import { Field, ValidationError } from "./types";
import { isValidEmail, isNumber, isValidLink } from "./helpers";

export const validateEntity = (data: any, fields: Field[]): ValidationError => {
    const errors: ValidationError = {};

    fields.forEach(field => {
        const value = data[field.name];
        const label = field.label;
        const type = field.type || "text";
        const validations = field.validate || [];
        const stringValue = value ? String(value).trim() : "";

        if (!stringValue) {
            errors[field.name] = `${label} is required`;
            return;
        }

        if (validations.includes("email") && !isValidEmail(stringValue)) {
            errors[field.name] = `Valid ${label} is required`;
            return;
        }

        if (validations.includes("link") && !isValidLink(stringValue)) {
            errors[field.name] = `Valid ${label} link is required`;
            return;
        }

        if (type === "number" && !isNumber(stringValue)) {
            errors[field.name] = `${label} must be a number`;
        }
    });

    return errors;
};