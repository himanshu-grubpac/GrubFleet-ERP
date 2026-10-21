import { DashboardChrome } from '@/components/layout/dashboard-chrome';

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardChrome>{children}</DashboardChrome>;
}
