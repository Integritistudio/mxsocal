"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const permissionMap: Record<string, string[]> = {
    "dashboard:view": ["/dashboard"],
    "booking:view": ["/bookings"],
    "product:view": ["/products"],
    "coach:view": ["/dashboard/coaches", "/dashboard/coaches/:id"],
};

const matchRoute = (pathname: string, route: string) => {
    if (route.includes(":")) {
        const baseRoute = route.split("/:")[0];
        return pathname.startsWith(baseRoute);
    }
    return pathname === route;
};

export const useProtectRoute = (permissions: string[]) => {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!pathname) return;

        const hasAccess = permissions.some((permission) =>
            permissionMap[permission]?.some((route) =>
                matchRoute(pathname, route)
            )
        );

        if (!hasAccess && pathname !== "/profile") {
            router.replace("/");
        }
    }, [pathname, permissions, router]);
};
