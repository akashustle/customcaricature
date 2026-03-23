import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ContentBlock = {
  id: string;
  page: string;
  block_type: string;
  content: Record<string, any>;
  is_visible: boolean;
  sort_order: number;
  updated_at: string;
  updated_by: string | null;
};

export const useContentBlocks = (page?: string) => {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlocks = async () => {
    let q = supabase.from("content_blocks").select("*").order("sort_order");
    if (page) q = q.eq("page", page);
    const { data } = await q;
    if (data) setBlocks(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchBlocks();
    const ch = supabase
      .channel("content-blocks-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "content_blocks" }, () => fetchBlocks())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [page]);

  const getBlock = (id: string): Record<string, any> => {
    const b = blocks.find(b => b.id === id);
    return b?.content || {};
  };

  const getText = (id: string, key = "text", fallback = ""): string => {
    return getBlock(id)?.[key] || fallback;
  };

  const isVisible = (id: string): boolean => {
    const b = blocks.find(b => b.id === id);
    return b?.is_visible !== false;
  };

  const updateBlock = async (id: string, content: Record<string, any>, options?: { page?: string; block_type?: string }) => {
    const adminName = sessionStorage.getItem("admin_entered_name") || "Admin";
    await supabase.from("content_blocks").upsert({
      id,
      page: options?.page || "global",
      block_type: options?.block_type || "text",
      content,
      updated_at: new Date().toISOString(),
      updated_by: adminName,
    } as any, { onConflict: "id" });
  };

  const toggleVisibility = async (id: string, visible: boolean) => {
    await supabase.from("content_blocks").update({ is_visible: visible, updated_at: new Date().toISOString() } as any).eq("id", id);
  };

  return { blocks, loading, getBlock, getText, isVisible, updateBlock, toggleVisibility, refetch: fetchBlocks };
};
