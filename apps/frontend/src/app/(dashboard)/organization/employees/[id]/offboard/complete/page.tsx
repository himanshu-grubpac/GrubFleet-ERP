import { redirect } from "next/navigation";

type OffboardCompleteRedirectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OffboardEmployeeCompletePage({
  params,
}: OffboardCompleteRedirectPageProps) {
  const { id } = await params;
  redirect(`/organization/employees/${id}`);
}
