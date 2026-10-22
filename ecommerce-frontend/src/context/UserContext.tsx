"use client";
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getProfile } from "@/services/auth";

const publicRoutes = new Set(["/", "/contact-us", "/contact", "/about-us", "/coaches", "/coach", "/bikes", "/bike", "/stories", "/blogs", "/blog", "/news", "/error-404", "/sign-in", "/sign-up", "/signin", "/login", "/signup", "/forgot-password", "/reset-password", "/admin/login"]);
const isPublicRoute = (path: string) => publicRoutes.has(path) || path === "/tracks" || path === "/privacy-policy" || path === "/booking" || path === "/booking/success" || path === "/booking/checkout" || /^\/(?:products|bikes|stories|tracks)\/[^/]+$/.test(path);
const normalizePath = (path: string) => path.replace(/\/+$/, "") || "/";

type UserData = {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    genderDescription?: string;
    address?: string;
    emailVerifiedAt?: string;
    bio?: string;
    role: string;
    needsCoach?: boolean;
    email: string;
    profileImage: string;
    phone?: string;
    country?: string;
    state?: string;
    city?: string;
    zipCode?: string;
    createdAt?: string;
    updatedAt?: string;
    permissions?: string[]
};

type UserContextType = {
    user: UserData | null;
    isAuthenticated: boolean;
    login: (user: UserData) => void;
    logout: () => void;
    getUser: () => Promise<void>;
    loadingAuth?: boolean;
    hasPermission: (key: string) => boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
};
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const router = useRouter();
    const pathname = usePathname();
    const authRequest = useRef(0);
    const [user, setUser] = useState<UserData | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    const login = (user: UserData) => {
        authRequest.current++;
        setUser(user);
        setIsAuthenticated(true);
        setLoadingAuth(false);
    }
    const logout = () => {
        authRequest.current++;
        router.replace(user?.role === "user" ? "/sign-in" : "/admin/login");
        setUser(null);
        setIsAuthenticated(false);
    }

    const getUser = useCallback(async () => {
        const requestId = ++authRequest.current;
        try {
            const userData = await getProfile();
            if (requestId !== authRequest.current) return;
            setUser(userData);
            setIsAuthenticated(true);
            if (normalizePath(window.location.pathname) === "/admin/login" && ["admin", "manager"].includes(userData.role)) {
                router.push(userData.role === 'user' ? '/account' : '/dashboard');
            } else if (userData.role === "user" && !isPublicRoute(normalizePath(window.location.pathname)) && !window.location.pathname.startsWith("/account")) { router.replace("/account"); }
        } catch {
            if (requestId !== authRequest.current) return;
            setUser(null);
            setIsAuthenticated(false);
            if (!isPublicRoute(normalizePath(window.location.pathname)) && !document.querySelector("[data-public-not-found]")) {
                router.push(window.location.pathname.startsWith("/account") ? "/sign-in?next=/account" : "/admin/login");
            }
        } finally { if (requestId === authRequest.current) setLoadingAuth(false); }
    }, [router]);

    const hasPermission = (key: string) => {
        if (!user) return false;
        if (user?.role === "admin") return true
        if (user.role === "user") return false;
        return user.permissions?.includes(key) ?? false
    }

    useEffect(() => {
        let cancelled = false;
        void Promise.resolve().then(() => {
            if (!cancelled) return getUser();
        });
        return () => { cancelled = true; };
    }, [getUser]);

    useEffect(() => {
        if (loadingAuth) return;
        const path = normalizePath(pathname);
        if (!user && !isPublicRoute(path) && !document.querySelector("[data-public-not-found]")) {
            router.replace(path.startsWith("/account") ? "/sign-in?next=/account" : "/admin/login");
        } else if (user?.role === "user" && !isPublicRoute(path) && !path.startsWith("/account")) {
            router.replace("/account");
        } else if (user && ["admin", "manager"].includes(user.role) && path === "/admin/login") {
            router.replace("/dashboard");
        }
    }, [pathname, loadingAuth, user, router]);




    return (
        <UserContext.Provider value={{ user, isAuthenticated, login, logout, getUser, hasPermission, loadingAuth }}>
            {children}
        </UserContext.Provider>
    );
}
