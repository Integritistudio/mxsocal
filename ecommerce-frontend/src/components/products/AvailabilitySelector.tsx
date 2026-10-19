"use client";
import React from "react";

type DayAvailability = { day: string; slots: Array<{ start: string; end: string }>; };

interface Props {
    value: DayAvailability[];
    onChange: (v: DayAvailability[]) => void;
    timeOptions: string[];
    dayErrors?: { [k: number]: string | null };
    daySlotErrors?: { [dayIdx: number]: { [slotIdx: number]: string } } | null;
}

export default function AvailabilitySelector({ value, onChange, timeOptions, dayErrors, daySlotErrors }: Props) {
    const [internalSlotErrors, setInternalSlotErrors] = React.useState<{ [dayIdx: number]: { [slotIdx: number]: string } } | null>(null);
    const slotErrors = daySlotErrors || internalSlotErrors;

    React.useEffect(() => {
        if (daySlotErrors) return;
        const res = validateAvailability(value);
        setInternalSlotErrors(res.slotErrors || null);
    }, [value, daySlotErrors]);
    const addDay = () => {
        onChange([...value, { day: "Monday", slots: [{ start: "09:00", end: "10:00" }] }]);
    };

    const removeDay = (idx: number) => {
        onChange(value.filter((_, i) => i !== idx));
    };

    const addSlot = (dayIdx: number) => {
        onChange(value.map((d, i) => i === dayIdx ? { ...d, slots: [...d.slots, { start: "09:00", end: "10:00" }] } : d));
    };

    const removeSlot = (dayIdx: number, slotIdx: number) => {
        onChange(value.map((d, i) => i === dayIdx ? { ...d, slots: d.slots.filter((_, s) => s !== slotIdx) } : d));
    };

    const handleAvailabilityChange = (dayIdx: number, slotIdx: number, field: "start" | "end", v: string) => {
        onChange(value.map((d, i) => {
            if (i !== dayIdx) return d;
            const slots = d.slots.map((s, si) => si === slotIdx ? { ...s, [field]: v } : s);
            return { ...d, slots };
        }));
    };

    const handleDayNameChange = (dayIdx: number, dayName: string) => {
        onChange(value.map((d, i) => i === dayIdx ? { ...d, day: dayName } : d));
    };

    return (
        <div className="col-span-2 mt-4">
            <h5 className="mb-3 text-base font-medium text-gray-800 dark:text-white/90">Availability (day-wise slots)</h5>
            <div className="space-y-3">
                {value.map((day, dayIdx) => (
                    <div key={dayIdx} className="p-3 border rounded">
                        <div className="flex items-center flex-wrap justify-between mb-2">
                            <select value={day.day} onChange={(e) => handleDayNameChange(dayIdx, e.target.value)} className="rounded-md border p-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(dn => <option key={dn} value={dn}>{dn}</option>)}
                            </select>
                            <div className="flex gap-2 md:mt-0 mt-2">
                                <button type="button" onClick={() => addSlot(dayIdx)} className="px-2 py-1 rounded bg-green-500 text-white">Add Slot</button>
                                <button type="button" onClick={() => removeDay(dayIdx)} className="px-2 py-1 rounded bg-red-500 text-white">Remove Day</button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {day.slots.map((slot, slotIdx) => {
                                const thisSlotError = slotErrors && slotErrors[dayIdx] ? slotErrors[dayIdx][slotIdx] : undefined;
                                return (
                                    <div key={slotIdx} className="flex flex-wrap items-center gap-2">
                                        <select value={slot.start} onChange={(e) => handleAvailabilityChange(dayIdx, slotIdx, 'start', e.target.value)} className={`rounded-md border dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 p-2 ${thisSlotError ? 'ring-2 ring-red-400' : ''}`}>
                                            {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <span className="text-sm dark:text-white/90">to</span>
                                        <select value={slot.end} onChange={(e) => handleAvailabilityChange(dayIdx, slotIdx, 'end', e.target.value)} className={`rounded-md border dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 p-2 ${thisSlotError ? 'ring-2 ring-red-400' : ''}`}>
                                            {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <button type="button" onClick={() => removeSlot(dayIdx, slotIdx)} className="px-2 py-1 rounded bg-red-400 text-white">Remove</button>
                                        {thisSlotError && <p className="text-sm text-red-600 ml-2">{thisSlotError}</p>}
                                    </div>
                                );
                            })}
                            {dayErrors && dayErrors[dayIdx] && (
                                <p className="text-sm text-red-600 mt-2">{dayErrors[dayIdx]}</p>
                            )}
                        </div>
                    </div>
                ))}
                <div className="flex gap-2">
                    <button type="button" onClick={addDay} className="px-3 py-2 rounded bg-blue-600 text-white">Add Day Slot</button>
                </div>
            </div>
        </div>
    );
}

export function timeToMinutes(t: string) {
    const [hh, mm] = t.split(":").map(Number);
    return hh * 60 + mm;
}

export function validateAvailability(avail: DayAvailability[]) {
    const slotErrors: { [dayIdx: number]: { [slotIdx: number]: string } } = {};
    let valid = true;
    avail.forEach((day, idx) => {
        const slots = day.slots.map((s, i) => ({ start: timeToMinutes(s.start), end: timeToMinutes(s.end), i }));

        for (let i = 0; i < slots.length; i++) {
            if (slots[i].start >= slots[i].end) {
                slotErrors[idx] = slotErrors[idx] || {};
                slotErrors[idx][slots[i].i] = `Start must be before end`;
                valid = false;
            }
        }
        const sorted = slots.slice().sort((a, b) => a.start - b.start);
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].start < sorted[i - 1].end) {
                slotErrors[idx] = slotErrors[idx] || {};
                slotErrors[idx][sorted[i - 1].i] = `Overlaps with next slot`;
                slotErrors[idx][sorted[i].i] = `Overlaps with previous slot`;
                valid = false;
            }
        }
    });
    return { valid, slotErrors };
}
