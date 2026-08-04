export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ImageUploader } from "@/components/admin/image-uploader";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPublicImageUrl } from "@/lib/storage";

export default async function ImagesPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const take = 24;
  const [images, total] = await Promise.all([
    prisma.imageAsset.findMany({ skip: (page - 1) * take, take, orderBy: { uploadedAt: "desc" }, include: { labelResult: true } }),
    prisma.imageAsset.count(),
  ]);
  return <main className="space-y-6 p-6"><div><h1 className="text-2xl font-semibold tracking-tight">Images</h1><p className="text-sm text-muted-foreground">Upload batches and review label status.</p></div><ImageUploader /><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{images.map((image) => { const status = !image.labelResult || image.labelResult.totalVotes === 0 ? "unlabeled" : image.labelResult.isTie ? "tie" : image.labelResult.finalClassId ? "final" : "partial"; return <Card key={image.id}><CardContent className="p-3"><div className="aspect-[4/3] overflow-hidden rounded-md bg-muted"><Image src={getPublicImageUrl(image.storagePath) ?? ""} alt={image.filename} width={400} height={300} className="h-full w-full object-cover" unoptimized /></div><div className="mt-3 space-y-1"><p className="truncate text-sm font-medium">{image.filename}</p><p className="text-xs text-muted-foreground">{image.uploadedAt.toLocaleDateString()}</p><Badge variant={status === "tie" ? "destructive" : status === "final" ? "default" : "secondary"}>{status}</Badge></div></CardContent></Card>; })}</section><p className="text-sm text-muted-foreground">Page {page} of {Math.max(1, Math.ceil(total / take))}</p></main>;
}

