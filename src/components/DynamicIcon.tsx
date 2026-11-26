"use client";

import React from "react";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";

interface DynamicIconProps extends LucideProps {
  name: string;
}

export function DynamicIcon({ name, className = "w-4 h-4", size = 16, ...props }: DynamicIconProps) {
  // Normalize name
  const formattedName = name
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");

  const iconsRecord = LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>;
  const IconComponent = iconsRecord[formattedName] || iconsRecord[name] || LucideIcons.Tag;

  return <IconComponent className={className} size={size} {...props} />;
}
