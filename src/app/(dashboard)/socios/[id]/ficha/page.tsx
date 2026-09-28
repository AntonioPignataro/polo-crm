import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getMemberEditData } from "@/modules/members/queries/get-member-edit-data";
import { MemberEditForm } from "@/modules/members/components/member-edit-form";
import { Skeleton } from "@/components/ui/skeleton";

interface FichaPageProps {
  params: Promise<{ id: string }>;
}

export default function FichaPage({ params }: FichaPageProps) {
  return (
    <Suspense fallback={<FichaSkeleton />}>
      <FichaContent params={params} />
    </Suspense>
  );
}

async function FichaContent({ params }: FichaPageProps) {
  const { id } = await params;
  const member = await getMemberEditData(id);

  if (!member) {
    notFound();
  }

  return <MemberEditForm member={member} />;
}

function FichaSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded" />
        <div>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="mt-1 h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
