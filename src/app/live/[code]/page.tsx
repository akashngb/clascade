import { StudentLive } from "@/components/student-live";

// Student live route: /live/CODE — mirrors the teacher's phase in real time.
export default async function LivePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <StudentLive code={code} />;
}
