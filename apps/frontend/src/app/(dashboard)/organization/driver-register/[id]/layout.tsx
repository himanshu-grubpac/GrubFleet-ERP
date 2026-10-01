import type { ReactNode } from "react";

/** Static export (S3): one shell per dynamic segment; runtime ids via client nav + CloudFront fallback. */
export async function generateStaticParams() {
  return [{ id: "_" }];
}

export default function DriverRegisterIdLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
