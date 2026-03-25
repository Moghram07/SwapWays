"use client";

import { Moon, RotateCcw, Route } from "lucide-react";
import type { TripTypeInfo } from "@/utils/tripClassifier";

const ICONS = { Moon, RotateCcw, Route };

interface TripTypeBadgeProps {
  typeInfo: TripTypeInfo;
}

export function TripTypeBadge({ typeInfo }: TripTypeBadgeProps) {
  const Icon = ICONS[typeInfo.icon as keyof typeof ICONS];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${typeInfo.bgColor} ${typeInfo.textColor}`}
    >
      {Icon != null && <Icon size={14} />}
      {typeInfo.label}
    </span>
  );
}
