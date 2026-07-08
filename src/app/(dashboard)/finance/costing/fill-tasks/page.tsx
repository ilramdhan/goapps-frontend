"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useFillTasks,
  useClaimFillTask,
  useRejectFillTask,
} from "@/hooks/finance/use-fill-assignment";
import { useCostProductRequests } from "@/hooks/finance/use-cost-product-request";
import { useUser } from "@/providers/auth-provider";
import { FillTrackingTable } from "@/components/finance/fill-assignment/FillTrackingTable";
import { FillBlockerAlert } from "@/components/finance/fill-assignment/FillBlockerAlert";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ClipboardList, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Request picker ----------

interface RequestPickerProps {
  selectedId: number;
  onSelect: (id: number, no: string) => void;
}

function RequestPicker({ selectedId, onSelect }: RequestPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useCostProductRequests({
    search: search || undefined,
    page: 1,
    pageSize: 30,
  });

  const items = data?.items ?? [];

  const selectedItem = items.find((r) => r.requestId === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full max-w-md justify-between"
        >
          {selectedItem
            ? `${selectedItem.requestNo} — ${selectedItem.title}`
            : "Select request…"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by request no or title…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && (
              <CommandEmpty>Loading…</CommandEmpty>
            )}
            {!isLoading && items.length === 0 && (
              <CommandEmpty>No requests found.</CommandEmpty>
            )}
            <CommandGroup>
              {items.map((r) => (
                <CommandItem
                  key={r.requestId}
                  value={String(r.requestId)}
                  onSelect={() => {
                    onSelect(r.requestId, r.requestNo);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedId === r.requestId ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="font-mono text-xs mr-2">{r.requestNo}</span>
                  <span className="truncate text-sm">{r.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------- Main task list ----------

interface FillTasksContentProps {
  requestId: number;
  onRequestSelect: (id: number, no: string) => void;
}

function FillTasksContent({ requestId, onRequestSelect }: FillTasksContentProps) {
  const router = useRouter();
  const user = useUser();
  const currentUserId = user?.userId ?? "";
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;

  // Use departmentCode and sectionCode from AuthUser (populated server-side via company mapping).
  const currentUserDepts: string[] = [
    user?.departmentCode,
    user?.sectionCode,
  ].filter((c): c is string => Boolean(c));

  const { data: tasks = [], isLoading } = useFillTasks(requestId);
  const claim = useClaimFillTask(requestId);
  const reject = useRejectFillTask(requestId);

  const myBlockerTask = tasks.find(
    (t) =>
      (t.status === "FILL_TASK_STATUS_ACTIVE" ||
        t.status === "FILL_TASK_STATUS_FILLING") &&
      ((t.fillerType === "FILL_ACTOR_TYPE_USER" &&
        t.fillerValue === currentUserId) ||
        (t.fillerType === "FILL_ACTOR_TYPE_DEPT" &&
          currentUserDepts.includes(t.fillerValue))),
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Select Request
        </label>
        <RequestPicker selectedId={requestId} onSelect={onRequestSelect} />
      </div>

      {!requestId ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <ClipboardList className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="text-base font-medium text-muted-foreground">
              No request selected
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Search for a product request above to view its fill tasks.
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading fill tasks…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No fill tasks found for this request.
        </p>
      ) : (
        <>
          {myBlockerTask && <FillBlockerAlert task={myBlockerTask} />}
          <FillTrackingTable
            tasks={tasks}
            currentUserId={currentUserId}
            isSuperAdmin={isSuperAdmin}
            currentUserDepts={currentUserDepts}
            onClaim={(taskId) => {
              claim.mutate(taskId, {
                onSuccess: () => {
                  if (requestId) {
                    router.push(`/finance/product-requests/${requestId}?tab=fill-tracking`);
                  }
                },
              });
            }}
            onReject={(taskId) =>
              reject.mutate({ taskId, reason: "Rejected" })
            }
          />
        </>
      )}
    </div>
  );
}

// ---------- Page wrapper ----------

function FillTasksPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [requestId, setRequestId] = useState(
    Number(searchParams.get("request_id") || 0),
  );
  const [, setRequestNo] = useState(
    searchParams.get("request_no") || "",
  );

  function handleRequestSelect(id: number, no: string) {
    setRequestId(id);
    setRequestNo(no);
    // Sync to URL so the link remains shareable
    const params = new URLSearchParams(searchParams.toString());
    params.set("request_id", String(id));
    params.set("request_no", no);
    router.replace(`?${params.toString()}`);
  }

  return (
    <FillTasksContent
      requestId={requestId}
      onRequestSelect={handleRequestSelect}
    />
  );
}

export default function FillTasksPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Fill Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Parameter fill tasks and approvals for costing requests.
        </p>
      </div>
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading…</p>
        }
      >
        <FillTasksPageContent />
      </Suspense>
    </div>
  );
}
