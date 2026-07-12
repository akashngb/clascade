import { TeacherPresent } from "@/components/teacher-present";

// Teacher live-control route: /present/CODE  (optionally ?renderer=/renderer/xyz/index.html)
export default async function PresentPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ renderer?: string }>;
}) {
  const { code } = await params;
  const { renderer } = await searchParams;
  return <TeacherPresent code={code} renderer={renderer} />;
}
