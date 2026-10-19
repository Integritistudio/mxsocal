"use client";
import React from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { addProduct } from "@/services/products";
import { useAlert } from "@/context/AlertContext";
import AvailabilitySelector, { validateAvailability } from "./AvailabilitySelector";
import TagInput from "./TagInput";
import SpecForm from "./specs/SpecForm";

type FormData = {
    name: string;
    category: string;
    brand: string;
    description: string;
    pricePerDay: string;
    pricePerWeek: string;
    pricePerHour: string;
    currency: string;
    deposit: string;
    location: string;
    available: boolean;
    status: string;
    attributes?: any;
};

const categories = ["bike", "helmet", "gloves", "suit", "accessory"];
const statuses = ["available", "maintenance", "booked", "inactive"];

export default function ProductCreateModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { showAlert } = useAlert();
    const [loading, setLoading] = React.useState(false);
    const [formData, setFormData] = React.useState<FormData>({
        name: "",
        category: "bike",
        brand: "",
        description: "",
        pricePerDay: "",
        pricePerWeek: "",
        pricePerHour: "",
        currency: "USD",
        deposit: "",
        location: "",
        available: true,
        status: "available",
        attributes: {},
    });
    const [images, setImages] = React.useState<File[]>([]);
    const [previews, setPreviews] = React.useState<string[]>([]);
    const [errors, setErrors] = React.useState<{ [k: string]: string }>({});
    const [bikeSpec, setBikeSpec] = React.useState<any>({
        model: "",
        modelYear: "",
        engineCapacity: "",
        transmission: "",
        fuelType: "",
        mileage: "",
        seatHeight: "",
        weight: "",
        colors: [] as string[],
        numberOfGears: "",
        topSpeed: "",
        fuelTankCapacity: "",
        registrationNumber: "",
        extras: [] as string[],
    });
    const [helmetSpec, setHelmetSpec] = React.useState<any>({
        sizes: [] as string[],
        material: "",
        safetyStandards: [] as string[],
        weightGrams: "",
        visorIncluded: false,
        ventilation: false,
        colors: [] as string[],
        extras: [] as string[],
    });
    const [gloveSpec, setGloveSpec] = React.useState<any>({
        sizes: [] as string[],
        material: "",
        palmProtection: false,
        waterproof: false,
        touchscreenCompatible: false,
        reinforcedKnuckles: false,
        colors: [] as string[],
        extras: [] as string[],
    });
    const [suitSpec, setSuitSpec] = React.useState<any>({
        sizes: [] as string[],
        material: "",
        waterproof: false,
        thermalInsulation: false,
        armorIncluded: false,
        season: "",
        colors: [] as string[],
        extras: [] as string[],
    });

    const timeOptions = React.useMemo(() => {
        const times: string[] = [];
        // from 09:00 to 23:00
        for (let h = 9; h <= 23; h++) {
            times.push((h < 10 ? "0" + h : h) + ":00");
            times.push((h < 10 ? "0" + h : h) + ":30");
        }
        // 00:00 to 02:00
        for (let h = 0; h <= 2; h++) {
            times.push((h < 10 ? "0" + h : h) + ":00");
            times.push((h < 10 ? "0" + h : h) + ":30");
        }
        return times;
    }, []);

    type DayAvailability = { day: string; slots: Array<{ start: string; end: string }>; };
    const [availability, setAvailability] = React.useState<DayAvailability[]>([]);
    const [availabilityErrors, setAvailabilityErrors] = React.useState<{ [dayIdx: number]: { [slotIdx: number]: string } } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type, checked } = e.target as any;
        if (type === "checkbox") {
            setFormData((p) => ({ ...p, [name]: checked }));
        } else {
            setFormData((p) => ({ ...p, [name]: value }));
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const fileArray = Array.from(files);
        setImages((prev) => [...prev, ...fileArray]);
        const newPreviews = fileArray.map((f) => URL.createObjectURL(f));
        setPreviews((p) => [...p, ...newPreviews]);
    };

    const handleSpecChange = (specName: string, spec: any) => {
        if (specName === "bike") setBikeSpec(spec);
        if (specName === "helmet") setHelmetSpec(spec);
        if (specName === "glove") setGloveSpec(spec);
        if (specName === "suit") setSuitSpec(spec);
    };

    const removeImage = (index: number) => {
        setImages((p) => p.filter((_, i) => i !== index));
        setPreviews((p) => p.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            // client-side validation
            const newErrors: { [k: string]: string } = {};
            if (!formData.name || formData.name.trim() === "") newErrors.name = "Name is required";
            if (!formData.category) newErrors.category = "Category is required";
            const numericFields = ["pricePerDay", "pricePerWeek", "pricePerHour", "deposit"] as const;
            numericFields.forEach((f) => {
                const val = (formData as any)[f];
                if (val && isNaN(Number(val))) newErrors[f] = "Must be a number";
            });
            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                setLoading(false);
                return;
            }

            // validate availability slots
            const availValidation = validateAvailability(availability);
            if (!availValidation.valid) {
                setAvailabilityErrors(availValidation.slotErrors || {});
                setErrors((prev) => ({ ...prev, availability: "Please fix availability slots" }));
                showAlert("error", "Please fix availability slots before saving.");
                setLoading(false);
                return;
            } else {
                setAvailabilityErrors(null);
            }

            // prepare payload (use FormData if images present)
            if (images.length > 0) {
                const fd = new FormData();
                fd.append("name", formData.name);
                fd.append("category", formData.category);
                fd.append("brand", formData.brand || "");
                fd.append("description", formData.description || "");
                fd.append("pricePerDay", formData.pricePerDay || "");
                fd.append("pricePerWeek", formData.pricePerWeek || "");
                fd.append("pricePerHour", formData.pricePerHour || "");
                fd.append("currency", formData.currency || "USD");
                fd.append("deposit", formData.deposit || "");
                fd.append("location", formData.location || "");
                fd.append("available", String(formData.available));
                fd.append("status", formData.status || "available");
                fd.append("attributes", JSON.stringify(formData.attributes || {}));
                fd.append("availability", JSON.stringify(availability || []));
                // include spec according to category
                if (formData.category === "bike") fd.append("bikeSpec", JSON.stringify({
                    ...bikeSpec,
                    colors: bikeSpec.colors ? bikeSpec.colors.split(",").map((s: string) => s.trim()) : [],
                }));
                if (formData.category === "helmet") fd.append("helmetSpec", JSON.stringify({
                    ...helmetSpec,
                    sizes: helmetSpec.sizes ? helmetSpec.sizes.split(",").map((s: string) => s.trim()) : [],
                    safetyStandards: helmetSpec.safetyStandards ? helmetSpec.safetyStandards.split(",").map((s: string) => s.trim()) : [],
                    colors: helmetSpec.colors ? helmetSpec.colors.split(",").map((s: string) => s.trim()) : [],
                }));
                if (formData.category === "gloves") fd.append("gloveSpec", JSON.stringify({
                    ...gloveSpec,
                    sizes: gloveSpec.sizes ? gloveSpec.sizes.split(",").map((s: string) => s.trim()) : [],
                    colors: gloveSpec.colors ? gloveSpec.colors.split(",").map((s: string) => s.trim()) : [],
                }));
                if (formData.category === "suit") fd.append("suitSpec", JSON.stringify({
                    ...suitSpec,
                    sizes: suitSpec.sizes ? suitSpec.sizes.split(",").map((s: string) => s.trim()) : [],
                    colors: suitSpec.colors ? suitSpec.colors.split(",").map((s: string) => s.trim()) : [],
                }));
                images.forEach((f) => fd.append("images", f));

                await addProduct(fd);
            } else {
                const payload = {
                    name: formData.name,
                    category: formData.category,
                    brand: formData.brand,
                    description: formData.description,
                    pricePerDay: formData.pricePerDay || null,
                    pricePerWeek: formData.pricePerWeek || null,
                    pricePerHour: formData.pricePerHour || null,
                    currency: formData.currency,
                    deposit: formData.deposit || null,
                    location: formData.location,
                    available: formData.available,
                    status: formData.status,
                    attributes: formData.attributes || {},
                    availability: availability || [],
                    bikeSpec: formData.category === "bike" ? {
                        ...bikeSpec,
                        colors: bikeSpec.colors ? bikeSpec.colors.split(",").map((s: string) => s.trim()) : [],
                    } : undefined,
                    helmetSpec: formData.category === "helmet" ? {
                        ...helmetSpec,
                        sizes: helmetSpec.sizes ? helmetSpec.sizes.split(",").map((s: string) => s.trim()) : [],
                        safetyStandards: helmetSpec.safetyStandards ? helmetSpec.safetyStandards.split(",").map((s: string) => s.trim()) : [],
                        colors: helmetSpec.colors ? helmetSpec.colors.split(",").map((s: string) => s.trim()) : [],
                    } : undefined,
                    gloveSpec: formData.category === "gloves" ? {
                        ...gloveSpec,
                        sizes: gloveSpec.sizes ? gloveSpec.sizes.split(",").map((s: string) => s.trim()) : [],
                        colors: gloveSpec.colors ? gloveSpec.colors.split(",").map((s: string) => s.trim()) : [],
                    } : undefined,
                    suitSpec: formData.category === "suit" ? {
                        ...suitSpec,
                        sizes: suitSpec.sizes ? suitSpec.sizes.split(",").map((s: string) => s.trim()) : [],
                        colors: suitSpec.colors ? suitSpec.colors.split(",").map((s: string) => s.trim()) : [],
                    } : undefined,
                };
                await addProduct(payload);
            }
            showAlert("success", "Product created successfully");
            onClose();
        } catch (err) {
            showAlert("error", "Failed to create product. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        return () => {
            previews.forEach((p) => URL.revokeObjectURL(p));
        }
    }, [previews]);

    return (
        <Modal isOpen={isOpen} onClose={!loading ? onClose : () => { }} className="max-w-[800px] lg:m-4 md:m-2 m-1">
            <div className="no-scrollbar relative w-full max-w-[800px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                <div className="px-2 pr-14">
                    <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Create Product</h4>
                    <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Fill in product details to add a new product.</p>
                </div>

                <form className="flex flex-col">
                    <div className="custom-scrollbar lg:max-h-[calc(100vh-300px)] overflow-x-hidden max-h-[calc(100vh-250px)] overflow-y-auto px-2 pb-3">
                        <div className="mt-0">
                            <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">Product Information</h5>

                            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                                <div className="lg:col-span-1 col-span-2">
                                    <Label>Name</Label>
                                    <Input name="name" placeholder="Product name" defaultValue={formData.name} onChange={handleChange} />
                                    {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                                </div>

                                <div className="lg:col-span-1 col-span-2">
                                    <Label>Category</Label>
                                    <select name="category" value={formData.category} onChange={handleChange} className="w-full rounded-md border p-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                                        {categories.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category}</p>}
                                </div>

                                <div className="lg:col-span-1 col-span-2">
                                    <Label>Brand</Label>
                                    <Input name="brand" placeholder="Brand" defaultValue={formData.brand} onChange={handleChange} />
                                </div>

                                <div className="lg:col-span-1 col-span-2">
                                    <Label>Location</Label>
                                    <Input name="location" placeholder="Location" defaultValue={formData.location} onChange={handleChange} />
                                </div>

                                <div className="lg:col-span-1 col-span-2">
                                    <Label>Price Per Day</Label>
                                    <Input name="pricePerDay" placeholder="0.00" defaultValue={formData.pricePerDay} onChange={handleChange} />
                                    {errors.pricePerDay && <p className="text-sm text-red-600 mt-1">{errors.pricePerDay}</p>}
                                </div>

                                <div className="lg:col-span-1 col-span-2">
                                    <Label>Price Per Hour</Label>
                                    <Input name="pricePerHour" placeholder="0.00" defaultValue={formData.pricePerHour} onChange={handleChange} />
                                    {errors.pricePerHour && <p className="text-sm text-red-600 mt-1">{errors.pricePerHour}</p>}
                                </div>

                                <div className="lg:col-span-1 col-span-2">
                                    <Label>Deposit</Label>
                                    <Input name="deposit" placeholder="0.00" defaultValue={formData.deposit} onChange={handleChange} />
                                    {errors.deposit && <p className="text-sm text-red-600 mt-1">{errors.deposit}</p>}
                                </div>

                                <div className="lg:col-span-1 col-span-2">
                                    <Label>Currency</Label>
                                    <Input name="currency" placeholder="USD" defaultValue={formData.currency} onChange={handleChange} />
                                </div>

                                <div className="col-span-2">
                                    <Label>Description</Label>
                                    <textarea name="description" value={formData.description} onChange={handleChange} className="w-full rounded-md border p-2" rows={4} />
                                </div>

                                <SpecForm category={formData.category} spec={bikeSpec} onChange={handleSpecChange} />

                                <div className="col-span-2">
                                    <Label>Images</Label>
                                    <input type="file" accept="image/*" className="border rounded-lg p-2 max-w-full dark:border-gray-700 dark:bg-gray-900 dark:text-white/90" multiple onChange={handleImageChange} />
                                    <div className="mt-2 flex gap-2 overflow-x-auto">
                                        {previews.map((src, i) => (
                                            <div key={i} className="relative w-24 h-24 rounded overflow-hidden border">
                                                <img src={src} alt={`preview-${i}`} className="object-cover w-full h-full" />
                                                <button type="button" onClick={() => removeImage(i)} className="absolute top-0 right-0 bg-white/80 text-red-600 p-1">×</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <AvailabilitySelector value={availability} onChange={setAvailability} timeOptions={timeOptions} dayErrors={undefined} daySlotErrors={availabilityErrors || undefined} />

                                <div className="lg:col-span-1 col-span-2">
                                    <Label>Status</Label>
                                    <select name="status" value={formData.status} onChange={handleChange} className="dark:text-white/90 w-full rounded-md border p-2">
                                        {statuses.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-3 md:mt-7 lg:col-span-1 col-span-2">
                                    <input type="checkbox" id="available" name="available" checked={formData.available} onChange={handleChange} />
                                    <Label className="mt-1.5">Available</Label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                        <Button size="sm" variant="outline" onClick={onClose} disabled={loading}>
                            Close
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={loading}>
                            Create Product
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
