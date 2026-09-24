import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center gap-2 text-blue-800">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title = 'Nothing here yet',
  description = 'This module shell is ready for backend integration.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader className="items-center text-center">
        <Inbox className="mb-2 h-8 w-8 text-blue-400" aria-hidden />
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function ErrorState({
  title = 'Something went wrong',
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
          <AlertCircle className="h-5 w-5" aria-hidden />
          <CardTitle className="text-red-900">{title}</CardTitle>
        </div>
        {message ? <CardDescription className="text-red-700">{message}</CardDescription> : null}
      </CardHeader>
      {onRetry ? (
        <CardContent>
          <Button variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
