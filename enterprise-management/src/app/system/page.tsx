import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SystemPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">System</h1>
      <p className="mt-4 text-gray-500">Coming soon</p>
    </div>
  );
}
