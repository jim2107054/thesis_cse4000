import { supabase, supabaseAdmin } from "@/lib/supabase";

export const DATASET_BUCKET = "dataset-images";

export function getPublicImageUrl(storagePath: string) {
  if (!supabase) return null;
  const { data } = supabase.storage.from(DATASET_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function getSignedImageUrl(storagePath: string) {
  if (!supabaseAdmin) return getPublicImageUrl(storagePath);
  const { data, error } = await supabaseAdmin.storage
    .from(DATASET_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (error) return getPublicImageUrl(storagePath);
  return data.signedUrl;
}

export function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error("Supabase service role credentials are not configured.");
  }
  return supabaseAdmin;
}
