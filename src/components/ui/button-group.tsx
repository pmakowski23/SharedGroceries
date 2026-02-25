import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

export function ButtonGroup({
  className,
  orientation = "horizontal",
  ...props
}: ButtonGroupProps) {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex items-center gap-1",
        orientation === "vertical" && "flex-col",
        className,
      )}
      {...props}
    />
  );
}
