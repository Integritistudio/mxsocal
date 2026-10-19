"use client";
import { AddCoachProps } from "@/utils/types";

export default function CoachInfoCard({ coach }: { coach: AddCoachProps | null }) {

    const details = (coach || {}) as Record<string, unknown>;
    const skills = Array.isArray(details.skills) ? details.skills as string[] : [];
    const levels = Array.isArray(details.coachingLevels) ? details.coachingLevels as string[] : [];
    return (
        <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 w-full">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                        Personal Information
                    </h4>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                        <div>
                            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                                First Name
                            </p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {coach?.firstName}
                            </p>
                        </div>

                        <div>
                            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                                Last Name
                            </p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {coach?.lastName}
                            </p>
                        </div>

                        <div>
                            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                                Email address
                            </p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {coach?.email}
                            </p>
                        </div>

                        <div>
                            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                                Phone
                            </p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {coach?.phone || "N/A"}
                            </p>
                        </div>

                        <div>
                            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                                Bio
                            </p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {coach?.bio || "N/A"}
                            </p>
                        </div>
                    </div>
                    <h4 className="mt-8 mb-4 text-lg font-semibold dark:text-white">Public coach card</h4>
                    <dl className="grid grid-cols-1 gap-4 lg:grid-cols-2 dark:text-white/90">{[["Specialty", details.specialty], ["Experience text", details.experienceLabel], ["Hourly rate", details.hourlyRate], ["Display order", details.displayOrder], ["Coaching levels", levels.join(" ? ")]].map(([label, value]) => <div key={String(label)}><dt className="mb-2 text-xs text-gray-500">{String(label)}</dt><dd className="text-sm">{value == null || value === "" ? "Not provided" : String(value)}</dd></div>)}<div><dt className="mb-2 text-xs text-gray-500">Skills</dt><dd><ul className="list-disc pl-5 text-sm">{skills.map((skill, index) => <li key={index}>{skill}</li>)}</ul>{!skills.length && "Not provided"}</dd></div></dl>
                </div>

            </div>
        </div>
    );
}
