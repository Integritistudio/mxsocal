"use client";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Alert from "@/components/ui/alert/Alert";

interface AlertContextType {
    showAlert: (
        variant: "success" | "error" | "warning" | "info",
        message: string,
        title?: string,
        showLink?: boolean,
        linkText?: string,
        linkHref?: string,
        durationMs?: number
    ) => void;
}

type ActiveAlert = {
    id: string;
    variant: "success" | "error" | "warning" | "info";
    message: string;
    title?: string;
    showLink?: boolean;
    linkText?: string;
    linkHref?: string;
    durationMs: number;
};

export const AlertContext = createContext<AlertContextType>({
    showAlert: () => { },
});

export const useAlert = () => useContext(AlertContext);

export const AlertProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
    const timers = useRef<Record<string, number>>({});

    useEffect(() => {
        return () => {
            // clear all timers on unmount
            Object.values(timers.current).forEach((t) => clearTimeout(t));
        };
    }, []);

    const removeAlert = (id: string) => {
        setAlerts((s) => s.filter((a) => a.id !== id));
        const t = timers.current[id];
        if (t) {
            clearTimeout(t);
            delete timers.current[id];
        }
    };

    const showAlert: AlertContextType["showAlert"] = (
        variant,
        message,
        title,
        showLink = false,
        linkText = "Learn more",
        linkHref = "#",
        durationMs = 3000
    ) => {
        const id = Date.now().toString() + Math.random().toString(36).slice(2, 8);
        const alert: ActiveAlert = {
            id,
            variant,
            message,
            title,
            showLink,
            linkText,
            linkHref,
            durationMs,
        };

        setAlerts((s) => [...s, alert]);

        const timer = window.setTimeout(() => {
            removeAlert(id);
        }, durationMs);
        timers.current[id] = timer;
    };

    return (
        <AlertContext.Provider value={{ showAlert }}>
            {children}

            {/* Alerts container: bottom-right */}
            <div className="fixed bottom-4 right-4 z-9999 flex flex-col gap-3 items-end">
                {alerts.map((a) => (
                    <div key={a.id} className="w-full max-w-sm">
                        <Alert
                            variant={a.variant}
                            title={a.title}
                            message={a.message}
                            showLink={a.showLink}
                            linkHref={a.linkHref}
                            linkText={a.linkText}
                        />
                    </div>
                ))}
            </div>
        </AlertContext.Provider>
    );
};

export default AlertProvider;