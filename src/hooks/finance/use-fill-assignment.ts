"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  normalizeFillTask,
  normalizeLevelConfig,
  type FillTask,
  type LevelAssignmentConfig,
} from "@/types/finance/fill-assignment";
import { useParameters } from "@/hooks/finance/use-parameter";
import type { Parameter } from "@/types/finance/parameter";

// Query keys
export const fillAssignmentKeys = {
  all: ["finance", "fill-assignment"] as const,
  configs: () => [...fillAssignmentKeys.all, "config"] as const,
  productConfigs: (productSysId: number) =>
    [...fillAssignmentKeys.all, "product-config", productSysId] as const,
  tasks: (requestId: number) =>
    [...fillAssignmentKeys.all, "tasks", requestId] as const,
};

// --- Config queries ---

export function useGlobalFillConfigs() {
  return useQuery({
    queryKey: fillAssignmentKeys.configs(),
    queryFn: async (): Promise<LevelAssignmentConfig[]> => {
      const res = await fetch("/api/v1/finance/fill-configs");
      if (!res.ok) throw new Error("Failed to fetch fill configs");
      const json = await res.json();
      const items = (json.data ?? []) as Record<string, unknown>[];
      return items.map(normalizeLevelConfig);
    },
    staleTime: 60_000,
  });
}

// Product-tier override cache — populated via setQueryData after each successful upsert.
// No dedicated backend endpoint; overrides are written via the global upsert and tracked
// client-side so the UI can display what was set without a page refresh.
export function useProductFillConfigs(productSysId: number) {
  return useQuery({
    queryKey: fillAssignmentKeys.productConfigs(productSysId),
    queryFn: (): LevelAssignmentConfig[] => [],
    enabled: productSysId > 0,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
  });
}

// --- Task queries ---

export function useFillTasks(requestId: number) {
  return useQuery({
    queryKey: fillAssignmentKeys.tasks(requestId),
    queryFn: async (): Promise<FillTask[]> => {
      const res = await fetch(
        `/api/v1/finance/fill-tasks?request_id=${requestId}`
      );
      if (!res.ok) throw new Error("Failed to fetch fill tasks");
      const json = await res.json();
      const items = (json.data ?? []) as Record<string, unknown>[];
      return items.map(normalizeFillTask);
    },
    enabled: requestId > 0,
    staleTime: 30_000,
  });
}

// Approval-visible parameter subset — for the FillApprovalReviewDrawer (item #4).
//
// Reuses the existing ListParameters RPC/BFF route (no dedicated backend endpoint,
// per the P4-T2 scope decision) with a large pageSize and filters/sorts client-side.
// Piggybacks on `useParameters`'s own query-key/cache, so toggling a param's
// visibility in Parameter Master (which invalidates ["finance", "parameter"]) also
// invalidates this list — no separate cache-invalidation wiring needed.
export function useApprovalVisibleParams() {
  const { data, isLoading, isError } = useParameters({ page: 1, pageSize: 100 });

  const params = useMemo(() => {
    const all: Parameter[] = data?.data ?? [];
    return all
      .filter((p) => p.isApprovalVisible)
      .sort((a, b) => a.approvalDisplayOrder - b.approvalDisplayOrder);
  }, [data]);

  return { data: params, isLoading, isError };
}

// --- Config mutations ---

export function useUpsertFillConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      routeLevel: number;
      tier: string;
      fillerType: string;
      fillerValue: string;
      approverType?: string;
      approverValue?: string;
      reapproveOnChange?: boolean;
      slaFillHours?: number;
      slaApproveHours?: number;
      productSysId?: number;
      requestId?: number;
    }) => {
      const res = await fetch("/api/v1/finance/fill-configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to upsert fill config");
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast.success("Fill config saved");
      void qc.invalidateQueries({ queryKey: fillAssignmentKeys.configs() });

      // Update the product-tier cache so the override is visible immediately.
      if (variables.tier === "PRODUCT" && (variables.productSysId ?? 0) > 0) {
        const key = fillAssignmentKeys.productConfigs(variables.productSysId!);
        const saved: LevelAssignmentConfig = {
          configId: 0,
          tier: "PRODUCT",
          routeLevel: variables.routeLevel,
          productSysId: variables.productSysId ?? 0,
          requestId: 0,
          fillerType: variables.fillerType,
          fillerValue: variables.fillerValue,
          approverType: variables.approverType ?? "",
          approverValue: variables.approverValue ?? "",
          slaFillHours: variables.slaFillHours ?? 48,
          slaApproveHours: variables.slaApproveHours ?? 24,
          reapproveOnChange: variables.reapproveOnChange ?? false,
        };
        qc.setQueryData<LevelAssignmentConfig[]>(key, (prev) => {
          const filtered = (prev ?? []).filter((c) => c.routeLevel !== saved.routeLevel);
          return [...filtered, saved].sort((a, b) => a.routeLevel - b.routeLevel);
        });
      }
    },
    onError: () => toast.error("Failed to save fill config"),
  });
}

export function useDeleteGlobalFillConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (routeLevel: number) => {
      const res = await fetch(
        `/api/v1/finance/fill-configs/global/${routeLevel}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete fill config");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Fill config deleted");
      void qc.invalidateQueries({ queryKey: fillAssignmentKeys.configs() });
    },
    onError: () => toast.error("Failed to delete fill config"),
  });
}

// --- Task mutations ---

export function useClaimFillTask(requestId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(`/api/v1/finance/fill-tasks/${taskId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to claim task");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Task claimed");
      void qc.invalidateQueries({
        queryKey: fillAssignmentKeys.tasks(requestId),
      });
    },
    onError: () => toast.error("Failed to claim task"),
  });
}

export function useSubmitFillTask(requestId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(`/api/v1/finance/fill-tasks/${taskId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      if (!res.ok) throw new Error("Failed to submit task");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Fill task submitted");
      void qc.invalidateQueries({
        queryKey: fillAssignmentKeys.tasks(requestId),
      });
    },
    onError: () => toast.error("Failed to submit fill task"),
  });
}

export function useApproveFillTask(requestId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, note }: { taskId: number; note?: string }) => {
      const res = await fetch(`/api/v1/finance/fill-tasks/${taskId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, note }),
      });
      if (!res.ok) throw new Error("Failed to approve task");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Fill task approved");
      void qc.invalidateQueries({
        queryKey: fillAssignmentKeys.tasks(requestId),
      });
    },
    onError: () => toast.error("Failed to approve task"),
  });
}

export function useRejectFillTask(requestId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      reason,
    }: {
      taskId: number;
      reason: string;
    }) => {
      const res = await fetch(`/api/v1/finance/fill-tasks/${taskId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Failed to reject task");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Fill task rejected");
      void qc.invalidateQueries({
        queryKey: fillAssignmentKeys.tasks(requestId),
      });
    },
    onError: () => toast.error("Failed to reject task"),
  });
}
