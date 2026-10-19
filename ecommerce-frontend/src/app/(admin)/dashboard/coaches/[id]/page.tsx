"use client"
import MonthlyAvailability from "@/components/products/MonthlyAvailability";
import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation';
import { AddCoachProps } from '@/utils/types'
import { fetchCoachById } from '@/services/coach';
import AddCoach from '@/components/coach/AddCoach';
import CoachMetaCard from '@/components/coach/CoachMeta';
import CoachInfoCard from '@/components/coach/CoachInfoCard';
import CoachAddressCard from '@/components/coach/CoachAddressCard';

const CoachDetailPage = () => {
    const coachIdParam = useParams().id;
    const coachId = Array.isArray(coachIdParam) ? coachIdParam[0] : coachIdParam;
    const [coach, setCoach] = useState<AddCoachProps | null>(null);
    const [editing, setEditing] = useState(false);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState(false);


    const getCoach = async () => {
        if (!coachId) return;
        setLoading(true);
        try {
            const res = await fetchCoachById(coachId);
            setCoach(res);
        } catch (err) {
            setError("Failed to fetch coach details");
            console.log("Error", err);
        } finally {
            setLoading(false);
        }
    }


    useEffect(() => {
        getCoach();
    }, [coachId])

    return (
        <div className='flex flex-col justify-start items-start w-full gap-y-5'>
            {loading ? (
                <p className='dark:text-white'>Loading Coach Information...</p>
            ) : error ? (
                <p className='dark:text-white'>Failed to load coach information</p>
            ) : (
                <>
                    <button type="button" className="rounded-lg bg-brand-500 px-5 py-3 text-white" onClick={() => setEditing(true)}>Edit Coach</button>
                    <AddCoach isOpen={editing} isEditMode coachData={coach} onClose={() => setEditing(false)} loadCoaches={getCoach} />
                    <CoachMetaCard coach={coach} />
                    <CoachInfoCard coach={coach} />
                    <CoachAddressCard coach={coach} />
                    {coachId && coach && <MonthlyAvailability type="coach" id={coachId} name={`${coach.firstName} ${coach.lastName}`} />}
                </>
            )}
        </div>
    )
}

export default CoachDetailPage