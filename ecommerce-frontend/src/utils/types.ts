export interface AddCoachProps {
    id?: string;
    profileImage?: string,
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    bio?: string;
    facebook?: string;
    xcom?: string;
    linkedin?: string;
    instagram?: string;
    country?: string;
    state?: string;
    city?: string;
    zipCode?: string;
    experience?: number | string;
    [key: string]: string | number | undefined;
}

export interface CoachTableOrder {
    id: number;
    user: {
        image?: string;
        name?: string;
        email: string;
    };
    phone?: string;
    country?: string;
    state?: string;
    city?: string;
    experience?: number
}
export interface UserTableOrder {
    id: number;
    user: {
        image?: string;
        name?: string;
        email: string;
    };
    phone?: string;
    country?: string;
    state?: string;
    city?: string;
}

export type Field = {
    name: string;
    label: string;
    type?: string;
    placeholder?: string;
    validate?: string[];
};

export type ValidationError = {
    [key: string]: string;
};


export type UserData = {
    id?: string,
    profileImage?: string,
    name?: string,
    email: string,
    phone: string,
    password?: string,
    bio: string,
    city?: string,
    state?: string,
    country?: string,
    zipCode?: string,
    permissions?: string[],
    [key: string]: string | string[] | number | undefined;
}