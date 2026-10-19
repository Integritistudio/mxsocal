export const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(email).toLowerCase());
}

export const isNumber = (value: string) => {
    return value === "" || /^\+?\d*$/.test(value);
};


export const isValidLink = (link: string) => {
    try {
        new URL(link);
        return true;
    } catch {
        return false;
    }
}
