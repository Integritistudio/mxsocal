"use client";
import React from "react";

interface Props {
    values: string[];
    onChange: (vals: string[]) => void;
    placeholder?: string;
}

export default function TagInput({ values, onChange, placeholder }: Props) {
    const [text, setText] = React.useState("");

    const addTag = () => {
        const v = text.trim();
        if (!v) return;
        if (values.includes(v)) {
            setText("");
            return;
        }
        onChange([...values, v]);
        setText("");
    };

    const removeTag = (idx: number) => onChange(values.filter((_, i) => i !== idx));

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addTag();
        }
        if (e.key === "Backspace" && !text && values.length) {
            // remove last
            removeTag(values.length - 1);
        }
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2">
                {values.map((v, i) => (
                    <span key={i} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-sm px-2 py-1 rounded">
                        <span>{v}</span>
                        <button type="button" onClick={() => removeTag(i)} className="text-red-500">×</button>
                    </span>
                ))}
            </div>
            <div className="mt-2 flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} className="rounded-md md:w-auto w-[70%] border p-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 flex-1" />
                <button type="button" onClick={addTag} className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700">Add</button>
            </div>
        </div>
    );
}
