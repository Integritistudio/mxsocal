"use client"
import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation';
import { UserData } from '@/utils/types'
import { getManagerById } from '@/services/managers';
import ManagerAddressCard from '@/components/managers/ManagerAddressCard';
import ManagerInfoCard from '@/components/managers/ManagerInfoCard';
import ManagerMetaCard from '@/components/managers/ManagerMeta';

const CoachDetailPage = () => {
    const managerIdParam = useParams().id;

    const managerId = Array.isArray(managerIdParam) ? managerIdParam[0] : managerIdParam;
    const [manager, setManager] = useState<UserData | null>(null);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState(false);


    const getManager = async () => {
        if (!managerId) return;
        setLoading(true);
        try {
            const res = await getManagerById(managerId);
            setManager(res);
        } catch (err) {
            setError("Failed to fetch manager details");
            console.log("Error", err);
        } finally {
            setLoading(false);
        }
    }


    useEffect(() => {
        getManager();
    }, [managerId])

    return (
        <div className='flex flex-col justify-start items-start w-full gap-y-5'>
            {loading ? (
                <p className='dark:text-white'>Loading Manager Information...</p>
            ) : error ? (
                <p className='dark:text-white'>Failed to load manager information</p>
            ) : (
                <>
                    <ManagerMetaCard manager={manager} />
                    <ManagerInfoCard manager={manager} />
                    <ManagerAddressCard manager={manager} />
                </>
            )}
        </div>
    )
}

export default CoachDetailPage