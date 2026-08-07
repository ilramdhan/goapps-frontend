"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import {
  ScrollableDialogContent,
  ScrollableDialogHeader,
  ScrollableDialogBody,
  ScrollableDialogFooter,
} from "@/components/common/scrollable-dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpsertFillConfig } from "@/hooks/finance/use-fill-assignment";
import { type LevelAssignmentConfig } from "@/types/finance/fill-assignment";
import { useDepartments } from "@/hooks/iam/use-departments";
import { useUsersLookup, type UserLookupEntry } from "@/hooks/iam/use-users-lookup";

// ---------- Searchable user combobox ----------

interface UserComboboxProps {
  value: string;
  onValueChange: (id: string) => void;
  users: UserLookupEntry[];
  isLoading: boolean;
  disabled?: boolean;
}

function UserCombobox({ value, onValueChange, users, isLoading, disabled }: UserComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = users.find((u) => u.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled || isLoading}
          className="w-full justify-between font-normal text-sm h-10"
        >
          <span className="truncate">
            {isLoading
              ? "Loading…"
              : selected
                ? `${selected.username || selected.fullName}`
                : "Select user"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name or username…" />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {users.map((u) => (
                <CommandItem
                  key={u.id}
                  value={`${u.username} ${u.fullName} ${u.email}`}
                  onSelect={() => {
                    onValueChange(u.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === u.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium">{u.username}</span>
                    {u.fullName && (
                      <span className="text-xs text-muted-foreground truncate">{u.fullName}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------- Main form ----------

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: LevelAssignmentConfig;
  /** When provided, saves as a PRODUCT-tier override. */
  productSysId?: number;
  /** Lock the route level to this value (used when opening from product override rows). */
  fixedRouteLevel?: number;
  tier?: "GLOBAL" | "PRODUCT" | "REQUEST";
}

export function FillConfigForm({
  open,
  onOpenChange,
  existing,
  productSysId,
  fixedRouteLevel,
  tier = "GLOBAL",
}: Props) {
  const [routeLevel, setRouteLevel] = useState(
    existing?.routeLevel ?? fixedRouteLevel ?? 1,
  );
  const [fillerType, setFillerType] = useState(existing?.fillerType ?? "DEPT");
  const [fillerValue, setFillerValue] = useState(existing?.fillerValue ?? "");
  const [approverType, setApproverType] = useState(existing?.approverType || "NONE");
  const [approverValue, setApproverValue] = useState(existing?.approverValue ?? "");
  const [slaFillHours, setSlaFillHours] = useState(existing?.slaFillHours ?? 48);
  const [slaApproveHours, setSlaApproveHours] = useState(existing?.slaApproveHours ?? 24);

  const { items: departments, isLoading: deptsLoading } = useDepartments();
  const { items: users, isLoading: usersLoading } = useUsersLookup();

  const upsert = useUpsertFillConfig();

  function handleFillerTypeChange(value: string) {
    setFillerType(value);
    setFillerValue("");
  }

  function handleApproverTypeChange(value: string) {
    setApproverType(value);
    setApproverValue("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    upsert.mutate(
      {
        tier: productSysId ? "PRODUCT" : tier,
        routeLevel,
        fillerType,
        fillerValue,
        approverType: approverType === "NONE" ? undefined : approverType || undefined,
        approverValue: approverValue || undefined,
        slaFillHours,
        slaApproveHours,
        productSysId: productSysId ?? undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  const effectiveTier = productSysId ? "PRODUCT" : tier;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm:max-w-[560px]">
        <ScrollableDialogHeader>
          <DialogTitle>
            {existing ? "Edit" : "Add"} Level Config
            {effectiveTier !== "GLOBAL" && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({effectiveTier})
              </span>
            )}
          </DialogTitle>
        </ScrollableDialogHeader>
        <form onSubmit={handleSubmit} className="contents">
        <ScrollableDialogBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Route Level</Label>
              <Input
                type="number"
                min={1}
                value={routeLevel}
                onChange={(e) => setRouteLevel(Number(e.target.value))}
                disabled={!!existing || fixedRouteLevel !== undefined}
              />
            </div>
            <div>
              <Label>SLA Fill (hours)</Label>
              <Input
                type="number"
                min={1}
                value={slaFillHours}
                onChange={(e) => setSlaFillHours(Number(e.target.value))}
              />
            </div>

            {/* Filler Type */}
            <div>
              <Label>Filler Type</Label>
              <Select value={fillerType} onValueChange={handleFillerTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="DEPT">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filler Value */}
            <div>
              <Label>Filler Value</Label>
              {fillerType === "DEPT" ? (
                <Select value={fillerValue} onValueChange={setFillerValue}>
                  <SelectTrigger>
                    <SelectValue placeholder={deptsLoading ? "Loading…" : "Select department"} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.code}>
                        {d.code} — {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <UserCombobox
                  value={fillerValue}
                  onValueChange={setFillerValue}
                  users={users}
                  isLoading={usersLoading}
                />
              )}
            </div>

            {/* Approver Type */}
            <div>
              <Label>Approver Type (optional)</Label>
              <Select value={approverType} onValueChange={handleApproverTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="DEPT">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Approver Value */}
            <div>
              <Label>Approver Value</Label>
              {approverType === "NONE" ? (
                <Input value="" disabled placeholder="—" />
              ) : approverType === "DEPT" ? (
                <Select value={approverValue} onValueChange={setApproverValue}>
                  <SelectTrigger>
                    <SelectValue placeholder={deptsLoading ? "Loading…" : "Select department"} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.code}>
                        {d.code} — {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <UserCombobox
                  value={approverValue}
                  onValueChange={setApproverValue}
                  users={users}
                  isLoading={usersLoading}
                />
              )}
            </div>

            <div>
              <Label>SLA Approve (hours)</Label>
              <Input
                type="number"
                min={1}
                value={slaApproveHours}
                onChange={(e) => setSlaApproveHours(Number(e.target.value))}
                disabled={approverType === "NONE"}
              />
            </div>
          </div>
        </ScrollableDialogBody>
        <ScrollableDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={upsert.isPending}>
            {upsert.isPending ? "Saving..." : "Save"}
          </Button>
        </ScrollableDialogFooter>
        </form>
      </ScrollableDialogContent>
    </Dialog>
  );
}
