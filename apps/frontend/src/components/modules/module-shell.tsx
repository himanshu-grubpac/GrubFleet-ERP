import { EmptyState } from '@/components/states/async-states';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ModuleShell({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-blue-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Module shell</CardTitle>
          <CardDescription>
            UI route and layout are in place. Business APIs and tables will connect here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState />
        </CardContent>
      </Card>
    </div>
  );
}
