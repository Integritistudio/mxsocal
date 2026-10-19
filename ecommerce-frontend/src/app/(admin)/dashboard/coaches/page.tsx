"use client";
import { useState, useEffect } from "react";
import { Metadata } from "next";
import { AddCoachProps } from "@/utils/types";
import { fetchCoaches } from "@/services/coach";
import { useUser } from "@/context/UserContext";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CoachTable from "@/components/coach/CoachTable";

const metadata: Metadata = {
    title: "Coaches | Ecommerce Admin Dashboard",
    description:
        "View and manage all coaches",
};

export default function CoachesPage() {
    const { hasPermission } = useUser();
    const [coaches, setCoaches] = useState<AddCoachProps[]>([]);

    const loadCoaches = async () => {
        try {
            const response = await fetchCoaches();
            console.log("response", response);
            setCoaches(response)
        } catch (err) {
            console.log("error", err);
        }
    }

    useEffect(() => {
        loadCoaches();
    }, [])

    return (
        <div>
            <PageBreadcrumb pageTitle="Coaches" buttonTitle={hasPermission("coach:create") ? "Add Coach" : ""} modalType={"add-coach"} loadCoaches={loadCoaches} />
            <div className="space-y-6">
                <ComponentCard title="Coaches">
                    <CoachTable coaches={coaches} loadCoaches={loadCoaches} />
                </ComponentCard>
            </div>
        </div>
    );
}
