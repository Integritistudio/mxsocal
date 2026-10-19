"use client";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TagInput from "../TagInput";
import SPECFIELDS from "./data";

type Field = {
    label: string,
    name: string,
    placeholder?: string,
    type?: string
}


export default function SpecForm({ category, spec, onChange }: { category: string, spec: any; onChange: (specName: string, spec: any) => void }) {
    return (
        <div className="col-span-2">
            <h5 className="mb-3 text-base font-medium text-gray-800 dark:text-white/90 capitalize">{category} Specification</h5>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {(SPECFIELDS as Record<string, Field[]>)?.[category]?.map((field: Field, index: number) => (
                    <>
                        {field?.type === "tags" ? (
                            <div key={index}>
                                <Label className="mb-0">{field.label}</Label>
                                <TagInput values={spec[field.name] || []} onChange={(v) => onChange(category, { ...spec, [field.name]: v })} placeholder="Add extra and press Enter" />
                            </div>
                        ) : field?.type === "checkbox" ? (
                            <div key={index} className="flex items-center gap-2">
                                <input type="checkbox" id="visorIncluded" checked={spec[field.name]} onChange={(e) => onChange(category, { ...spec, [field.name]: e.target.checked })} />
                                <Label className="mt-1.5">{field.label}</Label>
                            </div>
                        ) : (<div key={index}>
                            <Label>{field.label}</Label>
                            <Input
                                type="text"
                                name={field.name}
                                placeholder={field.placeholder}
                                onChange={(e) => onChange("bike", { ...spec, [field.name]: e.target.value })}
                                defaultValue={spec[field.name] || ""}
                            />
                        </div>)}
                    </>
                ))}
            </div>
        </div>
    );
}
