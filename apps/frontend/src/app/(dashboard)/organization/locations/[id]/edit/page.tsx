"use client";

import { ArrowLeft, Construction } from "lucide-react";
import { useRouter } from "next/navigation";

export default function EditPage() {
    const router = useRouter();

    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <Construction className="h-6 w-6 text-gray-500" />
                </div>

                <h1 className="text-xl font-semibold text-gray-900">
                    Edit Page Coming Soon
                </h1>

                <p className="mt-2 max-w-md text-sm text-gray-500">
                    The edit functionality for this page is currently under
                    development.
                </p>

                <button
                    type="button"
                    onClick={() => router.back()}
                    className="mt-5 flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Go Back
                </button>
            </div>
        </div>
    );
}