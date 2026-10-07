"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { SubPageBackLink } from "@/components/ui/SubPageBackLink";

export type OrganizationFormBackLink = {
    label: string;
    href?: string;
    onClick?: () => void;
};

type OrganizationFormLayoutProps = {
    title: string;
    description?: string;
    children: ReactNode;
    actions?: ReactNode;
    infoText?: string;
    backLink?: OrganizationFormBackLink;
    /** Full-width block below back link (e.g. lease wizard stepper). */
    beforeHeader?: ReactNode;
    headerAction?: ReactNode;
    /**
     * form-card — white bordered card around children (default create/edit forms).
     * plain — children only (multi-step wizards with their own sections).
     */
    contentVariant?: "form-card" | "plain";
};

export default function OrganizationFormLayout({
    title,
    description,
    children,
    actions,
    infoText,
    backLink,
    beforeHeader,
    headerAction,
    contentVariant = "form-card",
}: OrganizationFormLayoutProps) {
    const backLinkClassName = "mb-3";

    return (
        <div className="w-full">
            {backLink ? (
                <div className="px-6 pt-4">
                    {backLink.href ? (
                        <SubPageBackLink
                            href={backLink.href}
                            label={backLink.label}
                            className={backLinkClassName}
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={backLink.onClick}
                            className={`inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-[#FE5720] ${backLinkClassName}`}
                        >
                            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                            {backLink.label}
                        </button>
                    )}
                </div>
            ) : null}

            {beforeHeader}

            <div className="px-6 pt-4 pb-8">
                <DashboardHeader
                    title={title}
                    description={description}
                    action={headerAction}
                />

                <div className="mt-5 w-full">
                    {contentVariant === "form-card" ? (
                        <div className="rounded-lg border border-gray-200 bg-white p-5">
                            {children}

                            {actions ? (
                                <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
                                    {actions}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        children
                    )}

                    {infoText ? (
                        <div className="mt-4 flex gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
                            <span className="mt-0.5 shrink-0 font-semibold">
                                i
                            </span>
                            <p>{infoText}</p>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
