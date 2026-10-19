"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { addManager, updateManager } from "@/services/managers";
import { isNumber } from "@/utils/helpers";
import { useAlert } from "@/context/AlertContext";
import { PERMISSIONS, fields as initalFields } from "@/data/user";
import { UserData, ValidationError } from "@/utils/types";
import { validateEntity } from "@/utils/validation";



const ManagerCreateModal = ({ isOpen, onClose, editData, isEditMode, loadManagers }: { isOpen: boolean, onClose: () => void, loadManagers?: () => Promise<void>, editData?: UserData | null, isEditMode?: boolean }) => {
    const { showAlert } = useAlert()
    const fields = isEditMode ? initalFields?.filter((f) => !["password"]?.includes(f?.name)) : initalFields;
    const initialFormData: UserData = fields.reduce((acc, field) => {
        acc[field.name] = editData?.[field.name] ?? "";
        return acc;
    }, {} as UserData);
    const [form, setForm] = useState<UserData>(initialFormData);
    const [errors, setErrors] = useState<ValidationError>({});
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target as any;
        if (name === "phone" && value && !isNumber(value)) return;
        setForm((p) => ({ ...p, [name]: value }));
        setErrors((p) => ({ ...p, [name]: "" }));
    };

    const togglePermission = (perm: string) => {
        setPermissions((p) => (p.includes(perm) ? p.filter((x) => x !== perm) : [...p, perm]));
    };

    const toggleSection = (section: keyof typeof PERMISSIONS) => {
        const items = PERMISSIONS[section];
        const allSelected = items.every((i) => permissions.includes(i));
        if (allSelected) setPermissions((p) => p.filter((x) => !items.includes(x)));
        else setPermissions((p) => Array.from(new Set([...p, ...items])));
    };

    const handleSave = async (ev?: React.FormEvent) => {
        ev?.preventDefault();
        const validation = validateEntity(form, fields);
        if (Object.keys(validation).length > 0) { setErrors(validation); return; }
        setLoading(true);
        try {
            const payload = {
                permissions,
                ...form
            };
            if (isEditMode && editData?.id) {
                await updateManager(editData.id, payload)
            } else if (!isEditMode) {
                await addManager(payload);
            }
            loadManagers?.()
            showAlert("success", isEditMode ? "Manager updated successfully!" : "Manager added successfully!")
            onClose();
        } catch (err) {
            showAlert("error", "Failed to add manager")
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const initialize = () => {
        if (isOpen) {
            const initialFormData: UserData = fields.reduce((acc, field) => {
                acc[field.name] = editData?.[field.name] ?? "";
                return acc;
            }, {} as UserData);
            setForm(initialFormData)
            setPermissions(editData?.permissions || [])
        }
    }
    useEffect(() => {
        initialize()
    }, [isOpen])

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-[700px] m-4">
            <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                <div className="px-2 pr-14">
                    <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{isEditMode ? "Update" : "Add"} Manager</h4>
                    <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">{isEditMode ? "Update" : "Create a"} manager account and assign permissions.</p>
                </div>
                <form onSubmit={handleSave} className="flex flex-col">
                    <div className="custom-scrollbar h-[340px] overflow-y-auto px-2 pb-3">
                        <div className="mb-5">
                            <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">Personal Information</h5>
                            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                                {fields?.slice(0, fields?.length - 1)?.map((field, index) => (
                                    <div key={index} className="lg:col-span-1 col-span-2">
                                        <Label>{field.label}</Label>
                                        <Input
                                            type={field?.type || "text"}
                                            name={field.name}
                                            placeholder={field.label}
                                            onChange={handleChange}
                                            defaultValue={form[field.name] || ""}
                                            error={!!errors?.[field.name]}
                                            hint={errors?.[field.name]}
                                        />
                                    </div>
                                ))}
                                <div className="col-span-1 lg:col-span-2">
                                    <Label>Bio</Label>
                                    <Input
                                        type="text"
                                        name="bio"
                                        defaultValue={form.bio ?? ""}
                                        onChange={handleChange}
                                        placeholder="Enter bio"
                                        error={!!errors.bio}
                                        hint={errors.bio}
                                    />
                                </div>
                            </div>

                        </div>

                        <div className="mt-6">
                            <h5 className="mb-4 text-lg font-medium text-gray-800 dark:text-white/90">Permissions</h5>
                            <div className="grid grid-cols-1 gap-4">
                                {Object.keys(PERMISSIONS).map((section) => (
                                    <div key={section} className="p-3 border rounded">
                                        <div className="flex items-center justify-between">
                                            <div className="font-medium dark:text-gray-400">{section.charAt(0).toUpperCase() + section.slice(1)}</div>
                                            <button type="button" onClick={() => toggleSection(section as any)} className="text-sm text-blue-600">Select All</button>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {(PERMISSIONS as any)[section].length === 0 && <div className="text-sm text-gray-500">No permissions for this section</div>}
                                            {(PERMISSIONS as any)[section].map((perm: string) => (
                                                <label key={perm} className="flex items-center gap-2">
                                                    <input type="checkbox" checked={permissions.includes(perm)} onChange={() => togglePermission(perm)} />
                                                    <span className="text-sm dark:text-gray-400">{perm}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                        <Button size="sm" variant="outline" onClick={onClose} disabled={loading}>Close</Button>
                        <Button size="sm" onClick={handleSave} disabled={loading}>{isEditMode ? "Update" : "Add"} Manager</Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default ManagerCreateModal;
