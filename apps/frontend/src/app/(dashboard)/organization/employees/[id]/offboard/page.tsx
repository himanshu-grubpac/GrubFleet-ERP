import { redirect } from "next/navigation";

type OffboardRedirectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OffboardEmployeePage({
  params,
}: OffboardRedirectPageProps) {
  const { id } = await params;
  redirect(`/organization/employees/${id}`);
}
