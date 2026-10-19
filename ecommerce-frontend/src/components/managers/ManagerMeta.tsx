"use client";
import Image from "next/image";
import { CiUser } from "react-icons/ci";
import { UserData } from "@/utils/types";


export default function ManagerMetaCard({ manager }: { manager: UserData | null }) {
    return (
        <>
            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 w-full">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
                        <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
                            {manager?.profileImage ? (
                                <Image
                                    width={80}
                                    height={80}
                                    src={manager?.profileImage}
                                    alt="user"
                                    className="w-full h-full bg-contain"
                                />
                            ) : (
                                <div className="flex justify-center items-center h-full w-full bg-gray-100 dark:bg-gray-800">
                                    <CiUser className="text-gray-500 text-6xl font-bold dark:text-gray-400" />
                                </div>
                            )}
                        </div>
                        <div className="order-3 xl:order-2">
                            <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                                {manager?.name}
                            </h4>
                            <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                    {manager?.role}
                                </p>
                                <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                                {manager?.country && <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {manager?.country}
                                </p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
