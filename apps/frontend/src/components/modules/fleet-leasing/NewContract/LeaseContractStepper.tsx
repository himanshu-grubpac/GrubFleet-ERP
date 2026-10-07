"use client";

import { Check } from "lucide-react";

type LeaseContractStepperProps = {
    currentStep: 1 | 2 | 3 | 4;
};

const steps = [
    {
        number: 1,
        label: "Client",
    },
    {
        number: 2,
        label: "Asset Lines",
    },
    {
        number: 3,
        label: "Terms",
    },
    {
        number: 4,
        label: "Review",
    },
] as const;

export default function LeaseContractStepper({
    currentStep,
}: LeaseContractStepperProps) {
    return (
        <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-3.5">
            <div className="flex w-full justify-center">
                <div className="flex items-start">
                    {steps.map((step) => {
                        const isActive =
                            step.number === currentStep;

                        const isCompleted =
                            step.number < currentStep;

                        return (
                            <div
                                key={step.number}
                                className="flex items-start"
                            >
                                {/* STEP */}
                                <div className="flex min-w-[58px] flex-col items-center px-1 sm:min-w-[76px]">

                                    {/* STEP CIRCLE */}
                                    <div
                                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors sm:h-8 sm:w-8 sm:text-sm ${isCompleted
                                                ? "bg-green-600 text-white shadow-sm"
                                                : isActive
                                                    ? "bg-[#FE5720] text-white shadow-sm"
                                                    : "border border-slate-300 bg-white text-slate-400"
                                            }`}
                                    >
                                        {isCompleted ? (
                                            <Check
                                                className="h-4 w-4 text-white"
                                                strokeWidth={3}
                                            />
                                        ) : (
                                            step.number
                                        )}
                                    </div>

                                    {/* STEP LABEL */}
                                    <span
                                        className={`mt-1.5 whitespace-nowrap text-[10px] sm:text-xs ${isCompleted
                                                ? "font-semibold text-green-600"
                                                : isActive
                                                    ? "font-semibold text-[#FE5720]"
                                                    : "text-slate-400"
                                            }`}
                                    >
                                        {step.label}
                                    </span>
                                </div>

                                {/* CONNECTOR */}
                                {step.number <
                                    steps.length && (
                                        <div
                                            className={`mt-[13px] h-px w-10 sm:w-16 ${step.number <
                                                    currentStep
                                                    ? "bg-green-600"
                                                    : "bg-slate-200"
                                                }`}
                                        />
                                    )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}