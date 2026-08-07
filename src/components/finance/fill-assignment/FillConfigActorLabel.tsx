"use client";

import { UserName } from "@/components/common/user-name";
import { DeptName } from "@/components/common/dept-name";

interface Props {
  actorType: string;
  actorValue: string;
  className?: string;
}

/** Resolves a fill-config actor (unprefixed USER/DEPT type) to a display name. */
export function FillConfigActorLabel({ actorType, actorValue, className }: Props) {
  if (!actorValue) return <span className={className}>—</span>;
  if (actorType === "USER") return <UserName userId={actorValue} className={className} />;
  if (actorType === "DEPT") return <DeptName deptCode={actorValue} className={className} />;
  return <span className={className}>{actorValue}</span>;
}
