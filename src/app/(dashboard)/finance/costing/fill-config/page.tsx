"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Trash2, ChevronsUpDown, Check, Loader2, ListChecks } from "lucide-react";
import {
  useGlobalFillConfigs,
  useDeleteGlobalFillConfig,
  useProductFillConfigs,
} from "@/hooks/finance/use-fill-assignment";
import { useRouteByProduct, useRouteGraph } from "@/hooks/finance/use-cost-route";
import { useCostProductMasters } from "@/hooks/finance/use-cost-product-master";
import { FillConfigForm } from "@/components/finance/fill-assignment/FillConfigForm";
import { FillConfigActorLabel } from "@/components/finance/fill-assignment/FillConfigActorLabel";
import { type LevelAssignmentConfig } from "@/types/finance/fill-assignment";
import { type CostProductMaster } from "@/types/finance/cost-product-master";
import { cn } from "@/lib/utils";

// ---------- Product picker ----------

interface ProductPickerProps {
  selected: CostProductMaster | null;
  onSelect: (product: CostProductMaster) => void;
}

function ProductPicker({ selected, onSelect }: ProductPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useCostProductMasters({
    search: search || undefined,
    page: 1,
    pageSize: 30,
    activeFilter: "active",
  });

  const items = data?.items ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selected
              ? `${selected.productCode} — ${selected.productName}`
              : "Search product by code or name…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search product by code or name…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && <CommandEmpty>Loading…</CommandEmpty>}
            {!isLoading && items.length === 0 && (
              <CommandEmpty>No products found.</CommandEmpty>
            )}
            <CommandGroup>
              {items.map((p) => (
                <CommandItem
                  key={p.productSysId}
                  value={String(p.productSysId)}
                  onSelect={() => {
                    onSelect(p);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected?.productSysId === p.productSysId
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span className="font-mono text-xs mr-2">{p.productCode}</span>
                  <span className="truncate text-sm">{p.productName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------- Product overrides tab ----------

interface ProductOverridesTabProps {
  onEditOverride: (
    config: LevelAssignmentConfig | undefined,
    productSysId: number,
    routeLevel: number,
  ) => void;
}

function ProductOverridesTab({ onEditOverride }: ProductOverridesTabProps) {
  const [selectedProduct, setSelectedProduct] = useState<CostProductMaster | null>(null);

  const { data: routeHead, isLoading: routeLoading } = useRouteByProduct(
    selectedProduct?.productSysId,
  );
  const { data: graph, isLoading: graphLoading } = useRouteGraph(
    routeHead?.headId ?? undefined,
  );

  // Unique sorted route levels from the product's routing graph
  const routeLevels = useMemo(() => {
    if (!graph) return [];
    const levels = [...new Set(graph.seqs.map((s) => s.routeLevel))];
    return levels.sort((a, b) => a - b);
  }, [graph]);

  const { data: globalConfigs = [] } = useGlobalFillConfigs();
  const { data: productOverrides = [] } = useProductFillConfigs(
    selectedProduct?.productSysId ?? 0,
  );

  const isLoading = routeLoading || graphLoading;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Product
        </label>
        <ProductPicker selected={selectedProduct} onSelect={setSelectedProduct} />
      </div>

      {selectedProduct && (
        <>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : routeLevels.length === 0 ? (
            <EmptyState
              title="No routing defined"
              description="Configure the route first, then come back to set fill overrides."
            />
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Level overrides for{" "}
                <span className="font-mono">{selectedProduct.productCode}</span>
                <span className="ml-2 text-muted-foreground font-normal">
                  ({routeLevels.length} level{routeLevels.length !== 1 ? "s" : ""} from routing)
                </span>
              </p>

              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>Filler</TableHead>
                      <TableHead>Approver</TableHead>
                      <TableHead>SLA Fill</TableHead>
                      <TableHead>SLA Approve</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routeLevels.map((level) => {
                      const override = productOverrides.find(
                        (c) => c.routeLevel === level,
                      );
                      const global = globalConfigs.find(
                        (c) => c.routeLevel === level,
                      );
                      const hasOverride = !!override;

                      return (
                        <TableRow key={level}>
                          <TableCell className="font-medium">Level {level}</TableCell>

                          <TableCell>
                            {hasOverride ? (
                              <span className="text-xs font-medium text-primary">
                                <FillConfigActorLabel
                                  actorType={override.fillerType}
                                  actorValue={override.fillerValue}
                                />
                              </span>
                            ) : global ? (
                              <span className="text-xs text-muted-foreground italic">
                                <span className="opacity-60">Global: </span>
                                <FillConfigActorLabel
                                  actorType={global.fillerType}
                                  actorValue={global.fillerValue}
                                />
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                No global default
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-xs">
                            {hasOverride ? (
                              override.approverType ? (
                                <span className="text-primary font-medium">
                                  <FillConfigActorLabel
                                    actorType={override.approverType}
                                    actorValue={override.approverValue}
                                  />
                                </span>
                              ) : "—"
                            ) : global?.approverType ? (
                              <span className="text-muted-foreground italic">
                                <span className="opacity-60">Global: </span>
                                <FillConfigActorLabel
                                  actorType={global.approverType}
                                  actorValue={global.approverValue}
                                />
                              </span>
                            ) : "—"}
                          </TableCell>

                          <TableCell className="text-xs">
                            {hasOverride
                              ? `${override.slaFillHours}h`
                              : global
                                ? <span className="text-muted-foreground italic">{global.slaFillHours}h (global)</span>
                                : "—"}
                          </TableCell>

                          <TableCell className="text-xs">
                            {hasOverride
                              ? override.approverType ? `${override.slaApproveHours}h` : "—"
                              : global?.approverType
                                ? <span className="text-muted-foreground italic">{global.slaApproveHours}h (global)</span>
                                : "—"}
                          </TableCell>

                          <TableCell>
                            <Button
                              size="sm"
                              variant={hasOverride ? "outline" : "secondary"}
                              onClick={() =>
                                onEditOverride(
                                  override,
                                  selectedProduct.productSysId,
                                  level,
                                )
                              }
                            >
                              {hasOverride ? "Edit Override" : "Set Override"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}

      {!selectedProduct && (
        <p className="text-sm text-muted-foreground">
          Select a product above to view its routing levels and configure overrides.
        </p>
      )}
    </div>
  );
}

// ---------- Page ----------

export default function FillConfigPage() {
  const { data: configs = [], isLoading } = useGlobalFillConfigs();
  const deleteConfig = useDeleteGlobalFillConfig();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LevelAssignmentConfig | undefined>();
  const [overrideProductSysId, setOverrideProductSysId] = useState<number | undefined>();
  const [overrideRouteLevel, setOverrideRouteLevel] = useState<number | undefined>();

  function handleEditGlobal(config: LevelAssignmentConfig) {
    setEditing(config);
    setOverrideProductSysId(undefined);
    setOverrideRouteLevel(undefined);
    setFormOpen(true);
  }

  function handleAddGlobal() {
    setEditing(undefined);
    setOverrideProductSysId(undefined);
    setOverrideRouteLevel(undefined);
    setFormOpen(true);
  }

  function handleEditOverride(
    config: LevelAssignmentConfig | undefined,
    productSysId: number,
    routeLevel: number,
  ) {
    setEditing(config);
    setOverrideProductSysId(productSysId);
    setOverrideRouteLevel(routeLevel);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fill Assignment Config"
        subtitle="Configure who fills and approves cost parameters per routing level."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Fill Assignment</CardTitle>
          <CardDescription>
            Global defaults apply to every product unless a product-level override is set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="global">
            <TabsList>
              <TabsTrigger value="global">Global Defaults</TabsTrigger>
              <TabsTrigger value="product">Product Overrides</TabsTrigger>
            </TabsList>

            {/* ---- Global tab ---- */}
            <TabsContent value="global" className="mt-4 space-y-4">
              <div className="flex justify-end">
                <Button onClick={handleAddGlobal}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Level
                </Button>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : configs.length === 0 ? (
                <EmptyState
                  icon={ListChecks}
                  title="No global configs yet"
                  description="Add a level configuration to get started."
                  action={
                    <Button size="sm" onClick={handleAddGlobal}>
                      <Plus className="mr-2 h-4 w-4" /> Add Level
                    </Button>
                  }
                />
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Level</TableHead>
                        <TableHead>Filler</TableHead>
                        <TableHead>Approver</TableHead>
                        <TableHead>SLA Fill</TableHead>
                        <TableHead>SLA Approve</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map((c) => (
                        <TableRow key={c.routeLevel}>
                          <TableCell className="font-medium">Level {c.routeLevel}</TableCell>
                          <TableCell>
                            <FillConfigActorLabel actorType={c.fillerType} actorValue={c.fillerValue} />
                          </TableCell>
                          <TableCell>
                            {c.approverType ? (
                              <FillConfigActorLabel actorType={c.approverType} actorValue={c.approverValue} />
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>{c.slaFillHours}h</TableCell>
                          <TableCell>
                            {c.approverType ? `${c.slaApproveHours}h` : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditGlobal(c)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteConfig.mutate(c.routeLevel)}
                                disabled={deleteConfig.isPending}
                              >
                                {deleteConfig.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* ---- Product overrides tab ---- */}
            <TabsContent value="product" className="mt-4">
              <ProductOverridesTab onEditOverride={handleEditOverride} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <FillConfigForm
        key={
          overrideProductSysId !== undefined
            ? `override-${overrideProductSysId}-${overrideRouteLevel ?? "new"}`
            : editing
              ? `edit-${editing.routeLevel}`
              : "add"
        }
        open={formOpen}
        onOpenChange={setFormOpen}
        existing={editing}
        productSysId={overrideProductSysId}
        fixedRouteLevel={overrideRouteLevel}
        tier={overrideProductSysId !== undefined ? "PRODUCT" : "GLOBAL"}
      />
    </div>
  );
}
