"use client";
import { AddCoachProps } from "@/utils/types";

export default function CoachAddressCard({ coach }: { coach: AddCoachProps | null }) {

    return (
        <>
            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 w-full">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                            Address
                        </h4>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                            <div>
                                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                                    Country
                                </p>
                                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                    {coach?.country || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                                    State
                                </p>
                                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                    {coach?.state || "N/A"}
                                </p>
                            </div>
                            <div>
                                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                                    City
                                </p>
                                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                    {coach?.city || "N/A"}
                                </p>
                            </div>

                            <div>
                                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                                    Zip Code
                                </p>
                                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                    {coach?.zipCode || "N/A"}
                                </p>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}
