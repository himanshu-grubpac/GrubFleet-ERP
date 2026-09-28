import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import Button from "@/components/ui/GrubpacButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PageHeaderSkeleton,
  Skeleton,
  TableListSkeleton,
} from "@/components/states/skeleton";

export type LoadingStateVariant = "spinner" | "skeleton";
export type LoadingSkeletonPreset = "block" | "table" | "page-header";

export function LoadingState({
  label = "Loading…",
  variant = "spinner",
  skeleton = "block",
}: {
  label?: string;
  variant?: LoadingStateVariant;
  skeleton?: LoadingSkeletonPreset;
}) {
  if (variant === "skeleton") {
    return (
      <div
        className="min-h-[200px]"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">{label}</span>
        {skeleton === "table" ? <TableListSkeleton /> : null}
        {skeleton === "page-header" ? <PageHeaderSkeleton /> : null}
        {skeleton === "block" ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-8 w-1/3 max-w-xs" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[200px] items-center justify-center gap-2 text-slate-700"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2
        className="h-5 w-5 animate-spin text-[#FE5720]"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  description = "This module shell is ready for backend integration.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader className="items-center text-center">
        <Inbox
          className="mb-2 h-8 w-8 text-[#FE5720]"
          aria-hidden
        />

        <CardTitle>{title}</CardTitle>

        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-red-200 bg-red-50/40">
      <CardHeader>
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle
            className="h-5 w-5"
            aria-hidden
          />

          <CardTitle className="text-red-900">
            {title}
          </CardTitle>
        </div>

        {message ? (
          <CardDescription className="text-red-700">
            {message}
          </CardDescription>
        ) : null}
      </CardHeader>

      {onRetry ? (
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
          >
            Retry
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}