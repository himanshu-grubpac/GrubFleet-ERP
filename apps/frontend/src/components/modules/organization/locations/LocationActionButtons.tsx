"use client";

import Button from "@/components/ui/GrubpacButton";

type LocationActionButtonsProps = {
    onView?: () => void;
    onEdit: () => void;
    onDeactivate: () => void;
    isDeactivating?: boolean;
};

export default function LocationActionButtons({
    onView,
    onEdit,
    onDeactivate,
    isDeactivating = false,
}: LocationActionButtonsProps) {
    return (
        <div className="flex items-center gap-2">
            {/* View */}
            {onView && (
                <Button
                    type="button"
                    onClick={onView}
                    className="h-10 min-w-[90px] px-5"
                >
                    View
                </Button>
            )}

            {/* Edit */}
            <Button
                type="button"
                onClick={onEdit}
                className="h-10 min-w-[90px] px-5"
            >
                Edit
            </Button>

            {/* Deactivate */}
            <Button
                type="button"
                onClick={onDeactivate}
                disabled={isDeactivating}
                className="
                    h-10
                    min-w-[105px]
                    border
                    border-[#FE5720]
                    bg-white
                    px-5
                    text-[#FE5720]
                    hover:bg-[#FE5720]/5
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                "
            >
                {isDeactivating ? "Deactivating..." : "Deactivate"}
            </Button>
        </div>
    );
}