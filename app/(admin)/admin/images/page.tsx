export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ImageUploader } from "@/components/admin/image-uploader";
import Image from "next/image";
import Link from "next/link";
import { Filter, Search } from "lucide-react";
import { Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicImageUrl } from "@/lib/storage";

type Status = "all" | "unlabeled" | "partial" | "final" | "tie";
type Sort = "latest" | "oldest" | "filename";

function imageStatus(image: { labelResult: { totalVotes: number; isTie: boolean; finalClassId: string | null } | null }) {
  if (!image.labelResult || image.labelResult.totalVotes === 0) return "unlabeled";
  if (image.labelResult.isTie) return "tie";
  if (image.labelResult.finalClassId) return "final";
  return "partial";
}

export default async function ImagesPage({ searchParams }: { searchParams: { page?: string; q?: string; status?: Status; batch?: string; sort?: Sort } }) {
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const q = String(searchParams.q ?? "").trim();
  const status = (searchParams.status ?? "all") as Status;
  const batch = String(searchParams.batch ?? "all");
  const sort = (searchParams.sort ?? "latest") as Sort;
  const take = 24;

  const where: Prisma.ImageAssetWhereInput = {
    ...(q ? { filename: { contains: q, mode: "insensitive" } } : {}),
    ...(batch !== "all" ? { datasetBatch: batch } : {}),
    ...(status === "unlabeled" ? { OR: [{ labelResult: { is: null } }, { labelResult: { is: { totalVotes: 0 } } }] } : {}),
    ...(status === "partial" ? { labelResult: { is: { totalVotes: { gt: 0 }, finalClassId: null, isTie: false } } } : {}),
    ...(status === "final" ? { labelResult: { is: { finalClassId: { not: null }, isTie: false } } } : {}),
    ...(status === "tie" ? { labelResult: { is: { isTie: true } } } : {}),
  };
  const orderBy: Prisma.ImageAssetOrderByWithRelationInput = sort === "oldest" ? { uploadedAt: "asc" } : sort === "filename" ? { filename: "asc" } : { uploadedAt: "desc" };

  const [images, total, batches] = await Promise.all([
    prisma.imageAsset.findMany({ where, skip: (page - 1) * take, take, orderBy, include: { labelResult: true } }),
    prisma.imageAsset.count({ where }),
    prisma.imageAsset.findMany({ select: { datasetBatch: true }, distinct: ["datasetBatch"], orderBy: { uploadedAt: "desc" } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / take));
  const pageHref = (nextPage: number) => `/admin/images?${new URLSearchParams({ ...(q ? { q } : {}), status, batch, sort, page: String(nextPage) }).toString()}`;

  return (
    <main className="pos-page space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1>Images</h1>
          <p className="text-sm text-[#646B72]">Upload batches and review label status.</p>
        </div>
        <span className="pos-badge bg-[#0DCAF0] text-[#092C4C]">{total} matching images</span>
      </div>
      <ImageUploader />

      <form className="pos-card grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]" action="/admin/images">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#646B72]" />
          <input className="pos-input w-full pl-9" name="q" defaultValue={q} placeholder="Search filename" />
        </label>
        <select className="pos-input w-full" name="status" defaultValue={status}>
          <option value="all">All statuses</option>
          <option value="unlabeled">Unlabeled</option>
          <option value="partial">Partial</option>
          <option value="final">Final</option>
          <option value="tie">Tie</option>
        </select>
        <select className="pos-input w-full" name="batch" defaultValue={batch}>
          <option value="all">All batches</option>
          {batches.filter((item) => item.datasetBatch).map((item) => <option key={item.datasetBatch ?? ""} value={item.datasetBatch ?? ""}>{item.datasetBatch}</option>)}
        </select>
        <select className="pos-input w-full" name="sort" defaultValue={sort}>
          <option value="latest">Latest first</option>
          <option value="oldest">Oldest first</option>
          <option value="filename">Filename A-Z</option>
        </select>
        <Button className="pos-button-primary" type="submit"><Filter className="size-4" />Apply</Button>
      </form>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((image) => {
          const statusName = imageStatus(image);
          const badgeClass = statusName === "tie" ? "bg-[#DC3545] text-white" : statusName === "final" ? "bg-[#198754] text-white" : statusName === "partial" ? "bg-[#0DCAF0] text-[#092C4C]" : "bg-[#FE9F43] text-white";
          return (
            <article className="pos-card p-3" key={image.id}>
              <div className="aspect-[4/3] overflow-hidden rounded-[8px] bg-[#F8F9FA]">
                <Image src={getPublicImageUrl(image.storagePath) ?? ""} alt={image.filename} width={400} height={300} className="h-full w-full object-cover" unoptimized />
              </div>
              <div className="mt-3 space-y-2">
                <p className="truncate text-sm font-bold text-[#212B36]">{image.filename}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[#646B72]">{image.uploadedAt.toLocaleDateString()}</p>
                  <Badge className={`pos-badge border-0 ${badgeClass}`}>{statusName}</Badge>
                </div>
                {image.datasetBatch && <p className="truncate text-xs text-[#7A8086]">Batch: {image.datasetBatch}</p>}
              </div>
            </article>
          );
        })}
      </section>

      {images.length === 0 && <div className="pos-card text-sm text-[#646B72]">No images match these filters.</div>}

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#646B72]">Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <Button asChild className="pos-button-secondary" aria-disabled={page <= 1}><Link href={pageHref(Math.max(1, page - 1))}>Previous</Link></Button>
          <Button asChild className="pos-button-primary" aria-disabled={page >= totalPages}><Link href={pageHref(Math.min(totalPages, page + 1))}>Next</Link></Button>
        </div>
      </div>
    </main>
  );
}

