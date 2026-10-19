import React, { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useAlert } from "@/context/AlertContext";
import { updateProfile } from "@/services/auth";

import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

type FormData = {
    country: string;
    state: string;
    city: string;
    zipCode: string;
};

type Field = {
    label: string;
    name: keyof FormData;
};
const fields: Field[] = [
    { label: "City", name: "city" },
    { label: "State", name: "state" },
    { label: "Postal Code", name: "zipCode" },
    { label: "Country", name: "country" }
]

export default function EditLocation({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { showAlert } = useAlert();
    const { user, getUser } = useUser();

    const [loading, setLoading] = useState<boolean>(false);
    const [formData, setFormData] = useState<FormData>({
        country: user?.country || "",
        state: user?.state || "",
        city: user?.city || "",
        zipCode: user?.zipCode || "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({ ...prevData, [name]: value }));
    }

    const handleSave = async () => {
        try {
            setLoading(true);
            await updateProfile(formData);
            showAlert("success", "Profile updated successfully");
            getUser();
            onClose();
        } catch (error) {
            showAlert("error", "Failed to update profile. Please try again.");
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        if (user) {
            setFormData({
                country: user.country || "",
                state: user.state || "",
                city: user.city || "",
                zipCode: user.zipCode || "",
            });
        }
    }, [user])

    return (<Modal isOpen={isOpen} onClose={onClose} className="max-w-[700px] m-4">
        <div className="relative w-full p-4 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-11">
            <div className="px-2 pr-14">
                <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                    Edit Address
                </h4>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                    Update your details to keep your profile up-to-date.
                </p>
            </div>
            <form className="flex flex-col">
                <div className="px-2 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                        {fields?.map((field, index) => (
                            <div key={index}>
                                <Label>{field.label}</Label>
                                <Input
                                    type="text"
                                    name={field.name}
                                    placeholder={field.label}
                                    onChange={handleChange}
                                    defaultValue={formData[field.name] || ""}
                                />
                            </div>
                        ))}

                    </div>
                </div>
                <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                    <Button size="sm" variant="outline" onClick={onClose} disabled={loading}>
                        Close
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={loading}>
                        Save Changes
                    </Button>
                </div>
            </form>
        </div>
    </Modal>
    )
}