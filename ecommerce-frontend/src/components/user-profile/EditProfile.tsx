"use client";
import React from "react";
import { useUser } from "@/context/UserContext";

import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { updateProfile } from "@/services/auth";
import { useAlert } from "@/context/AlertContext";


type FormData = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    bio: string;
};

type Field = {
    label: string;
    name: keyof FormData;
    disabled?: boolean
};
const fields: Field[] = [
    { label: "First Name", name: "firstName" },
    { label: "Last Name", name: "lastName" },
    { label: "Email Address", name: "email", disabled: true },
    { label: "Phone", name: "phone" },
]

export default function EditProfile({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { user, getUser } = useUser();
    const { showAlert } = useAlert()
    const [firstName, lastName] = user?.name ? user.name.split(" ") : ["", ""];
    const [loading, setLoading] = React.useState<boolean>(false)
    const [formData, setFormData] = React.useState<FormData>({
        firstName: firstName,
        lastName: lastName,
        email: user?.email || "",
        phone: user?.phone || "",
        bio: user?.bio || "",
    });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({ ...prevData, [name]: value }));
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const payload = {
                name: formData?.firstName?.trim() + " " + formData?.lastName?.trim(),
                email: formData?.email,
                phone: formData?.phone,
                bio: formData?.bio
            }
            await updateProfile(payload);
            showAlert("success", "Profile updated successfully");
            getUser();
            onClose();
        } catch (error) {
            showAlert("error", "Failed to update profile. Please try again.");
        } finally {
            setLoading(false);
        }
    }
    React.useEffect(() => {
        if (user) {
            const [firstName, lastName] = user.name ? user.name.split(" ") : ["", ""];
            setFormData({
                firstName: firstName,
                lastName: lastName,
                email: user.email || "",
                phone: user.phone || "",
                bio: user.bio || "",
            });
        }
    }, [user]);



    return (
        <Modal isOpen={isOpen} onClose={!loading ? onClose : () => { }} className="max-w-[700px] m-4">
            <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                <div className="px-2 pr-14">
                    <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                        Edit Personal Information
                    </h4>
                    <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                        Update your details to keep your profile up-to-date.
                    </p>
                </div>
                <form className="flex flex-col">
                    <div className="custom-scrollbar lg:max-h-[calc(100vh-300px)] max-h-[calc(100vh-200px)] overflow-y-auto px-2 pb-3">
                        <div className="mt-7">
                            <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                                Personal Information
                            </h5>

                            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-1">
                                {fields?.map((field, index) => (
                                    <div key={index} className="lg:col-span-1 col-span-2">
                                        <Label>{field.label}</Label>
                                        <Input
                                            type="text"
                                            name={field.name}
                                            placeholder={field.label}
                                            onChange={handleChange}
                                            disabled={field?.disabled || false}
                                            defaultValue={formData[field.name] || ""}
                                        />
                                    </div>
                                ))}

                                <div className="col-span-2">
                                    <Label>Bio</Label>
                                    <Input type="text" name="bio" placeholder="Bio" defaultValue={formData.bio} onChange={handleChange} />
                                </div>
                            </div>
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
};