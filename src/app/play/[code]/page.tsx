import { StudentExperience } from "@/components/student-experience";

export default async function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <StudentExperience code={code} />;
}
