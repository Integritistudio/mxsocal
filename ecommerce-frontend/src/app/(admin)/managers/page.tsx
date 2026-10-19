"use client";

import { useState, useEffect } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import { UserData } from "@/utils/types";
import { getManagers } from "@/services/managers";
import ManagerTable from "@/components/managers/ManagerTable";
import { useUser } from "@/context/UserContext";
import { useProtectRoute } from "@/hooks/usePermission";

const metadata: Metadata = {
    title: "Managers | Ecommerce Admin Dashboard",
    description: "View and manage all managers",
};

export default function ManagersPage() {
    const { user } = useUser()
    if (user && user?.role === "manager") {
        useProtectRoute(user?.permissions || [])
    }
    const [managers, setManagers] = useState<UserData[]>([]);

    const loadManagers = async () => {
        try {
            const response = await getManagers();
            console.log("response", response);
            setManagers(response)
        } catch (err) {
            console.log("error", err);
        }
    }

    useEffect(() => {
        loadManagers();
    }, [])
    return (
        <div>
            <PageBreadcrumb pageTitle="Managers" buttonTitle="Add Manager" modalType={"add-manager"} loadManagers={loadManagers} />
            <div className="space-y-6">
                <ComponentCard title="Managers">
                    <ManagerTable managers={managers} loadManagers={loadManagers} />
                </ComponentCard>
            </div>
        </div>
    );
}
